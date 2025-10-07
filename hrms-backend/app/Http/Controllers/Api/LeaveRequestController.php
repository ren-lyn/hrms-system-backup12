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
            'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Maternity Leave,Paternity Leave,Personal Leave,Bereavement Leave',
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

        // Check if HR Assistant is currently in a meeting
        $hrMeeting = HrCalendarEvent::hasActiveBlockingEvent();
        if ($hrMeeting['blocked']) {
            return response()->json([
                'error' => $hrMeeting['message']
            ], 400);
        }

        // Validate leave request limits including balance check
        $validationError = $this->validateLeaveRequestLimits($user->id, $validated['type'], $totalDays);
        if ($validationError) {
            return response()->json(['error' => $validationError], 422);
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
        $leaveRequest->terms = 'TBD by HR'; // Will be determined by HR during approval
        $leaveRequest->leave_category = 'TBD by HR'; // Will be determined by HR during approval
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
            'data' => $leaveRequest->load('employee')
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
     */
    private function checkLeaveTypeLimit($leaveType, $requestedDays)
    {
        $entitlements = config('leave.entitlements');
        $maxAllowedDays = $entitlements[$leaveType] ?? 0;
        
        if ($maxAllowedDays === 0) {
            return "Invalid leave type: {$leaveType}";
        }
        
        if ($requestedDays > $maxAllowedDays) {
            return "You can only file up to {$maxAllowedDays} days for {$leaveType}.";
        }
        
        return null; // No limit violation
    }

    /**
     * Validate leave request limits for an employee
     * Rules:
     * 1. Maximum 3 leave requests per month
     * 2. Must wait 7 days after the end date of previous leave before filing another
     * 3. Check if requested days exceed maximum days allowed for the leave type (per-request limit)
     * 4. Check leave balance for the requested leave type (annual balance)
     */
    private function validateLeaveRequestLimits($employeeId, $leaveType = null, $requestedDays = 0)
    {
        $currentMonth = Carbon::now()->format('Y-m');
        $today = Carbon::now();
        
        // Rule 1: Check monthly limit (3 requests per month)
        $monthlyRequestCount = LeaveRequest::where('employee_id', $employeeId)
            ->whereRaw('DATE_FORMAT(created_at, "%Y-%m") = ?', [$currentMonth])
            ->count();
            
        if ($monthlyRequestCount >= 3) {
            return 'You have reached the monthly limit of 3 leave requests. Please wait until next month to submit another request.';
        }
        
        // Rule 2: Check 7-day waiting period after last leave end date
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
        
        // Rule 3: Check if requested days exceed the maximum allowed for the leave type (check first)
        if ($leaveType && $requestedDays > 0) {
            $leaveTypeLimitError = $this->checkLeaveTypeLimit($leaveType, $requestedDays);
            if ($leaveTypeLimitError) {
                return $leaveTypeLimitError;
            }
        }
        
        // Rule 4: Check leave balance if leave type and requested days are provided
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
        $currentMonth = Carbon::now()->format('Y-m');
        $today = Carbon::now();
        
        // Monthly usage
        $monthlyRequestCount = LeaveRequest::where('employee_id', $employeeId)
            ->whereRaw('DATE_FORMAT(created_at, "%Y-%m") = ?', [$currentMonth])
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
            'monthly_limit' => [
                'limit' => 3,
                'used' => $monthlyRequestCount,
                'remaining' => 3 - $monthlyRequestCount,
                'month' => Carbon::now()->format('F Y')
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
}
