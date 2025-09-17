<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CashAdvanceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class CashAdvanceController extends Controller
{
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

        return response()->json([
            'data' => $cashAdvanceRequest,
        ]);
    }

    /**
     * Approve a cash advance request
     */
    public function approve(Request $request, $id)
    {
        $request->validate([
            'hr_remarks' => 'nullable|string|max:1000',
        ]);

        $cashAdvanceRequest = CashAdvanceRequest::findOrFail($id);

        if ($cashAdvanceRequest->status !== 'pending') {
            return response()->json([
                'message' => 'This request has already been processed',
            ], 400);
        }

        $cashAdvanceRequest->update([
            'status' => 'approved',
            'processed_by' => Auth::id(),
            'processed_at' => now(),
            'hr_remarks' => $request->hr_remarks,
        ]);

        return response()->json([
            'message' => 'Cash advance request approved successfully',
            'data' => $cashAdvanceRequest->load(['user', 'processedBy']),
        ]);
    }

    /**
     * Reject a cash advance request
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'hr_remarks' => 'required|string|max:1000',
        ]);

        $cashAdvanceRequest = CashAdvanceRequest::findOrFail($id);

        if ($cashAdvanceRequest->status !== 'pending') {
            return response()->json([
                'message' => 'This request has already been processed',
            ], 400);
        }

        $cashAdvanceRequest->update([
            'status' => 'rejected',
            'processed_by' => Auth::id(),
            'processed_at' => now(),
            'hr_remarks' => $request->hr_remarks,
        ]);

        return response()->json([
            'message' => 'Cash advance request rejected successfully',
            'data' => $cashAdvanceRequest->load(['user', 'processedBy']),
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
}
