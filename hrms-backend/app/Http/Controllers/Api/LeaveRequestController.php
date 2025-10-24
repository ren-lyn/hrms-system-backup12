<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Models\EmployeeProfile;
use App\Models\HrCalendarEvent;
use App\Notifications\LeaveRequestStatusChanged;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

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
        return LeaveRequest::with(['employee', 'approvedBy', 'managerApprovedBy'])->latest()->get();
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
            ->with(['employee', 'approvedBy', 'managerApprovedBy'])
            ->latest()
            ->get();

        return response()->json([
            'data' => $leaveRequests,
            'total' => $leaveRequests->count(),
            'pending' => $leaveRequests->where('status', 'pending')->count(),
            'manager_approved' => $leaveRequests->where('status', 'manager_approved')->count(),
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
        
        // Get leave entitlements from configuration
        $entitlements = config('leave.entitlements');
        
        $leaveBalances = [];
        
        // Calculate balance for each leave type
        foreach ($entitlements as $leaveType => $entitledDays) {
            $usedDays = LeaveRequest::where('employee_id', $user->id)
                ->where('status', 'approved')
                ->where('type', $leaveType)
                ->whereYear('from', $currentYear)
                ->sum('total_days');
            
            $remaining = max(0, $entitledDays - $usedDays);
            
            // Format key for consistent API response
            $key = strtolower(str_replace(' ', '_', $leaveType));
            
            $leaveBalances[$key] = [
                'type' => $leaveType,
                'entitled' => $entitledDays,
                'used' => $usedDays,
                'remaining' => $remaining
            ];
            
            // Add special notes for certain leave types
            if ($leaveType === 'Emergency Leave') {
                $leaveBalances[$key]['note'] = 'Emergency leave is typically unpaid and subject to approval';
            }
            
            if ($leaveType === 'Maternity Leave') {
                $leaveBalances[$key]['note'] = 'Requires medical certificate and 30 days advance notice';
            }
            
            if ($leaveType === 'Paternity Leave') {
                $leaveBalances[$key]['note'] = 'Requires 7 days advance notice';
            }
        }

        return response()->json([
            'year' => $currentYear,
            'leave_balances' => $leaveBalances,
            'summary' => [
                'total_entitled' => array_sum($entitlements),
                'total_used' => array_sum(array_column($leaveBalances, 'used')),
                'total_remaining' => array_sum(array_column($leaveBalances, 'remaining'))
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Maternity Leave,Paternity Leave,Personal Leave,Bereavement Leave,Leave for Victims of Violence Against Women and Their Children (VAWC),Women\'s Special Leave,Parental Leave',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'total_days' => 'nullable|integer|min:1',
            // total_hours is now automatically calculated as total_days * 8
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

        // Calculate total days if not provided (needed for validation)
        $fromDate = Carbon::parse($validated['from']);
        $toDate = Carbon::parse($validated['to']);
        $totalDays = $validated['total_days'] ?? $fromDate->diffInDays($toDate) + 1;

        // Check if employee has an active leave (not yet ended)
        $activeLeavCheck = LeaveRequest::checkActiveLeave($user->id);
        if ($activeLeavCheck['has_active_leave']) {
            return response()->json([
                'error' => $activeLeavCheck['message']
            ], 422);
        }

        // Check if HR Assistant is currently in a meeting
        $hrMeeting = HrCalendarEvent::hasActiveBlockingEvent();
        if ($hrMeeting['blocked']) {
            return response()->json([
                'error' => $hrMeeting['message']
            ], 400);
        }

        // Validate leave request limits including balance check
        $validationResult = $this->validateLeaveRequestLimits($user->id, $validated['type'], $totalDays);
        if ($validationResult) {
            // If it's a warning (array with warning key), we allow the request but return the warning
            if (is_array($validationResult) && isset($validationResult['warning'])) {
                // Continue with the request creation but include the warning in response
                $warningMessage = $validationResult;
            } else {
                // If it's a string error, return it as before
                return response()->json(['error' => $validationResult], 422);
            }
        }

        // Calculate automatic payment terms based on leave type and usage
        $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms($user->id, $validated['type'], $totalDays);
        
        // Add payment terms message to warning if it exists
        if (!isset($warningMessage)) {
            $warningMessage = [
                'warning' => true,
                'message' => $paymentTerms['message'],
                'with_pay_days' => $paymentTerms['with_pay_days'],
                'without_pay_days' => $paymentTerms['without_pay_days'],
                'is_split' => $paymentTerms['is_split'] ?? false
            ];
        }

        // Get employee profile for auto-population
        $profile = $user->employeeProfile;

        $leaveRequest = new LeaveRequest();
        $leaveRequest->employee_id = $user->id;
        $leaveRequest->company = $validated['company'] ?? 'Cabuyao Concrete Development Corporation';
        // Use submitted name from form, fallback to profile/user name if not provided
        $leaveRequest->employee_name = $validated['name'] ?? 
            ($profile ? ($profile->first_name . ' ' . $profile->last_name) : ($user->first_name . ' ' . $user->last_name));
        $leaveRequest->department = $validated['department'] ?? ($profile->department ?? 'Not Set');
        $leaveRequest->type = $validated['type'];
        // AUTOMATIC: Set payment terms and category based on employee tenure
        $leaveRequest->terms = $paymentTerms['terms'];
        $leaveRequest->leave_category = $paymentTerms['leave_category'];
        $leaveRequest->with_pay_days = $paymentTerms['with_pay_days'];
        $leaveRequest->without_pay_days = $paymentTerms['without_pay_days'];
        $leaveRequest->from = $validated['from'];
        $leaveRequest->to = $validated['to'];
        $leaveRequest->total_days = $totalDays;
        $leaveRequest->total_hours = $totalDays * 8; // Automatically calculate: 8 hours per day
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

        // Send notification to managers and HR staff
        try {
            $leaveRequest->load(['employee.employeeProfile']);
            $department = $leaveRequest->employee->employeeProfile->department ?? $leaveRequest->department;
            
            // Get managers in the same department
            $managers = \App\Models\User::whereHas('role', function($query) {
                $query->where('name', 'Manager');
            })->whereHas('employeeProfile', function($query) use ($department) {
                $query->where('department', $department);
            })->get();

            // If no managers in same department, get all managers
            if ($managers->isEmpty()) {
                $managers = \App\Models\User::whereHas('role', function($query) {
                    $query->where('name', 'Manager');
                })->get();
            }

            // Get HR Assistant only (Leave Management is HR Assistant's responsibility)
            $hrAssistants = \App\Models\User::whereHas('role', function($query) {
                $query->where('name', 'HR Assistant');
            })->get();

            // Notify managers
            foreach ($managers as $manager) {
                $manager->notify(new \App\Notifications\LeaveRequestSubmitted($leaveRequest));
            }

            // Notify HR Assistants only (not HR Staff)
            foreach ($hrAssistants as $hrAssistant) {
                $hrAssistant->notify(new \App\Notifications\LeaveRequestSubmittedToHR($leaveRequest));
            }

            \Log::info('Leave request submission notifications sent', [
                'leave_request_id' => $leaveRequest->id,
                'employee_id' => $leaveRequest->employee_id,
                'department' => $department,
                'managers_notified' => $managers->count(),
                'hr_assistants_notified' => $hrAssistants->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send leave request submission notifications', [
                'leave_request_id' => $leaveRequest->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'message' => 'Leave request submitted successfully',
            'data' => $leaveRequest->load('employee'),
            'warning' => $warningMessage ?? null
        ], 201);
    }

    public function show($id) {
        return LeaveRequest::with(['employee', 'approvedBy', 'managerApprovedBy'])->findOrFail($id);
    }

    /**
     * Manager approval - first step in approval workflow
     */
    public function managerApprove(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        
        // Only allow approval of pending requests
        if ($leave->status !== 'pending') {
            return response()->json([
                'error' => 'This leave request is not pending manager approval'
            ], 400);
        }
        
        $leave->status = 'manager_approved';
        $leave->manager_remarks = $request->input('remarks');
        $leave->manager_approved_by = Auth::id();
        $leave->manager_approved_at = now();
        $leave->manager_rejected_at = null;
        $leave->save();

        return response()->json([
            'message' => 'Leave request approved by manager successfully. Now pending HR approval.',
            'data' => $leave->load(['employee', 'managerApprovedBy'])
        ]);
    }

    /**
     * Manager rejection - prevents request from going to HR
     */
    public function managerReject(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        
        // Only allow rejection of pending requests
        if ($leave->status !== 'pending') {
            return response()->json([
                'error' => 'This leave request is not pending manager approval'
            ], 400);
        }
        
        $leave->status = 'manager_rejected';
        $leave->manager_remarks = $request->input('remarks');
        $leave->manager_approved_by = Auth::id();
        $leave->manager_rejected_at = now();
        $leave->manager_approved_at = null;
        $leave->save();

        // Do NOT notify employee yet - HR must approve the rejection first
        
        return response()->json([
            'message' => 'Leave request rejected by manager. Pending HR approval of rejection.',
            'data' => $leave->load(['employee', 'managerApprovedBy'])
        ]);
    }

    /**
     * HR approval - final step in approval workflow (only for manager-approved requests)
     */
    public function approve(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        
        // Only allow approval of manager-approved requests
        if ($leave->status !== 'manager_approved') {
            return response()->json([
                'error' => 'This leave request must be approved by manager first'
            ], 400);
        }
        
        $leave->status = 'approved';
        $leave->admin_remarks = $request->input('remarks');
        $leave->approved_by = Auth::id();
        $leave->approved_at = now();
        $leave->rejected_at = null;
        $leave->save();

        // Notify employee
        $leave->employee->notify(new LeaveRequestStatusChanged($leave));

        return response()->json([
            'message' => 'Leave request approved by HR successfully',
            'data' => $leave->load(['employee', 'approvedBy', 'managerApprovedBy'])
        ]);
    }

    /**
     * HR rejection - can reject manager-approved requests
     */
    public function reject(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        
        // Only allow rejection of manager-approved requests
        if ($leave->status !== 'manager_approved') {
            return response()->json([
                'error' => 'This leave request must be approved by manager first'
            ], 400);
        }
        
        $leave->status = 'rejected';
        $leave->admin_remarks = $request->input('remarks');
        $leave->approved_by = Auth::id();
        $leave->rejected_at = now();
        $leave->approved_at = null;
        $leave->save();

        // Notify employee
        $leave->employee->notify(new LeaveRequestStatusChanged($leave));

        return response()->json([
            'message' => 'Leave request rejected by HR',
            'data' => $leave->load(['employee', 'approvedBy', 'managerApprovedBy'])
        ]);
    }

    /**
     * HR confirms/approves a manager's rejection
     */
    public function confirmManagerRejection(Request $request, $id) {
        $leave = LeaveRequest::findOrFail($id);
        
        // Only allow confirmation of manager-rejected requests
        if ($leave->status !== 'manager_rejected') {
            return response()->json([
                'error' => 'This leave request is not pending HR confirmation of manager rejection'
            ], 400);
        }
        
        // Change status to rejected and add HR remarks if provided
        $leave->status = 'rejected';
        if ($request->has('remarks')) {
            $leave->admin_remarks = $request->input('remarks');
        }
        $leave->approved_by = Auth::id();
        $leave->rejected_at = now();
        $leave->approved_at = null;
        $leave->save();

        // Now notify employee about the confirmed rejection
        $leave->employee->notify(new LeaveRequestStatusChanged($leave));

        return response()->json([
            'message' => 'Manager rejection confirmed by HR. Employee has been notified.',
            'data' => $leave->load(['employee', 'approvedBy', 'managerApprovedBy'])
        ]);
    }

    /**
     * Get leave requests pending manager approval
     */
    public function getManagerPendingRequests()
    {
        $pendingRequests = LeaveRequest::where('status', 'pending')
            ->with(['employee', 'employee.employeeProfile'])
            ->latest('date_filed')
            ->get();

        return response()->json([
            'data' => $pendingRequests,
            'total' => $pendingRequests->count(),
            'message' => 'Manager pending leave requests retrieved successfully'
        ]);
    }

    /**
     * Get leave requests pending HR approval (manager-approved requests)
     */
    public function getHRPendingRequests()
    {
        $pendingRequests = LeaveRequest::whereIn('status', ['manager_approved', 'manager_rejected'])
            ->with(['employee', 'employee.employeeProfile', 'managerApprovedBy'])
            ->latest('manager_approved_at')
            ->orderByRaw('CASE WHEN status = "manager_rejected" THEN 1 ELSE 2 END') // Show manager rejected first
            ->get();

        return response()->json([
            'data' => $pendingRequests,
            'total' => $pendingRequests->count(),
            'manager_approved' => $pendingRequests->where('status', 'manager_approved')->count(),
            'manager_rejected' => $pendingRequests->where('status', 'manager_rejected')->count(),
            'message' => 'HR pending leave requests retrieved successfully'
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
            'data' => $leave->load(['employee', 'approvedBy', 'managerApprovedBy'])
        ]);
    }

    public function getStats()
    {
        $stats = [
            'requested' => LeaveRequest::count(),
            'approved' => LeaveRequest::where('status', 'approved')->count(),
            'rejected' => LeaveRequest::where('status', 'rejected')->count(),
            'pending' => LeaveRequest::where('status', 'pending')->count(),
            'manager_approved' => LeaveRequest::where('status', 'manager_approved')->count(),
            'manager_rejected' => LeaveRequest::where('status', 'manager_rejected')->count(),
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
        $leaves = LeaveRequest::with('employee')->get();

        if ($type === 'csv') {
            $csv = "Employee,Leave Type,Start Date,End Date,Status\n";
            foreach ($leaves as $leave) {
                $csv .= "{$leave->employee_name},{$leave->type},{$leave->from},{$leave->to},{$leave->status}\n";
            }

            return response($csv)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename=leaves.csv');
        }

        return response()->json(['error' => 'Invalid export type. Supported: csv'], 400);
    }

    /**
     * Get leave entitlement for a specific leave type
     */
    private function getLeaveEntitlement($leaveType)
    {
        $entitlements = config('leave.entitlements');
        return $entitlements[$leaveType] ?? 0;
    }

    /**
     * Check if employee has sufficient leave balance for the request
     */
    private function checkLeaveBalance($employeeId, $leaveType, $requestedDays)
    {
        $currentYear = now()->year;
        $entitled = $this->getLeaveEntitlement($leaveType);
        
        $usedDays = LeaveRequest::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('type', $leaveType)
            ->whereYear('from', $currentYear)
            ->sum('total_days');
            
        $remaining = $entitled - $usedDays;
        
        if ($requestedDays > $remaining) {
            return "Insufficient {$leaveType} balance. You have {$remaining} days remaining out of {$entitled} entitled days.";
        }
        
        return null; // No balance issues
    }

    /**
     * Check if the requested days exceed the maximum allowed for a single request of this leave type
     * Special handling for specified leave types: allow exceeding max days but differentiate paid/unpaid
     */
    private function checkLeaveTypeLimit($leaveType, $requestedDays)
    {
        $entitlements = config('leave.entitlements');
        $maxAllowedDays = $entitlements[$leaveType] ?? 0;
        
        if ($maxAllowedDays === 0) {
            return "Invalid leave type: {$leaveType}";
        }
        
        // Special handling for these leave types: allow exceeding limit with paid/unpaid split
        $specialLeaveTypes = [
            'Sick Leave',
            'Emergency Leave',
            'Vacation Leave',
            'Maternity Leave',
            'Paternity Leave',
            'Leave for Victims of Violence Against Women and Their Children (VAWC)',
            "Women's Special Leave",
            'Parental Leave'
        ];
        
        if (in_array($leaveType, $specialLeaveTypes)) {
            if ($requestedDays > $maxAllowedDays) {
                $paidDays = $maxAllowedDays;
                $unpaidDays = $requestedDays - $maxAllowedDays;
                return [
                    'warning' => true,
                    'message' => "For {$leaveType}: First {$paidDays} days will be paid, remaining {$unpaidDays} days will be unpaid. You can still submit this request.",
                    'paid_days' => $paidDays,
                    'unpaid_days' => $unpaidDays,
                    'total_days' => $requestedDays
                ];
            }
        } else {
            // For other leave types, maintain the original strict limit
            if ($requestedDays > $maxAllowedDays) {
                return "You can only file up to {$maxAllowedDays} days for {$leaveType}.";
            }
        }
        
        return null; // No limit violation
    }

    /**
     * Check if employee is a new hire (less than 1 year from hire date)
     */
    private function isNewHire($employeeId)
    {
        $user = User::with('employeeProfile')->find($employeeId);
        if (!$user || !$user->employeeProfile) {
            return false; // If no profile, assume not a new hire
        }
        
        $hireDate = $user->employeeProfile->hire_date;
        if (!$hireDate) {
            return false; // If no hire date, assume not a new hire
        }
        
        $hireDate = Carbon::parse($hireDate);
        $oneYearAgo = Carbon::now()->subMonths(12);
        
        return $hireDate->gt($oneYearAgo);
    }

    /**
     * Validate leave request limits for an employee
     * Rules:
     * 1. Check if employee is a new hire (less than 1 year) - NEW HIRE VALIDATION
     * 2. Maximum 3 leave requests per year
     * 3. Must wait 7 days after the end date of previous leave before filing another
     * 4. Check if requested days exceed maximum days allowed for the leave type (per-request limit)
     * 5. Check leave balance for the requested leave type (annual balance)
     */
    private function validateLeaveRequestLimits($employeeId, $leaveType = null, $requestedDays = 0)
    {
        $currentYear = Carbon::now()->year;
        $today = Carbon::now();
        
        // Rule 1: New hires (<1 year) are allowed but with an unpaid warning
        if ($this->isNewHire($employeeId)) {
            return [
                'warning' => true,
                'message' => 'As a new employee (employed less than one year), this leave will be without pay. You can still submit this request.'
            ];
        }
        
        // Rule 2: Check yearly limit (3 requests per year)
        $yearlyRequestCount = LeaveRequest::where('employee_id', $employeeId)
            ->whereYear('created_at', $currentYear)
            ->count();
            
        if ($yearlyRequestCount >= 3) {
            return 'You have reached the yearly limit of 3 leave requests. Please wait until next year to submit another request.';
        }
        
        // Rule 3: Check 7-day waiting period after last leave end date
        $lastLeave = LeaveRequest::where('employee_id', $employeeId)
            ->whereIn('status', ['pending', 'manager_approved', 'approved']) // Only consider non-rejected leaves
            ->orderBy('to', 'desc')
            ->first();
            
        if ($lastLeave) {
            $lastLeaveEndDate = Carbon::parse($lastLeave->to); // Leave end date
            $waitUntilDate = $lastLeaveEndDate->copy()->addDays(8); // 7 full waiting days + 1 (can file on 8th day)
            $todayStart = $today->copy()->startOfDay();
            $waitUntilStart = $waitUntilDate->copy()->startOfDay();
            
            if ($todayStart->lt($waitUntilStart)) {
                return "You need to wait 7 days before you can file another leave request. Your last leave ended on {$lastLeaveEndDate->format('F j, Y')}, and you can submit your next request on {$waitUntilDate->format('F j, Y')}";
            }
        }
        
        // Rule 4: Check if requested days exceed the maximum allowed for the leave type (check first)
        if ($leaveType && $requestedDays > 0) {
            $leaveTypeLimitResult = $this->checkLeaveTypeLimit($leaveType, $requestedDays);
            if ($leaveTypeLimitResult) {
                // If it's a warning (array with warning key), we allow the request but return the warning
                if (is_array($leaveTypeLimitResult) && isset($leaveTypeLimitResult['warning'])) {
                    return $leaveTypeLimitResult; // Return the warning object
                } else {
                    // If it's a string error, return it as before
                    return $leaveTypeLimitResult;
                }
            }
        }
        
        // Rule 5: Check leave balance if leave type and requested days are provided
        if ($leaveType && $requestedDays > 0) {
            $balanceError = $this->checkLeaveBalance($employeeId, $leaveType, $requestedDays);
            if ($balanceError) {
                return $balanceError;
            }
        }
        
        return null; // No validation errors
    }

    /**
     * Check if employee can submit a new leave request
     * Returns eligibility status and any restrictions
     */
    /**
     * Get available leave types with their entitlements and settings
     */
    public function getLeaveTypes()
    {
        $entitlements = config('leave.entitlements');
        $settings = config('leave.settings');
        
        $leaveTypes = [];
        
        foreach ($entitlements as $leaveType => $entitledDays) {
            $leaveTypes[] = [
                'type' => $leaveType,
                'entitled_days' => $entitledDays,
                'settings' => $settings[$leaveType] ?? []
            ];
        }
        
        return response()->json([
            'leave_types' => $leaveTypes,
            'total_types' => count($leaveTypes)
        ]);
    }

    public function checkEligibility()
    {
        $user = Auth::user();
        if (!$user) {
            // For testing purposes, fallback to default user
            $user = \App\Models\User::find(1);
            if (!$user) {
                return response()->json(['error' => 'No user found'], 400);
            }
        }

        $validationError = $this->validateLeaveRequestLimits($user->id);
        
        if ($validationError) {
            // If it's a warning (e.g., new hire unpaid), still eligible
            if (is_array($validationError) && isset($validationError['warning'])) {
                return response()->json([
                    'eligible' => true,
                    'message' => $validationError['message'],
                    'restrictions' => $this->getLeaveRestrictionDetails($user->id)
                ]);
            }
            
            return response()->json([
                'eligible' => false,
                'message' => $validationError,
                'restrictions' => $this->getLeaveRestrictionDetails($user->id)
            ]);
        }
        
        return response()->json([
            'eligible' => true,
            'message' => 'You can submit a new leave request.',
            'restrictions' => $this->getLeaveRestrictionDetails($user->id)
        ]);
    }

    /**
     * Get detailed information about leave restrictions
     */
    private function getLeaveRestrictionDetails($employeeId)
    {
        $currentYear = Carbon::now()->year;
        $today = Carbon::now();
        
        // Yearly usage
        $yearlyRequestCount = LeaveRequest::where('employee_id', $employeeId)
            ->whereYear('created_at', $currentYear)
            ->count();
            
        // Last leave information
        $lastLeave = LeaveRequest::where('employee_id', $employeeId)
            ->whereIn('status', ['pending', 'manager_approved', 'approved'])
            ->orderBy('to', 'desc')
            ->first();
            
        $waitingPeriodInfo = null;
        if ($lastLeave) {
            $lastLeaveEndDate = Carbon::parse($lastLeave->to); // Leave end date
            $waitUntilDate = $lastLeaveEndDate->copy()->addDays(8); // 7 full waiting days + 1 (can file on 8th day)
            $todayStart = $today->copy()->startOfDay();
            $waitUntilStart = $waitUntilDate->copy()->startOfDay();
            
            // Check if still in waiting period
            $waitingPeriodActive = $todayStart->lt($waitUntilStart);
            $daysRemaining = $waitingPeriodActive ? 7 : 0; // Always show 7 if in waiting period
            
            $waitingPeriodInfo = [
                'last_leave_end_date' => $lastLeaveEndDate->format('F j, Y'),
                'can_apply_from' => $waitUntilDate->format('F j, Y'),
                'days_remaining' => $daysRemaining,
                'waiting_period_active' => $waitingPeriodActive
            ];
        }
        
        return [
            'yearly_limit' => [
                'limit' => 3,
                'used' => $yearlyRequestCount,
                'remaining' => max(0, 3 - $yearlyRequestCount),
                'year' => $currentYear
            ],
            'waiting_period' => $waitingPeriodInfo
        ];
    }

    /**
     * Download leave request as PDF
     */
    public function downloadPdf($id)
    {
        $leaveRequest = LeaveRequest::with(['employee', 'approvedBy', 'managerApprovedBy'])->findOrFail($id);
        
        // Check if user can access this leave request
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        // Only allow the employee who created the request or HR staff to download
        if ($leaveRequest->employee_id !== $user->id && !in_array($user->role->name ?? '', ['HR Assistant', 'HR Staff'])) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $pdf = Pdf::loadView('pdf.leave-application', compact('leaveRequest'));
        
        $filename = 'leave-application-' . $leaveRequest->id . '.pdf';
        
        return $pdf->download($filename);
    }

    /**
     * Get employee's leave summary with tenure-based payment status
     */
    public function getLeaveSummary()
    {
        $user = Auth::user();
        if (!$user) {
            // Fallback for testing
            $user = \App\Models\User::find(1);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 400);
            }
        }

        $currentYear = now()->year;
        
        // Calculate employee tenure
        $tenureInMonths = LeaveRequest::calculateEmployeeTenure($user->id);
        $tenureYears = floor($tenureInMonths / 12);
        $remainingMonths = $tenureInMonths % 12;
        
        // Determine tenure bracket
        $tenureBracket = '';
        $silDays = 0;
        $otherLeavesPaid = false;
        
        if ($tenureInMonths < 6) {
            $tenureBracket = 'Less than 6 months';
            $silDays = 0;
            $otherLeavesPaid = false;
        } elseif ($tenureInMonths >= 6 && $tenureInMonths < 12) {
            $tenureBracket = '6 months to 1 year';
            $silDays = 3;
            $otherLeavesPaid = false;
        } else {
            $tenureBracket = '1 year or more';
            $silDays = 8;
            $otherLeavesPaid = true;
        }
        
        // Calculate used SIL days (Sick Leave + Emergency Leave combined)
        $usedSILDays = LeaveRequest::where('employee_id', $user->id)
            ->whereIn('type', ['Sick Leave', 'Emergency Leave'])
            ->whereYear('from', $currentYear)
            ->whereIn('status', ['approved'])
            ->where('terms', 'with PAY')
            ->sum('total_days');
        
        $remainingSILDays = max(0, $silDays - $usedSILDays);
        
        // Check for active leave
        $activeLeavCheck = LeaveRequest::checkActiveLeave($user->id);
        
        // Get all leaves for current year
        $allLeaves = LeaveRequest::where('employee_id', $user->id)
            ->whereYear('from', $currentYear)
            ->orderBy('from', 'desc')
            ->get()
            ->map(function ($leave) {
                return [
                    'id' => $leave->id,
                    'type' => $leave->type,
                    'from' => $leave->from->format('Y-m-d'),
                    'to' => $leave->to->format('Y-m-d'),
                    'total_days' => $leave->total_days,
                    'terms' => $leave->terms,
                    'leave_category' => $leave->leave_category,
                    'status' => $leave->status,
                    'date_filed' => $leave->date_filed ? $leave->date_filed->format('Y-m-d') : null,
                ];
            });
        
        // Calculate leave instances (yearly limit tracking)
        $yearlyRequestCount = LeaveRequest::where('employee_id', $user->id)
            ->whereYear('created_at', $currentYear)
            ->count();
        
        $remainingRequests = max(0, 3 - $yearlyRequestCount);
        
        // Determine next available filing date
        $nextAvailableDate = null;
        $lastLeave = LeaveRequest::where('employee_id', $user->id)
            ->whereIn('status', ['pending', 'manager_approved', 'approved'])
            ->orderBy('to', 'desc')
            ->first();
            
        if ($lastLeave) {
            $lastLeaveEndDate = Carbon::parse($lastLeave->to);
            $waitUntilDate = $lastLeaveEndDate->copy()->addDays(8); // 7 full waiting days + 1
            $today = Carbon::now()->startOfDay();
            
            // Only set next available date if still in waiting period
            if ($today->lt($waitUntilDate->startOfDay())) {
                $nextAvailableDate = $waitUntilDate->format('F j, Y');
            }
        }
        
        // If all 3 leaves used, next available is next year
        if ($yearlyRequestCount >= 3 && !$nextAvailableDate) {
            $nextYear = Carbon::create($currentYear + 1, 1, 1);
            $nextAvailableDate = $nextYear->format('F j, Y');
        }
        
        return response()->json([
            'year' => $currentYear,
            'leave_instances' => [
                'total_allowed' => 3,
                'used' => $yearlyRequestCount,
                'remaining' => $remainingRequests,
                'next_available_date' => $nextAvailableDate
            ],
            'tenure' => [
                'months' => $tenureInMonths,
                'years' => $tenureYears,
                'remaining_months' => $remainingMonths,
                'bracket' => $tenureBracket,
                'display' => $tenureYears > 0 
                    ? "{$tenureYears} year" . ($tenureYears > 1 ? 's' : '') . ($remainingMonths > 0 ? " and {$remainingMonths} month" . ($remainingMonths > 1 ? 's' : '') : '')
                    : "{$tenureInMonths} month" . ($tenureInMonths > 1 ? 's' : '')
            ],
            'sil_balance' => [
                'max_with_pay_days' => $silDays,
                'used_with_pay_days' => $usedSILDays,
                'remaining_with_pay_days' => $remainingSILDays,
                'percentage_used' => $silDays > 0 ? round(($usedSILDays / $silDays) * 100, 1) : 0
            ],
            'other_leaves_paid' => $otherLeavesPaid,
            'payment_status' => [
                'message' => 'Payment status is automatically determined based on your tenure and leave category.',
                'can_file_leave' => !$activeLeavCheck['has_active_leave'],
                'restriction_message' => $activeLeavCheck['message']
            ],
            'active_leave' => $activeLeavCheck['has_active_leave'] ? [
                'exists' => true,
                'leave_id' => $activeLeavCheck['leave']->id,
                'type' => $activeLeavCheck['leave']->type,
                'from' => $activeLeavCheck['leave']->from->format('Y-m-d'),
                'to' => $activeLeavCheck['leave']->to->format('Y-m-d'),
                'status' => $activeLeavCheck['leave']->status,
                'can_file_from' => Carbon::parse($activeLeavCheck['leave']->to)->addDay()->format('Y-m-d')
            ] : [
                'exists' => false
            ],
            'leaves_this_year' => $allLeaves,
            'rules' => [
                '1' => 'Payment is based on your length of service (tenure)',
                '2' => 'Less than 6 months: All leave types are WITHOUT PAY',
                '3' => '6 months to 1 year: SIL (Sick & Emergency Leave) gets 3 days WITH PAY',
                '4' => '1 year or more: SIL gets 8 days WITH PAY (3 + 5 additional days)',
                '5' => '1 year or more: Other leave types are WITH PAY based on their configured days',
                '6' => 'SIL = Sick Leave and Emergency Leave (combined)',
                '7' => 'All leave counters reset at the start of each calendar year',
                '8' => 'You cannot file another leave until your current leave end date has passed'
            ]
        ]);
    }

    /**
     * Get Leave Tracker data for HR Assistant
     */
    public function getLeaveTrackerData(Request $request)
    {
        $month = $request->get('month', Carbon::now()->month);
        $year = $request->get('year', Carbon::now()->year);
        
        // Get all employees with their profiles
        $employees = User::with(['employeeProfile'])
            ->whereHas('employeeProfile')
            ->get();
        
        $leaveTrackerData = [];
        
        foreach ($employees as $employee) {
            $profile = $employee->employeeProfile;
            
            // Get ALL approved leave requests for the entire year (not just the selected month)
            $leaveRequests = LeaveRequest::where('employee_id', $employee->id)
                ->whereYear('from', $year)
                ->whereIn('status', ['approved', 'manager_approved'])
                ->orderBy('from', 'asc')
                ->get();
            
            // Calculate leave statistics using the split days fields
            $totalLeaveDays = $leaveRequests->sum('total_days');
            $paidLeaveDays = $leaveRequests->sum('with_pay_days');
            $unpaidLeaveDays = $leaveRequests->sum('without_pay_days');
            
            // Get leave periods for display (all leave instances for the year)
            $leavePeriods = $leaveRequests->map(function ($request) {
                return [
                    'leaveType' => $request->type,
                    'startDate' => $request->from,
                    'endDate' => $request->to,
                    'days' => $request->total_days,
                    'terms' => $request->terms,
                    'leave_category' => $request->leave_category ?? 'Not Set'
                ];
            })->toArray();
            
            $leaveTrackerData[] = [
                'id' => $employee->id,
                'name' => $profile->first_name . ' ' . $profile->last_name,
                'email' => $profile->email ?? $employee->email,
                'department' => $profile->department ?? 'Not Set',
                'position' => $profile->position ?? 'Not Set',
                'totalLeaveDays' => $totalLeaveDays,
                'paidLeaveDays' => $paidLeaveDays,
                'unpaidLeaveDays' => $unpaidLeaveDays,
                'leavePeriods' => $leavePeriods
            ];
        }
        
        return response()->json([
            'data' => $leaveTrackerData,
            'month' => $month,
            'year' => $year,
            'summary' => [
                'totalEmployees' => count($leaveTrackerData),
                'employeesWithLeave' => count(array_filter($leaveTrackerData, function($emp) {
                    return $emp['totalLeaveDays'] > 0;
                })),
                'totalLeaveDays' => array_sum(array_column($leaveTrackerData, 'totalLeaveDays')),
                'totalPaidDays' => array_sum(array_column($leaveTrackerData, 'paidLeaveDays')),
                'totalUnpaidDays' => array_sum(array_column($leaveTrackerData, 'unpaidLeaveDays'))
            ]
        ]);
    }
}
