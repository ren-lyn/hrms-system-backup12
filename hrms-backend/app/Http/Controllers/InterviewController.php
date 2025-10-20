<?php

namespace App\Http\Controllers;

use App\Models\Interview;
use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class InterviewController extends Controller
{
    /**
     * Store a newly created interview
     */
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('InterviewController: Creating new interview', $request->all());
            
            // Validate request data
            $validatedData = $request->validate([
                'application_id' => 'required|exists:applications,id',
                'interview_date' => 'required|date|after_or_equal:today',
                'interview_time' => 'required|date_format:H:i',
                'interview_type' => 'required|in:in-person,video,phone',
                'location' => 'required|string|max:255',
                'interviewer' => 'required|string|max:255',
                'notes' => 'nullable|string|max:1000',
                'status' => 'nullable|in:scheduled,completed,cancelled,rescheduled'
            ]);

            // Verify that the application exists and is ShortListed
            $application = Application::where('id', $validatedData['application_id'])
                ->where('status', 'ShortListed')
                ->first();
                
            if (!$application) {
                return response()->json([
                    'error' => 'Application not found or not ShortListed',
                    'message' => 'Only ShortListed applicants can have interviews scheduled'
                ], 404);
            }

            // Create interview
            $interview = Interview::create([
                'application_id' => $validatedData['application_id'],
                'interview_date' => $validatedData['interview_date'],
                'interview_time' => $validatedData['interview_time'],
                'interview_type' => $validatedData['interview_type'],
                'location' => $validatedData['location'],
                'interviewer' => $validatedData['interviewer'],
                'notes' => $validatedData['notes'] ?? '',
                'status' => $validatedData['status'] ?? 'scheduled'
            ]);

            Log::info('InterviewController: Interview created successfully', [
                'interview_id' => $interview->id,
                'application_id' => $interview->application_id,
                'interview_date' => $interview->interview_date,
                'interviewer' => $interview->interviewer
            ]);

            // Load the interview with application data
            $interview->load('application.jobPosting', 'application.applicant');

            return response()->json([
                'message' => 'Interview scheduled successfully',
                'interview' => $interview
            ], 201);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error creating interview', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to create interview',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all interviews
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Interview::with(['application.jobPosting', 'application.applicant']);
            
            // Filter by status if provided
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            
            // Filter by date range if provided
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->byDateRange($request->start_date, $request->end_date);
            }
            
            // Filter by upcoming interviews
            if ($request->has('upcoming') && $request->upcoming) {
                $query->upcoming();
            }
            
            $interviews = $query->orderBy('interview_date', 'asc')
                              ->orderBy('interview_time', 'asc')
                              ->get();

            return response()->json($interviews, 200);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error fetching interviews', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch interviews',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a specific interview
     */
    public function show($id): JsonResponse
    {
        try {
            $interview = Interview::with(['application.jobPosting', 'application.applicant'])
                                 ->findOrFail($id);

            return response()->json($interview, 200);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error fetching interview', [
                'interview_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Interview not found',
                'message' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update interview details
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            Log::info("InterviewController: Updating interview ID: {$id}", $request->all());
            
            $interview = Interview::findOrFail($id);
            
            // Validate request data
            $validatedData = $request->validate([
                'interview_date' => 'nullable|date|after_or_equal:today',
                'interview_time' => 'nullable|date_format:H:i',
                'interview_type' => 'nullable|in:in-person,video,phone',
                'location' => 'nullable|string|max:255',
                'interviewer' => 'nullable|string|max:255',
                'notes' => 'nullable|string|max:1000',
                'status' => 'nullable|in:scheduled,completed,cancelled,rescheduled',
                'feedback' => 'nullable|string|max:2000',
                'result' => 'nullable|in:passed,failed,pending'
            ]);

            // Update interview
            $interview->update($validatedData);

            Log::info("InterviewController: Interview updated successfully", [
                'interview_id' => $interview->id,
                'updated_fields' => array_keys($validatedData)
            ]);

            // Load the interview with application data
            $interview->load('application.jobPosting', 'application.applicant');

            return response()->json([
                'message' => 'Interview updated successfully',
                'interview' => $interview
            ], 200);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error updating interview', [
                'interview_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to update interview',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an interview
     */
    public function destroy($id): JsonResponse
    {
        try {
            $interview = Interview::findOrFail($id);
            $interview->delete();

            Log::info("InterviewController: Interview deleted successfully", [
                'interview_id' => $id
            ]);

            return response()->json([
                'message' => 'Interview deleted successfully'
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error deleting interview', [
                'interview_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'error' => 'Failed to delete interview',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}