<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\OvertimeRequest;
use App\Models\EmployeeProfile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Exception;

class ManagerController extends Controller
{
    /**
     * Get attendance records for all employees (Manager view-only)
     */
    public function getAttendanceRecords(Request $request): JsonResponse
    {
        try {
            $query = Attendance::with('employee:id,employee_id,first_name,last_name,position');

            // Date range filter
            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('date', [$request->date_from, $request->date_to]);
            }

            // Status filter
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            $records = $query->orderBy('date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $records
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get OT requests for manager review
     */
    public function getOTRequests(Request $request): JsonResponse
    {
        try {
            $query = OvertimeRequest::with([
                'employee:id,employee_id,first_name,last_name,position',
                'user:id,first_name,last_name',
                'managerReviewer:id,first_name,last_name',
                'hrReviewer:id,first_name,last_name'
            ]);

            // Filter by status
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $requests = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $requests
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch OT requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve OT request (Manager approval)
     */
    public function approveOTRequest($id): JsonResponse
    {
        try {
            $otRequest = OvertimeRequest::findOrFail($id);

            if ($otRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This request has already been processed'
                ], 400);
            }

            $otRequest->update([
                'status' => 'manager_approved',
                'manager_reviewed_by' => Auth::id(),
                'manager_reviewed_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'OT request approved successfully. Forwarded to HR for final approval.',
                'data' => $otRequest->load(['employee', 'managerReviewer'])
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve OT request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject OT request (Manager rejection)
     */
    public function rejectOTRequest($id, Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $otRequest = OvertimeRequest::findOrFail($id);

            if ($otRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This request has already been processed'
                ], 400);
            }

            $otRequest->update([
                'status' => 'rejected',
                'rejection_reason' => $request->rejection_reason,
                'manager_reviewed_by' => Auth::id(),
                'manager_reviewed_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'OT request rejected successfully',
                'data' => $otRequest->load(['employee', 'managerReviewer'])
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject OT request',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
