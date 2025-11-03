<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CashAdvanceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Notifications\CashAdvanceStatusChanged;
use Illuminate\Support\Facades\Notification;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CashAdvanceController extends Controller
{
    /**
     * Check if employee is a new hire (less than 6 months from hire date)
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
        $sixMonthsAgo = Carbon::now()->subMonths(6);
        
        return $hireDate->gt($sixMonthsAgo);
    }

    /**
     * Submit a new cash advance request
     */
    public function store(Request $request)
    {
        $request->validate([
            'reason' => 'required|string|max:500',
            'amount_ca' => 'required|numeric|min:0.01|max:999999.99',
            'rem_ca' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();
        
        // For testing without authentication, use first user if no auth
        if (!$user) {
            $user = \App\Models\User::first();
        }
        
        // Check if employee is a new hire (less than 6 months from hire date)
        if ($this->isNewHire($user->id)) {
            return response()->json([
                'error' => 'You must be employed for at least 6 months before requesting a cash advance.'
            ], 422);
        }
        
        // Get employee profile for department info
        $profile = $user->employeeProfile;
        
        $cashAdvanceRequest = CashAdvanceRequest::create([
            'user_id' => $user->id,
            'name' => $user->first_name . ' ' . $user->last_name,
            'company' => 'Cabuyao Concrete Development Corporation',
            'department' => $profile->department ?? 'Not Specified',
            'date_field' => now()->toDateString(),
            'reason' => $request->reason,
            'amount_ca' => $request->amount_ca,
            'rem_ca' => $request->rem_ca,
            'status' => 'pending',
        ]);

        // Send notification to HR staff and managers
        try {
            $department = $profile->department ?? 'Not Specified';
            
            // Get HR Assistant only (Cash Advance is HR Assistant's responsibility)
            $hrAssistants = \App\Models\User::whereHas('role', function($query) {
                $query->where('name', 'HR Assistant');
            })->get();

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

            // Notify HR Assistants only (not HR Staff)
            foreach ($hrAssistants as $hrAssistant) {
                $hrAssistant->notify(new \App\Notifications\CashAdvanceSubmitted($cashAdvanceRequest));
            }

            // Notify managers
            foreach ($managers as $manager) {
                $manager->notify(new \App\Notifications\CashAdvanceSubmitted($cashAdvanceRequest));
            }

            Log::info('Cash advance submission notifications sent', [
                'cash_advance_id' => $cashAdvanceRequest->id,
                'employee_id' => $user->id,
                'department' => $department,
                'hr_assistants_notified' => $hrAssistants->count(),
                'managers_notified' => $managers->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send cash advance submission notifications', [
                'cash_advance_id' => $cashAdvanceRequest->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'message' => 'Cash advance request submitted successfully',
            'data' => $cashAdvanceRequest,
        ], 201);
    }

    /**
     * Get all cash advance requests for HR Assistant
     */
    public function index(Request $request)
    {
        // Fast query with minimal relationships for better performance
        $query = CashAdvanceRequest::select('id', 'user_id', 'name', 'company', 'department', 'date_field', 'amount_ca', 'rem_ca', 'reason', 'status', 'hr_remarks', 'processed_by', 'processed_at', 'created_at', 'updated_at')
            ->orderBy('created_at', 'desc');

        // Quick filters
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('date_field', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('date_field', '<=', $request->date_to);
        }

        // Fast search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%");
            });
        }

        // Fast pagination with more items per page for better performance
        $cashAdvanceRequests = $query->paginate(50);

        return response()->json($cashAdvanceRequests);
    }

    /**
     * Get a specific cash advance request details
     */
    public function show($id)
    {
        $cashAdvanceRequest = CashAdvanceRequest::with(['user', 'processedBy'])
            ->findOrFail($id);

        // Add processed_by_name for easier frontend access
        $data = $cashAdvanceRequest->toArray();
        if ($cashAdvanceRequest->processedBy) {
            $data['processed_by_name'] = $cashAdvanceRequest->processedBy->first_name . ' ' . $cashAdvanceRequest->processedBy->last_name;
        }

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Approve a cash advance request
     */
    public function approve(Request $request, $id)
    {
        $request->validate([
            'hr_remarks' => 'nullable|string|max:1000',
            'collection_date' => 'nullable|date|after_or_equal:today',
            'amount_ca' => 'nullable|numeric|min:0.01|max:999999.99',
            'rem_ca' => 'nullable|string|max:255',
        ]);

        $cashAdvanceRequest = CashAdvanceRequest::findOrFail($id);

        if ($cashAdvanceRequest->status !== 'pending') {
            return response()->json([
                'message' => 'This request has already been processed',
            ], 400);
        }

        // Set collection date - default to 2 business days from now if not provided
        $collectionDate = $request->collection_date 
            ? Carbon::parse($request->collection_date)
            : $this->calculateCollectionDate();

        // Prepare update data
        $updateData = [
            'status' => 'approved',
            'processed_by' => Auth::id(),
            'processed_at' => now(),
            'hr_remarks' => $request->hr_remarks,
            'collection_date' => $collectionDate,
        ];

        // Update amounts if provided
        if ($request->has('amount_ca')) {
            $updateData['amount_ca'] = $request->amount_ca;
        }
        if ($request->has('rem_ca')) {
            $updateData['rem_ca'] = $request->rem_ca;
        }

        // Set initial remaining balance when approving
        $finalAmount = $updateData['amount_ca'] ?? $cashAdvanceRequest->amount_ca;
        $updateData['remaining_balance'] = $finalAmount;

        $cashAdvanceRequest->update($updateData);

        // Send notification to the employee
        $cashAdvanceRequest->load(['user', 'processedBy']);
        
        try {
            $cashAdvanceRequest->user->notify(new CashAdvanceStatusChanged($cashAdvanceRequest));
            Log::info('Cash advance approval notification sent', [
                'user_id' => $cashAdvanceRequest->user->id,
                'request_id' => $cashAdvanceRequest->id,
                'status' => 'approved'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send cash advance approval notification', [
                'user_id' => $cashAdvanceRequest->user->id,
                'request_id' => $cashAdvanceRequest->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'message' => 'Cash advance request approved successfully',
            'data' => $cashAdvanceRequest,
        ]);
    }

    /**
     * Reject a cash advance request
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'hr_remarks' => 'required|string|max:1000',
            'amount_ca' => 'nullable|numeric|min:0.01|max:999999.99',
            'rem_ca' => 'nullable|string|max:255',
        ]);

        $cashAdvanceRequest = CashAdvanceRequest::findOrFail($id);

        if ($cashAdvanceRequest->status !== 'pending') {
            return response()->json([
                'message' => 'This request has already been processed',
            ], 400);
        }

        // Prepare update data
        $updateData = [
            'status' => 'rejected',
            'processed_by' => Auth::id(),
            'processed_at' => now(),
            'hr_remarks' => $request->hr_remarks,
        ];

        // Update amounts if provided
        if ($request->has('amount_ca')) {
            $updateData['amount_ca'] = $request->amount_ca;
        }
        if ($request->has('rem_ca')) {
            $updateData['rem_ca'] = $request->rem_ca;
        }

        $cashAdvanceRequest->update($updateData);

        // Send notification to the employee
        $cashAdvanceRequest->load(['user', 'processedBy']);
        
        try {
            $cashAdvanceRequest->user->notify(new CashAdvanceStatusChanged($cashAdvanceRequest));
            Log::info('Cash advance rejection notification sent', [
                'user_id' => $cashAdvanceRequest->user->id,
                'request_id' => $cashAdvanceRequest->id,
                'status' => 'rejected'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send cash advance rejection notification', [
                'user_id' => $cashAdvanceRequest->user->id,
                'request_id' => $cashAdvanceRequest->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'message' => 'Cash advance request rejected successfully',
            'data' => $cashAdvanceRequest,
        ]);
    }

    /**
     * Get cash advance requests for the authenticated user
     */
    public function userRequests()
    {
        $cashAdvanceRequests = CashAdvanceRequest::where('user_id', Auth::id())
            ->with('processedBy')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($cashAdvanceRequests);
    }

    /**
     * Get cash advance statistics for the authenticated user
     */
    public function userStats()
    {
        $userId = Auth::id();
        
        $stats = [
            'total_amount_approved' => CashAdvanceRequest::where('user_id', $userId)
                ->where('status', 'approved')
                ->sum('amount_ca'),
            'total_requests' => CashAdvanceRequest::where('user_id', $userId)->count(),
            'pending_requests' => CashAdvanceRequest::where('user_id', $userId)
                ->where('status', 'pending')
                ->count(),
            'approved_requests' => CashAdvanceRequest::where('user_id', $userId)
                ->where('status', 'approved')
                ->count(),
            'rejected_requests' => CashAdvanceRequest::where('user_id', $userId)
                ->where('status', 'rejected')
                ->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Get statistics for dashboard
     */
    public function stats()
    {
        // Fast stats with single query where possible
        $stats = [
            'total_requests' => CashAdvanceRequest::count(),
            'pending_requests' => CashAdvanceRequest::where('status', 'pending')->count(),
            'approved_requests' => CashAdvanceRequest::where('status', 'approved')->count(),
            'rejected_requests' => CashAdvanceRequest::where('status', 'rejected')->count(),
            'total_amount_requested' => CashAdvanceRequest::sum('amount_ca'),
            'total_amount_approved' => CashAdvanceRequest::where('status', 'approved')->sum('amount_ca'),
            // Minimal recent requests for speed
            'recent_requests' => CashAdvanceRequest::select('id', 'name', 'amount_ca', 'status', 'created_at')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get(),
        ];

        return response()->json($stats);
    }

    /**
     * Calculate collection date (2 business days from now)
     */
    private function calculateCollectionDate()
    {
        $date = Carbon::now();
        $businessDays = 0;
        
        while ($businessDays < 2) {
            $date->addDay();
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (!in_array($date->dayOfWeek, [0, 6])) {
                $businessDays++;
            }
        }
        
        return $date;
    }

    /**
     * Download cash advance form as PDF
     */
    public function downloadPDF($id)
    {
        $cashAdvanceRequest = CashAdvanceRequest::with(['user', 'processedBy'])
            ->findOrFail($id);

        // Check if user can access this request (either owner or HR)
        
        $user = Auth::user();
        if ($user) {
           $user = \App\Models\User::with('role')->find(Auth::id()); // Load role relationship
        }
        
        if (!$user || ($cashAdvanceRequest->user_id !== $user->id && !$this->isHRUser($user))) {
            return response()->json(['message' => 'Unauthorized access'], 403);
        }

        $pdf = Pdf::loadView('pdf.cash-advance-form', [
            'request' => $cashAdvanceRequest,
            'generatedAt' => now()
        ]);

        $filename = "cash-advance-{$cashAdvanceRequest->id}-{$cashAdvanceRequest->name}.pdf";
        
        return $pdf->download($filename);
    }

    /**
     * Check if user has HR role
     */
    private function isHRUser($user)
    {
        // Check role through relationship
        if (!$user->role) {
            return false;
        }
        
        $roleName = $user->role->name;
        return in_array($roleName, ['hr', 'hr_assistant', 'admin']);
    }
}
