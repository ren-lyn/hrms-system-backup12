<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\OTRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class OTRequestController extends Controller
{
    // Employee endpoints
    
    /**
     * Get all OT requests for the authenticated employee
     */
    public function index()
    {
        $otRequests = OTRequest::with(['user' => function($query) {
                $query->select('id', 'name', 'email');
            }])
            ->where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($otRequests);
    }

    /**
     * Store a new OT request
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Calculate duration in hours
        $start = \Carbon\Carbon::parse($request->start_time);
        $end = \Carbon\Carbon::parse($request->end_time);
        $duration = $end->diffInMinutes($start) / 60; // Convert minutes to hours

        $otRequest = OTRequest::create([
            'user_id' => Auth::id(),
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'duration' => $duration,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        // Load user relationship for the response
        $otRequest->load(['user' => function($query) {
            $query->select('id', 'name', 'email');
        }]);

        return response()->json($otRequest, 201);
    }

    // HR Assistant/Admin endpoints
    
    /**
     * Get all OT requests (for HR/Admin)
     */
    public function getAllRequests(Request $request)
    {
        $query = OTRequest::with(['user' => function($query) {
                $query->select('id', 'name', 'email', 'employee_id');
            }])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->has('status') && in_array($request->status, ['pending', 'approved', 'rejected'])) {
            $query->where('status', $request->status);
        }

        if ($request->has('employee_id')) {
            $query->whereHas('user', function($q) use ($request) {
                $q->where('employee_id', 'like', '%' . $request->employee_id . '%');
            });
        }

        if ($request->has('employee_name')) {
            $query->whereHas('user', function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->employee_name . '%');
            });
        }

        if ($request->has('date')) {
            $query->whereDate('date', $request->date);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        // Pagination
        $perPage = $request->input('per_page', 10);
        $otRequests = $query->paginate($perPage);

        return response()->json($otRequests);
    }

    /**
     * Update OT request status (approve/reject)
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'rejection_reason' => 'required_if:status,rejected|string|max:1000|nullable',
        ]);

        $otRequest = OTRequest::findOrFail($id);
        
        // Check if already processed
        if ($otRequest->status !== 'pending') {
            return response()->json([
                'message' => 'This request has already been processed.'
            ], 400);
        }

        $otRequest->update([
            'status' => $request->status,
            'rejection_reason' => $request->rejection_reason,
            'action_by' => Auth::id(),
            'action_at' => now(),
        ]);

        // Load relationships for the response
        $otRequest->load(['user' => function($query) {
            $query->select('id', 'name', 'email');
        }, 'actionBy' => function($query) {
            $query->select('id', 'name');
        }]);

        // Here you can add notification logic (email, in-app, etc.)
        // e.g., $otRequest->user->notify(new OTRequestProcessed($otRequest));

        return response()->json([
            'message' => 'OT request ' . $request->status . ' successfully',
            'data' => $otRequest
        ]);
    }

    /**
     * Get OT request statistics
     */
    public function getStatistics()
    {
        $total = OTRequest::count();
        $pending = OTRequest::where('status', 'pending')->count();
        $approved = OTRequest::where('status', 'approved')->count();
        $rejected = OTRequest::where('status', 'rejected')->count();

        return response()->json([
            'total' => $total,
            'pending' => $pending,
            'approved' => $approved,
            'rejected' => $rejected,
        ]);
    }
}
