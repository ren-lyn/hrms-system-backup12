<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollPeriod;
use App\Models\Payroll;
use App\Models\EmployeeProfile;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PayrollPeriodController extends Controller
{
    /**
     * Display a listing of payroll periods
     */
    public function index(): JsonResponse
    {
        $periods = PayrollPeriod::with(['payrolls' => function($query) {
                $query->with(['employee:id,first_name,last_name,position']);
            }])
            ->orderBy('start_date', 'desc')
            ->get();
        
        // Add 13th month pay breakdown to each payroll
        $periodsArray = $periods->map(function ($period) {
            $periodArray = $period->toArray();
            
            // Add breakdown to each payroll
            if (isset($periodArray['payrolls']) && is_array($periodArray['payrolls'])) {
                $periodArray['payrolls'] = array_map(function ($payrollArray) use ($period) {
                    // Find the actual payroll model
                    $payroll = $period->payrolls->firstWhere('id', $payrollArray['id']);
                    if ($payroll) {
                        $breakdown = $this->calculateThirteenthMonthPayBreakdown($payroll);
                        $payrollArray['thirteenth_month_pay_breakdown'] = $breakdown;
                    }
                    return $payrollArray;
                }, $periodArray['payrolls']);
            }
            
            return $periodArray;
        });
        
        return response()->json([
            'success' => true,
            'data' => $periodsArray
        ]);
    }
    
    /**
     * Calculate 13th month pay breakdown for a payroll
     */
    private function calculateThirteenthMonthPayBreakdown($payroll): array
    {
        $breakdown = [];
        
        if ($payroll->thirteenth_month_pay > 0) {
            // Load full employee profile if not already loaded
            if (!$payroll->relationLoaded('employee') || !$payroll->employee) {
                $payroll->load('employee');
            }
            
            if ($payroll->employee) {
                $employeeProfile = EmployeeProfile::where('user_id', $payroll->employee->id)->first();
                
                if ($employeeProfile && $employeeProfile->salary > 0) {
                    try {
                        // Use PayrollController's method via reflection or create instance
                        $payrollController = new PayrollController();
                        $reflection = new \ReflectionClass($payrollController);
                        $method = $reflection->getMethod('calculateThirteenthMonthPayWithBreakdown');
                        $method->setAccessible(true);
                        
                        $breakdownData = $method->invoke(
                            $payrollController,
                            $employeeProfile,
                            $payroll->period_start,
                            $payroll->period_end
                        );
                        
                        $breakdown = $breakdownData['breakdown'] ?? [];
                    } catch (\Exception $e) {
                        \Log::error('Error calculating 13th month breakdown in PayrollPeriodController: ' . $e->getMessage());
                        $breakdown = [];
                    }
                }
            }
            
            // ALWAYS create a breakdown if we have 13th month pay, even if calculation failed
            if (empty($breakdown) || !is_array($breakdown) || count($breakdown) === 0) {
                $breakdown = [
                    [
                        'description' => 'Base 13th Month Pay',
                        'calculation' => 'Calculated based on months worked during the year',
                        'amount' => round($payroll->thirteenth_month_pay, 2)
                    ],
                    [
                        'description' => 'Total 13th Month Pay',
                        'calculation' => '',
                        'amount' => round($payroll->thirteenth_month_pay, 2),
                        'is_total' => true
                    ]
                ];
            }
        }
        
        return $breakdown;
    }

    /**
     * Store a newly created payroll period
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'description' => 'nullable|string'
        ]);

        $period = PayrollPeriod::create([
            'name' => $validated['name'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'description' => $validated['description'] ?? null,
            'status' => 'active'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payroll period created successfully',
            'data' => $period
        ], 201);
    }

    /**
     * Display the specified payroll period
     */
    public function show(PayrollPeriod $payrollPeriod): JsonResponse
    {
        $payrollPeriod->load(['payrolls' => function($query) {
            $query->with(['employee:id,first_name,last_name,position']);
        }]);
        
        // Convert to array and add breakdown
        $periodArray = $payrollPeriod->toArray();
        
        if (isset($periodArray['payrolls']) && is_array($periodArray['payrolls'])) {
            $periodArray['payrolls'] = array_map(function ($payrollArray) use ($payrollPeriod) {
                // Find the actual payroll model
                $payroll = $payrollPeriod->payrolls->firstWhere('id', $payrollArray['id']);
                if ($payroll) {
                    $breakdown = $this->calculateThirteenthMonthPayBreakdown($payroll);
                    $payrollArray['thirteenth_month_pay_breakdown'] = $breakdown;
                }
                return $payrollArray;
            }, $periodArray['payrolls']);
        }
        
        return response()->json([
            'success' => true,
            'data' => $periodArray
        ]);
    }

    /**
     * Update the specified payroll period
     */
    public function update(Request $request, PayrollPeriod $payrollPeriod): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date|after:start_date',
            'status' => 'sometimes|in:active,closed',
            'description' => 'nullable|string'
        ]);

        $payrollPeriod->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Payroll period updated successfully',
            'data' => $payrollPeriod
        ]);
    }

    /**
     * Remove the specified payroll period
     */
    public function destroy(PayrollPeriod $payrollPeriod): JsonResponse
    {
        // Check if period has payrolls
        if ($payrollPeriod->payrolls()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete payroll period with existing payrolls'
            ], 400);
        }

        $payrollPeriod->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payroll period deleted successfully'
        ]);
    }
}

