<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OvertimeRequest;
use App\Models\Attendance;
use App\Models\EmployeeProfile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Exception;

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
        $query = OvertimeRequest::with(['user', 'employee', 'managerReviewer', 'hrReviewer']);
        
        // If user is not an admin or manager, only show their own requests
        if ($user->role !== 'Admin' && $user->role !== 'Manager' && $user->role !== 'HR Assistant') {
            $query->where('user_id', $user->id);
        }
        
        $overtimeRequests = $query->latest()->get();
        
        return response()->json([
            'success' => true,
            'data' => $overtimeRequests
        ]);
    }

    /**
     * Validate OT hours against attendance record
     */
    public function validateHours(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'ot_date' => 'required|date',
                'ot_hours' => 'required|integer|min:1|max:12'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();

            if (!$employeeProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found'
                ], 404);
            }

            // Get attendance record for the date
            $attendance = Attendance::where('employee_id', $employeeProfile->id)
                ->where('date', $request->ot_date)
                ->first();

            if (!$attendance) {
                \Log::info('No attendance found', [
                    'employee_id' => $employeeProfile->id,
                    'requested_date' => $request->ot_date,
                    'employee_name' => $employeeProfile->first_name . ' ' . $employeeProfile->last_name
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'No attendance record found for this date. Please ensure you have clocked in/out on this date.'
                ], 404);
            }

            \Log::info('Attendance found for OT validation', [
                'employee_id' => $employeeProfile->id,
                'date' => $attendance->date,
                'clock_in' => $attendance->clock_in,
                'clock_out' => $attendance->clock_out,
                'requested_date' => $request->ot_date
            ]);

            // Calculate actual OT hours from attendance
            // OT starts at 6 PM (18:00) - one hour after the 5 PM shift ends
            // Any time worked after 6 PM counts as 1 hour, then rounds up
            $actualOTHours = 0;
            
            if ($attendance->clock_out) {
                // Extract only the TIME portion from clock_out (in case it's stored as datetime)
                $clockOutTimeOnly = date('H:i:s', strtotime($attendance->clock_out));
                
                // Combine the OT date with the extracted time
                $clockOutTime = strtotime($request->ot_date . ' ' . $clockOutTimeOnly);
                $otStartTime = strtotime($request->ot_date . ' 18:00:00'); // 6 PM
                
                \Log::info('OT Calculation', [
                    'original_clock_out' => $attendance->clock_out,
                    'extracted_time' => $clockOutTimeOnly,
                    'clock_out_timestamp' => $clockOutTime,
                    'ot_start_timestamp' => $otStartTime,
                    'clock_out_readable' => date('Y-m-d H:i:s', $clockOutTime),
                    'ot_start_readable' => date('Y-m-d H:i:s', $otStartTime)
                ]);
                
                // If clocked out after 6 PM, calculate OT hours
                if ($clockOutTime > $otStartTime) {
                    $secondsWorked = $clockOutTime - $otStartTime;
                    $hoursWorked = $secondsWorked / 3600;
                    
                    // Round UP to full hours (any time after 6 PM = at least 1 hour)
                    // Example: 6:25 PM = 1 hour, 7:15 PM = 2 hours, 8:01 PM = 3 hours
                    $actualOTHours = ceil($hoursWorked);
                    
                    \Log::info('OT Hours Calculated', [
                        'seconds_worked' => $secondsWorked,
                        'hours_worked' => $hoursWorked,
                        'actual_ot_hours' => $actualOTHours
                    ]);
                } else {
                    \Log::info('No OT - clocked out before 6 PM');
                }
            } else {
                \Log::info('No clock_out time in attendance record');
            }

            return response()->json([
                'success' => true,
                'actual_ot_hours' => $actualOTHours,
                'message' => $actualOTHours > 0 
                    ? "You have {$actualOTHours} hour(s) of overtime on this date" 
                    : "No overtime hours found for this date"
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to validate OT hours',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'ot_date' => 'required|date|before_or_equal:today',
                'ot_hours' => 'required|integer|min:1|max:12',
                'reason' => 'required|string|max:500',
                'images' => 'required|array|min:1|max:2',
                'images.*' => 'required|image|mimes:jpeg,jpg,png,gif|max:5120' // 5MB max per image
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            
            \Log::info('OT Request Store - User Info', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'user_email' => $user->email
            ]);
            
            $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();

            if (!$employeeProfile) {
                \Log::error('OT Request Store - Employee profile not found', ['user_id' => $user->id]);
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found'
                ], 404);
            }
            
            \Log::info('OT Request Store - Employee Profile Found', [
                'employee_id' => $employeeProfile->id,
                'employee_name' => $employeeProfile->first_name . ' ' . $employeeProfile->last_name
            ]);

            // Validate against attendance record
            $attendance = Attendance::where('employee_id', $employeeProfile->id)
                ->where('date', $request->ot_date)
                ->first();

            if (!$attendance) {
                return response()->json([
                    'success' => false,
                    'message' => 'No attendance record found for this date'
                ], 404);
            }

            // Calculate actual OT hours
            // OT starts at 6 PM (18:00) - one hour after the 5 PM shift ends
            // Any time worked after 6 PM counts as 1 hour, then rounds up
            $actualOTHours = 0;
            
            if ($attendance->clock_out) {
                // Extract only the TIME portion from clock_out (in case it's stored as datetime)
                $clockOutTimeOnly = date('H:i:s', strtotime($attendance->clock_out));
                
                // Combine the OT date with the extracted time
                $clockOutTime = strtotime($request->ot_date . ' ' . $clockOutTimeOnly);
                $otStartTime = strtotime($request->ot_date . ' 18:00:00'); // 6 PM
                
                // If clocked out after 6 PM, calculate OT hours
                if ($clockOutTime > $otStartTime) {
                    $secondsWorked = $clockOutTime - $otStartTime;
                    $hoursWorked = $secondsWorked / 3600;
                    
                    // Round UP to full hours (any time after 6 PM = at least 1 hour)
                    // Example: 6:25 PM = 1 hour, 7:15 PM = 2 hours, 8:01 PM = 3 hours
                    $actualOTHours = ceil($hoursWorked);
                }
            }

            // Check if there's any OT to request
            if ($actualOTHours <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No overtime hours available for this date. You must clock out after 6 PM to earn overtime.'
                ], 422);
            }

            // Validate requested hours don't exceed actual
            if ($request->ot_hours > $actualOTHours) {
                return response()->json([
                    'success' => false,
                    'message' => "You can only request up to {$actualOTHours} hour(s) of overtime for this date"
                ], 422);
            }

            // Handle image uploads
            $imagePaths = [];
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $index => $image) {
                    $path = $image->store('ot_proofs', 'public');
                    $imagePaths[] = $path;
                }
            }

            // Check for duplicate request
            $existingRequest = OvertimeRequest::where('employee_id', $employeeProfile->id)
                ->where('ot_date', $request->ot_date)
                ->where('status', 'pending')
                ->first();

            if ($existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a pending OT request for this date'
                ], 409);
            }

            $dataToCreate = [
                'user_id' => $user->id,
                'employee_id' => $employeeProfile->id,
                'ot_date' => $request->ot_date,
                'ot_hours' => $request->ot_hours,
                'reason' => $request->reason,
                'proof_images' => $imagePaths,
                'status' => 'pending'
            ];
            
            \Log::info('OT Request Store - About to create', $dataToCreate);

            $overtimeRequest = OvertimeRequest::create($dataToCreate);

            return response()->json([
                'success' => true,
                'message' => 'Overtime request submitted successfully',
                'data' => $overtimeRequest->load(['user', 'employee'])
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit OT request',
                'error' => $e->getMessage()
            ], 500);
        }
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
        if ($user->role !== 'Admin' && $overtimeRequest->user_id !== $user->id) {
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
        if ($user->role === 'Admin') {
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
        if ($overtimeRequest->user_id !== $user->id && $user->role !== 'Admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'You are not authorized to delete this request'
            ], 403);
        }
        
        // Only pending requests can be deleted
        if ($overtimeRequest->status !== 'pending' && $user->role !== 'Admin') {
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
