<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Interview;
use App\Models\Application;
use App\Models\User;
use App\Notifications\InterviewScheduled;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Carbon\Carbon;

class InterviewController extends Controller
{
    /**
     * Store a newly created interview
     * This is called when HR schedules an interview for an applicant
     */
    public function store(Request $request): JsonResponse
    {
        try {
            Log::info('InterviewController: Creating new interview', $request->all());
            
            // Step 1: Validate request data
            $validatedData = $request->validate([
                'application_id' => 'required|exists:applications,id',
                'interview_date' => 'required|date|after_or_equal:today',
                'interview_time' => 'required|date_format:H:i',
                'duration' => 'nullable|integer|min:15|max:480', // 15 minutes to 8 hours
                'interview_type' => 'required|in:in-person,video,phone,online',
                'location' => 'required|string|max:255',
                'interviewer' => 'required|string|max:255',
                'notes' => 'nullable|string|max:1000',
                'status' => 'nullable|in:scheduled,completed,cancelled,rescheduled'
            ]);

            // Step 2: Verify application exists and get application data
            $application = Application::with(['applicant', 'jobPosting'])->find($validatedData['application_id']);
                
            if (!$application) {
                return response()->json([
                    'error' => 'Application not found',
                    'message' => 'The specified application does not exist'
                ], 404);
            }

            // Step 3: Check application status - only allow ShortListed applications
            if ($application->status !== 'ShortListed') {
                return response()->json([
                    'error' => 'Invalid application status',
                    'message' => 'Interviews can only be scheduled for applications with status: ShortListed. Current status: ' . $application->status
                ], 400);
            }

            // Step 4: Create and save interview
            $interview = Interview::create([
                'application_id' => $validatedData['application_id'],
                'interview_date' => $validatedData['interview_date'],
                'interview_time' => $validatedData['interview_time'],
                'duration' => $validatedData['duration'] ?? 30,
                'interview_type' => $validatedData['interview_type'],
                'location' => $validatedData['location'],
                'interviewer' => $validatedData['interviewer'],
                'notes' => $validatedData['notes'] ?? '',
                'status' => $validatedData['status'] ?? 'scheduled'
            ]);

            // Step 5: Update application status to "On going Interview"
            $application->update(['status' => 'On going Interview']);

            // Step 6: Load interview with related data
            $interview->load('application.jobPosting', 'application.applicant');

            // Step 7: Send notification to applicant
            $this->sendInterviewNotification($interview, $application);

            Log::info('InterviewController: Interview created and notification sent', [
                'interview_id' => $interview->id,
                'application_id' => $interview->application_id,
                'applicant_id' => $application->applicant_id,
                'interview_date' => $interview->interview_date,
                'interviewer' => $interview->interviewer
            ]);

            return response()->json([
                'message' => 'Interview scheduled successfully',
                'interview' => $interview,
                'application' => $application
            ], 201);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('InterviewController: Validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
                'message' => 'Please check the form data and try again'
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error creating interview', [
                'error' => $e->getMessage(),
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to create interview',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send interview notification to applicant
     */
    private function sendInterviewNotification(Interview $interview, Application $application): void
    {
        try {
            // Get the applicant user
            $applicant = User::find($application->applicant_id);
            
            if (!$applicant) {
                Log::warning('InterviewController: Applicant not found for notification', [
                    'applicant_id' => $application->applicant_id,
                    'interview_id' => $interview->id
                ]);
                return;
            }

            // Send notification using Laravel's notification system
            $applicant->notify(new InterviewScheduled($interview, $application));

            Log::info('InterviewController: Interview notification sent successfully', [
                'applicant_id' => $application->applicant_id,
                'applicant_email' => $applicant->email,
                'interview_id' => $interview->id,
                'interview_date' => $interview->interview_date
            ]);

        } catch (\Exception $e) {
            Log::error('InterviewController: Error sending interview notification', [
                'error' => $e->getMessage(),
                'interview_id' => $interview->id,
                'applicant_id' => $application->applicant_id,
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Get all interviews
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Interview::with(['application.jobPosting', 'application.applicant']);
            
            // Filter by application_id if provided
            if ($request->has('application_id')) {
                $query->where('application_id', $request->application_id);
            }
            
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
     * Get interviews for a specific user (applicant) by application IDs
     */
    public function getUserInterviews(Request $request): JsonResponse
    {
        try {
            Log::info('InterviewController: Getting user interviews', $request->all());
            
            $query = Interview::with(['application.jobPosting', 'application.applicant']);
            
            // Get user's application IDs from the request
            $userApplications = $request->get('application_ids', []);
            
            // Handle both array and comma-separated string formats
            if (is_string($userApplications)) {
                $userApplications = explode(',', $userApplications);
            }
            
            // Convert to integers and filter out invalid values
            $userApplications = array_filter(array_map('intval', $userApplications), function($id) {
                return $id > 0;
            });
            
            Log::info('InterviewController: Application IDs to search for:', $userApplications);
            
            if (empty($userApplications)) {
                Log::info('InterviewController: No valid application IDs provided, returning empty array');
                return response()->json([], 200);
            }
            
            $query->whereIn('application_id', $userApplications);
            
            // Filter by status if provided
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            
            // Filter by upcoming interviews
            if ($request->has('upcoming') && $request->upcoming) {
                $query->upcoming();
            }
            
            $interviews = $query->orderBy('interview_date', 'asc')
                              ->orderBy('interview_time', 'asc')
                              ->get();

            // Transform the data for better frontend consumption
            $transformedInterviews = $interviews->map(function ($interview) {
                return [
                    'id' => $interview->id,
                    'application_id' => $interview->application_id,
                    'interview_date' => $interview->interview_date,
                    'interview_time' => $interview->interview_time,
                    'duration' => $interview->duration,
                    'interview_type' => $interview->interview_type,
                    'location' => $interview->location,
                    'interviewer' => $interview->interviewer,
                    'notes' => $interview->notes,
                    'status' => $interview->status,
                    'feedback' => $interview->feedback,
                    'result' => $interview->result,
                    'created_at' => $interview->created_at,
                    'updated_at' => $interview->updated_at,
                    'application' => [
                        'id' => $interview->application->id,
                        'status' => $interview->application->status,
                        'applied_at' => $interview->application->applied_at,
                        'job_posting' => $interview->application->jobPosting ? [
                            'id' => $interview->application->jobPosting->id,
                            'title' => $interview->application->jobPosting->title,
                            'department' => $interview->application->jobPosting->department,
                            'position' => $interview->application->jobPosting->position,
                        ] : null,
                        'applicant' => $interview->application->applicant ? [
                            'id' => $interview->application->applicant->id,
                            'name' => $interview->application->applicant->name,
                            'email' => $interview->application->applicant->email,
                        ] : null,
                    ]
                ];
            });

            Log::info('InterviewController: Found interviews', [
                'count' => $interviews->count(),
                'interview_ids' => $interviews->pluck('id')->toArray()
            ]);

            return response()->json($transformedInterviews, 200);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error fetching user interviews', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch user interviews',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get interviews for a specific user by user ID
     */
    public function getUserInterviewsByUserId(Request $request): JsonResponse
    {
        try {
            Log::info('InterviewController: Getting user interviews by user ID', $request->all());
            
            $userId = $request->get('user_id');
            
            if (!$userId) {
                return response()->json([
                    'error' => 'User ID is required'
                ], 400);
            }
            
            // Verify user exists
            $user = User::find($userId);
            if (!$user) {
                return response()->json([
                    'error' => 'User not found'
                ], 404);
            }
            
            // Get all applications for this user
            $applications = Application::where('applicant_id', $userId)->pluck('id');
            
            if ($applications->isEmpty()) {
                Log::info('InterviewController: No applications found for user', ['user_id' => $userId]);
                return response()->json([], 200);
            }
            
            // Get interviews for these applications with proper relationships
            $interviews = Interview::with([
                'application.jobPosting', 
                'application.applicant'
            ])
            ->whereIn('application_id', $applications)
            ->orderBy('interview_date', 'asc')
            ->orderBy('interview_time', 'asc')
            ->get();

            // Transform the data for better frontend consumption
            $transformedInterviews = $interviews->map(function ($interview) {
                return [
                    'id' => $interview->id,
                    'application_id' => $interview->application_id,
                    'interview_date' => $interview->interview_date,
                    'interview_time' => $interview->interview_time,
                    'duration' => $interview->duration,
                    'interview_type' => $interview->interview_type,
                    'location' => $interview->location,
                    'interviewer' => $interview->interviewer,
                    'notes' => $interview->notes,
                    'status' => $interview->status,
                    'feedback' => $interview->feedback,
                    'result' => $interview->result,
                    'created_at' => $interview->created_at,
                    'updated_at' => $interview->updated_at,
                    'application' => [
                        'id' => $interview->application->id,
                        'status' => $interview->application->status,
                        'applied_at' => $interview->application->applied_at,
                        'job_posting' => $interview->application->jobPosting ? [
                            'id' => $interview->application->jobPosting->id,
                            'title' => $interview->application->jobPosting->title,
                            'department' => $interview->application->jobPosting->department,
                            'position' => $interview->application->jobPosting->position,
                        ] : null,
                        'applicant' => $interview->application->applicant ? [
                            'id' => $interview->application->applicant->id,
                            'name' => $interview->application->applicant->name,
                            'email' => $interview->application->applicant->email,
                        ] : null,
                    ]
                ];
            });

            Log::info('InterviewController: Found interviews for user', [
                'user_id' => $userId,
                'count' => $interviews->count(),
                'interview_ids' => $interviews->pluck('id')->toArray()
            ]);

            return response()->json($transformedInterviews, 200);
            
        } catch (\Exception $e) {
            Log::error('InterviewController: Error fetching user interviews by user ID', [
                'error' => $e->getMessage(),
                'user_id' => $request->get('user_id'),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch user interviews',
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
                'duration' => 'nullable|integer|min:15|max:480',
                'interview_type' => 'nullable|in:in-person,video,phone,online',
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

    /**
     * Test notification system (for debugging)
     */
    public function testNotification(Request $request): JsonResponse
    {
        try {
            $userId = $request->get('user_id');
            
            if (!$userId) {
                return response()->json(['error' => 'User ID is required'], 400);
            }
            
            $user = User::find($userId);
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }
            
            // Create a test interview and application
            $testInterview = (object) [
                'id' => 999,
                'interview_date' => '2024-12-25',
                'interview_time' => '10:00:00',
                'duration' => 30,
                'interview_type' => 'in-person',
                'location' => 'Test Location',
                'interviewer' => 'Test Interviewer',
                'notes' => 'Test interview notification'
            ];
            
            $testApplication = (object) [
                'id' => 999,
                'applicant_id' => $userId,
                'jobPosting' => (object) [
                    'title' => 'Test Position',
                    'department' => 'Test Department',
                    'position' => 'Test Role'
                ]
            ];
            
            // Send test notification
            $user->notify(new InterviewScheduled($testInterview, $testApplication));
            
            return response()->json([
                'message' => 'Test notification sent successfully',
                'user_id' => $userId,
                'user_email' => $user->email
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to send test notification',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
