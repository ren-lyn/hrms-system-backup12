<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LeaveMonetizationRequest;
use App\Models\EmployeeProfile;
use App\Models\LeaveRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LeaveMonetizationController extends Controller
{
    /**
     * Get unused leave days available for monetization for the authenticated employee
     */
    public function getAvailableUnusedDays(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $employee = $user->employeeProfile;
            if (!$employee) {
                return response()->json(['error' => 'Employee profile not found'], 404);
            }

            $year = $request->get('year', Carbon::now()->year);

            // Calculate unused SIL days using the same logic as 13th month pay
            $unusedDays = $this->calculateUnusedLeaveDaysWithPay($employee, $year);

            // Get already requested days for this year (pending or approved)
            $requestedDays = LeaveMonetizationRequest::where('employee_id', $user->id)
                ->where('leave_year', $year)
                ->whereIn('status', ['pending', 'approved'])
                ->sum('requested_days');

            $availableDays = max(0, $unusedDays - $requestedDays);

            // Calculate daily rate
            $monthlySalary = $employee->salary ?? 0;
            $dailyRate = $monthlySalary > 0 ? $monthlySalary / 26 : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'unused_days' => round($unusedDays, 2),
                    'requested_days' => round($requestedDays, 2),
                    'available_days' => round($availableDays, 2),
                    'daily_rate' => round($dailyRate, 2),
                    'year' => $year
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching available unused leave days: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available unused leave days'
            ], 500);
        }
    }

    /**
     * Calculate unused leave days with pay for the year (same logic as PayrollController)
     */
    private function calculateUnusedLeaveDaysWithPay(EmployeeProfile $employee, int $year): float
    {
        $userId = $employee->user_id;
        
        // Calculate employee tenure
        $tenureInMonths = LeaveRequest::calculateEmployeeTenure($userId);
        
        // Only employees with 1 year or more tenure are eligible for paid leave
        if ($tenureInMonths < 12) {
            return 0.0;
        }
        
        // Get all approved SIL leaves for recalculation if needed
        $silLeaves = LeaveRequest::where('employee_id', $userId)
            ->whereIn('type', ['Sick Leave', 'Emergency Leave'])
            ->whereYear('from', $year)
            ->whereIn('status', ['approved'])
            ->get();
        
        // Calculate used days by summing with_pay_days
        $usedSILDays = 0.0;
        foreach ($silLeaves as $leave) {
            $withPayDays = (float) ($leave->with_pay_days ?? 0);
            $totalDays = (float) ($leave->total_days ?? 0);
            
            // Recalculate if needed (same logic as PayrollController)
            $needsRecalculation = false;
            if ($totalDays > 0) {
                if ($withPayDays == 0) {
                    $needsRecalculation = true;
                } elseif ($leave->terms === 'with PAY' && abs($withPayDays - $totalDays) > 0.01) {
                    $needsRecalculation = true;
                } elseif ($leave->leave_duration === 'half_day' && $totalDays < 1 && $withPayDays >= 1) {
                    $needsRecalculation = true;
                }
            }
            
            if ($needsRecalculation) {
                $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
                    $userId,
                    $leave->type,
                    $totalDays,
                    $year
                );
                $withPayDays = (float) ($paymentTerms['with_pay_days'] ?? 0);
            }
            
            $usedSILDays += $withPayDays;
        }
        
        $usedSILDays = max(0.0, $usedSILDays);
        $usedSILDays = round($usedSILDays, 2);
        
        $silEntitled = 8.0;
        $unusedSIL = $silEntitled - $usedSILDays;
        $unusedSIL = max(0.0, min($silEntitled, $unusedSIL));
        
        return round($unusedSIL, 2);
    }

    /**
     * File a new leave monetization request
     */
    public function store(Request $request)
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $employee = $user->employeeProfile;
            if (!$employee) {
                return response()->json(['error' => 'Employee profile not found'], 404);
            }

            $validated = $request->validate([
                'requested_days' => 'required|numeric|min:0.5|max:8',
                'reason' => 'nullable|string|max:500',
                'year' => 'nullable|integer|min:2020|max:2100'
            ]);

            $year = $validated['year'] ?? Carbon::now()->year;
            $requestedDays = (float) $validated['requested_days'];

            // Check available unused days
            $availableDays = $this->calculateUnusedLeaveDaysWithPay($employee, $year);
            
            // Get already requested days
            $alreadyRequested = LeaveMonetizationRequest::where('employee_id', $user->id)
                ->where('leave_year', $year)
                ->whereIn('status', ['pending', 'approved'])
                ->sum('requested_days');

            $availableDays = max(0, $availableDays - $alreadyRequested);

            if ($requestedDays > $availableDays) {
                return response()->json([
                    'success' => false,
                    'message' => "You can only request up to {$availableDays} unused leave days for monetization."
                ], 422);
            }

            // Calculate daily rate
            $monthlySalary = $employee->salary ?? 0;
            $dailyRate = $monthlySalary > 0 ? $monthlySalary / 26 : 0;
            $estimatedAmount = $requestedDays * $dailyRate;

            // Create the request
            $monetizationRequest = LeaveMonetizationRequest::create([
                'employee_id' => $user->id,
                'requested_days' => $requestedDays,
                'daily_rate' => $dailyRate,
                'estimated_amount' => $estimatedAmount,
                'reason' => $validated['reason'] ?? null,
                'status' => 'pending',
                'leave_year' => $year
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Leave monetization request submitted successfully',
                'data' => $monetizationRequest->load('employee')
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating leave monetization request: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create leave monetization request'
            ], 500);
        }
    }

    /**
     * Get monetization requests for the authenticated employee
     */
    public function myRequests()
    {
        try {
            $user = Auth::user();
            if (!$user) {
                return response()->json(['error' => 'User not authenticated'], 401);
            }

            $requests = LeaveMonetizationRequest::where('employee_id', $user->id)
                ->with(['approvedBy'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching leave monetization requests: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch leave monetization requests'
            ], 500);
        }
    }

    /**
     * Get all monetization requests (for HR)
     */
    public function index(Request $request)
    {
        try {
            $query = LeaveMonetizationRequest::with(['employee.employeeProfile', 'approvedBy'])
                ->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            // Filter by year
            if ($request->has('year')) {
                $query->where('leave_year', $request->year);
            }

            $requests = $query->get();

            return response()->json([
                'success' => true,
                'data' => $requests
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching leave monetization requests: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch leave monetization requests'
            ], 500);
        }
    }

    /**
     * Approve or reject a monetization request (for HR)
     */
    public function updateStatus(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:approved,rejected',
                'remarks' => 'nullable|string|max:500'
            ]);

            $monetizationRequest = LeaveMonetizationRequest::findOrFail($id);
            
            if ($monetizationRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This request has already been processed'
                ], 422);
            }

            $monetizationRequest->status = $validated['status'];
            $monetizationRequest->remarks = $validated['remarks'] ?? null;
            $monetizationRequest->approved_by = Auth::id();
            $monetizationRequest->approved_at = now();
            $monetizationRequest->save();

            return response()->json([
                'success' => true,
                'message' => "Leave monetization request {$validated['status']} successfully",
                'data' => $monetizationRequest->load(['employee', 'approvedBy'])
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating leave monetization request status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update request status'
            ], 500);
        }
    }
}



