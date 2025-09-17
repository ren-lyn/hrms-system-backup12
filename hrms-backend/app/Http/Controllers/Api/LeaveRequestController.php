<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class LeaveRequestController extends Controller
{
    /**
     * Get employee profile data for leave form auto-fill
     */
    public function getEmployeeProfile()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        $profile = $user->employeeProfile;
        if (!$profile) {
            return response()->json([
                'employee_name' => $user->first_name . ' ' . $user->last_name,
                'department' => 'Not Set',
                'company' => 'Cabuyao Concrete Development Corporation',
                'employee_id' => $user->id
            ]);
        }

        return response()->json([
            'employee_name' => $profile->first_name . ' ' . $profile->last_name,
            'department' => $profile->department ?? 'Not Set',
            'company' => 'Cabuyao Concrete Development Corporation',
            'employee_id' => $user->id,
            'position' => $profile->position ?? 'Not Set',
            'email' => $profile->email ?? $user->email
        ]);
    }

    /**
     * Test method to get employee profile data without authentication
     * REMOVE THIS IN PRODUCTION - FOR TESTING ONLY
     */
    public function getEmployeeProfileTest($userId = null)
    {
        // Default to user ID 1 if none provided
        $userId = $userId ?? 1;
        
        $user = User::with('employeeProfile')->find($userId);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $profile = $user->employeeProfile;
        if (!$profile) {
            return response()->json([
                'employee_name' => $user->first_name . ' ' . $user->last_name,
                'department' => 'Not Set',
                'company' => 'Cabuyao Concrete Development Corporation',
                'employee_id' => $user->id,
                'note' => 'No employee profile found'
            ]);
        }

        return response()->json([
            'employee_name' => $profile->first_name . ' ' . $profile->last_name,
            'department' => $profile->department ?? 'Not Set',
            'company' => 'Cabuyao Concrete Development Corporation',
            'employee_id' => $user->id,
            'position' => $profile->position ?? 'Not Set',
            'email' => $profile->email ?? $user->email,
            'note' => 'Test endpoint - remove in production'
        ]);
    }

    public function index() {
        return LeaveRequest::with(['employee', 'approvedBy'])->latest()->get();
    }

    /**
     * Get leave requests for the authenticated employee
     */
    public function myRequests()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        $leaveRequests = LeaveRequest::where('employee_id', $user->id)
            ->with(['employee', 'approvedBy'])
            ->latest()
            ->get();

        return response()->json([
            'data' => $leaveRequests,
            'total' => $leaveRequests->count(),
            'pending' => $leaveRequests->where('status', 'pending')->count(),
            'approved' => $leaveRequests->where('status', 'approved')->count(),
            'rejected' => $leaveRequests->where('status', 'rejected')->count(),
        ]);
    }

    /**
     * Get leave balance for the authenticated employee
     */
    public function getLeaveBalance()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        $currentYear = now()->year;
        
        // Standard leave entitlements (can be moved to config or database)
        $annualLeaveEntitlement = 15; // days per year
        $sickLeaveEntitlement = 7; // days per year
        
        // Calculate used leave days for current year
        $usedVacationDays = LeaveRequest::where('employee_id', $user->id)
            ->where('status', 'approved')
            ->whereIn('type', ['Vacation Leave', 'Personal Leave'])
            ->whereYear('from', $currentYear)
            ->sum('total_days');
            
        $usedSickDays = LeaveRequest::where('employee_id', $user->id)
            ->where('status', 'approved')
            ->where('type', 'Sick Leave')
            ->whereYear('from', $currentYear)
            ->sum('total_days');
            
        $usedEmergencyDays = LeaveRequest::where('employee_id', $user->id)
            ->where('status', 'approved')
            ->where('type', 'Emergency Leave')
            ->whereYear('from', $currentYear)
            ->sum('total_days');

        return response()->json([
            'year' => $currentYear,
            'vacation_leave' => [
                'entitled' => $annualLeaveEntitlement,
                'used' => $usedVacationDays,
                'remaining' => $annualLeaveEntitlement - $usedVacationDays
            ],
            'sick_leave' => [
                'entitled' => $sickLeaveEntitlement,
                'used' => $usedSickDays,
                'remaining' => $sickLeaveEntitlement - $usedSickDays
            ],
            'emergency_leave' => [
                'used' => $usedEmergencyDays,
                'note' => 'Emergency leave is typically unpaid and subject to approval'
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Maternity Leave,Paternity Leave,Personal Leave,Bereavement Leave',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'total_days' => 'nullable|integer|min:1',
            'total_hours' => 'nullable|numeric|min:0|max:8',
            'reason' => 'required|string|max:500',
            'signature' => 'nullable|file|mimes:pdf,jpg,jpeg,png,gif|max:2048',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048'
        ]);

        // For testing purposes, allow without authentication
        // In production, uncomment the authentication check below
        $user = Auth::user();
        if (!$user) {
            // Fallback to a default user for testing
            $user = \App\Models\User::find(1); // Default to first user
            if (!$user) {
                return response()->json(['error' => 'No test user found. Please create a user first.'], 400);
            }
        }

        // Get employee profile for auto-population
        $profile = $user->employeeProfile;
        
        // Calculate total days if not provided
        $fromDate = Carbon::parse($validated['from']);
        $toDate = Carbon::parse($validated['to']);
        $totalDays = $validated['total_days'] ?? $fromDate->diffInDays($toDate) + 1;

        $leaveRequest = new LeaveRequest();
        $leaveRequest->employee_id = $user->id;
        $leaveRequest->company = $validated['company'] ?? 'Cabuyao Concrete Development Corporation';
        // Use submitted name from form, fallback to profile/user name if not provided
        $leaveRequest->employee_name = $validated['name'] ?? 
            ($profile ? ($profile->first_name . ' ' . $profile->last_name) : ($user->first_name . ' ' . $user->last_name));
        $leaveRequest->department = $validated['department'] ?? ($profile->department ?? 'Not Set');
        $leaveRequest->type = $validated['type'];
        $leaveRequest->terms = 'TBD by HR'; // Will be determined by HR during approval
        $leaveRequest->leave_category = 'TBD by HR'; // Will be determined by HR during approval
        $leaveRequest->from = $validated['from'];
        $leaveRequest->to = $validated['to'];
        $leaveRequest->total_days = $totalDays;
        $leaveRequest->total_hours = $validated['total_hours'] ?? 0;
        $leaveRequest->date_filed = now();
        $leaveRequest->reason = $validated['reason'];
        $leaveRequest->status = 'pending';

        // Handle signature file upload
        if ($request->hasFile('signature')) {
            $file = $request->file('signature');
            $fileName = 'signature_' . time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('signatures', $fileName, 'public');
            $leaveRequest->signature_path = $filePath;
        }
        
        // Handle additional attachment file upload
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $fileName = 'attachment_' . time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('leave_attachments', $fileName, 'public');
            $leaveRequest->attachment = $filePath;
        }

        $leaveRequest->save();

        return response()->json([
            'message' => 'Leave request submitted successfully',
            'data' => $leaveRequest->load('employee')
        ], 201);
    }

    public function show($id) {
        return LeaveRequest::with(['employee', 'approvedBy'])->findOrFail($id);
    }

    public function approve(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        $leave->status = 'approved';
        $leave->admin_remarks = $request->input('remarks');
        $leave->approved_by = auth()->id();
        $leave->approved_at = now();
        $leave->rejected_at = null;
        $leave->save();

        return response()->json([
            'message' => 'Leave request approved successfully',
            'data' => $leave->load(['employee', 'approvedBy'])
        ]);
    }

    public function reject(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        $leave->status = 'rejected';
        $leave->admin_remarks = $request->input('remarks');
        $leave->approved_by = auth()->id();
        $leave->rejected_at = now();
        $leave->approved_at = null;
        $leave->save();

        return response()->json([
            'message' => 'Leave request rejected',
            'data' => $leave->load(['employee', 'approvedBy'])
        ]);
    }

    public function updateTermsAndCategory(Request $request, $id) {
        $validated = $request->validate([
            'terms' => 'nullable|in:with PAY,without PAY',
            'leave_category' => 'nullable|string|max:255',
        ]);

        $leave = LeaveRequest::findOrFail($id);
        
        if (isset($validated['terms'])) {
            $leave->terms = $validated['terms'];
        }
        
        if (isset($validated['leave_category'])) {
            $leave->leave_category = $validated['leave_category'];
        }
        
        $leave->save();

        return response()->json([
            'message' => 'Leave request terms and category updated successfully',
            'data' => $leave->load(['employee', 'approvedBy'])
        ]);
    }

    public function getStats()
    {
        $stats = [
            'requested' => LeaveRequest::count(),
            'approved' => LeaveRequest::where('status', 'approved')->count(),
            'rejected' => LeaveRequest::where('status', 'rejected')->count(),
            'pending' => LeaveRequest::where('status', 'pending')->count(),
        ];

        $typeStats = LeaveRequest::selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->get()
            ->pluck('count', 'type')
            ->toArray();

        return response()->json([
            'approval_stats' => $stats,
            'type_stats' => $typeStats
        ]);
    }

    public function export(Request $request) {
        $type = $request->get('type', 'csv');
        $leaves = LeaveRequest::with('user')->get();

        if ($type === 'csv') {
            $csv = "Employee,Leave Type,Start Date,End Date,Status\n";
            foreach ($leaves as $leave) {
                $csv .= "{$leave->user->name},{$leave->leave_type},{$leave->start_date},{$leave->end_date},{$leave->status}\n";
            }

            return response($csv)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename=leaves.csv');
        }

        

        // You can integrate PDF generation here (e.g. DOMPDF or Snappy)
    }
}