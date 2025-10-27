<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OvertimeRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class OvertimeRequestController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        $user = Auth::user();
        $query = OvertimeRequest::with(['user', 'reviewer']);
        
        // If user is not an admin, only show their own requests
        if (!$user->hasRole('admin')) {
            $query->where('user_id', $user->id);
        }
        
        $overtimeRequests = $query->latest()->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $overtimeRequests
        ]);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
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
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $overtimeRequest = OvertimeRequest::create([
            'user_id' => Auth::id(),
            'date' => $request->date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'reason' => $request->reason,
            'status' => 'pending'
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Overtime request submitted successfully',
            'data' => $overtimeRequest->load('user')
        ], 201);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $overtimeRequest = OvertimeRequest::with(['user', 'reviewer'])->findOrFail($id);
        
        // Check if user is authorized to view this request
        $user = Auth::user();
        if (!$user->hasRole('admin') && $overtimeRequest->user_id !== $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized access to this overtime request'
            ], 403);
        }
        
        return response()->json([
            'status' => 'success',
            'data' => $overtimeRequest
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $overtimeRequest = OvertimeRequest::findOrFail($id);
        $user = Auth::user();
        
        // Only admin can update the status
        if ($user->hasRole('admin')) {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:approved,rejected',
                'admin_notes' => 'nullable|string|max:1000'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $overtimeRequest->update([
                'status' => $request->status,
                'admin_notes' => $request->admin_notes,
                'reviewed_by' => $user->id,
                'reviewed_at' => now()
            ]);
        } else {
            // Regular users can only update their own pending requests
            if ($overtimeRequest->user_id !== $user->id || $overtimeRequest->status !== 'pending') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'You can only update your own pending requests'
                ], 403);
            }
            
            $validator = Validator::make($request->all(), [
                'date' => 'required|date',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
                'reason' => 'required|string|max:1000',
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $overtimeRequest->update($request->only(['date', 'start_time', 'end_time', 'reason']));
        }
        
        return response()->json([
            'status' => 'success',
            'message' => 'Overtime request updated successfully',
            'data' => $overtimeRequest->fresh(['user', 'reviewer'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $overtimeRequest = OvertimeRequest::findOrFail($id);
        $user = Auth::user();
        
        // Only the owner or admin can delete
        if ($overtimeRequest->user_id !== $user->id && !$user->hasRole('admin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'You are not authorized to delete this request'
            ], 403);
        }
        
        // Only pending requests can be deleted
        if ($overtimeRequest->status !== 'pending' && !$user->hasRole('admin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Only pending requests can be deleted'
            ], 403);
        }
        
        $overtimeRequest->delete();
        
        return response()->json([
            'status' => 'success',
            'message' => 'Overtime request deleted successfully'
        ]);
    }
}
