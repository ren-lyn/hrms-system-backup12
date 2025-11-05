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
use Illuminate\Support\Facades\Schema;
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
     * Only returns interviews for applications belonging to the authenticated user
     */
    public function getUserInterviews(Request $request): JsonResponse
    {
        try {
            // Get authenticated user
            $authenticatedUser = $request->user();
            
            if (!$authenticatedUser) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Authentication required'
                ], 401);
            }
            
            Log::info('InterviewController: Getting user interviews', [
                'authenticated_user_id' => $authenticatedUser->id,
                'request_data' => $request->all()
            ]);
            
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
            
            // Security: Verify that all requested application IDs belong to the authenticated user
            // Allow HR staff/assistants to access any application's interviews
            $userRole = $authenticatedUser->role->name ?? '';
            $isHRStaff = in_array($userRole, ['HR Staff', 'HR Assistant']);
            
            if (!$isHRStaff) {
                // For applicants, verify ownership of applications
                $userOwnedApplications = Application::where('applicant_id', $authenticatedUser->id)
                    ->whereIn('id', $userApplications)
                    ->pluck('id')
                    ->toArray();
                
                if (count($userOwnedApplications) !== count($userApplications)) {
                    Log::warning('InterviewController: Unauthorized access attempt to applications', [
                        'authenticated_user_id' => $authenticatedUser->id,
                        'requested_application_ids' => $userApplications,
                        'owned_application_ids' => $userOwnedApplications
                    ]);
                    
                    return response()->json([
                        'error' => 'Forbidden',
                        'message' => 'You can only access interviews for your own applications'
                    ], 403);
                }
                
                // Only query for user-owned applications
                $query->whereIn('application_id', $userOwnedApplications);
            } else {
                // HR staff can access any application
                $query->whereIn('application_id', $userApplications);
            }
            
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
            $hasEndTimeColumn = Schema::hasColumn('interviews', 'end_time');
            $hasApplicantUserIdColumn = Schema::hasColumn('interviews', 'applicant_user_id');
            
            $transformedInterviews = $interviews->map(function ($interview) use ($hasEndTimeColumn, $hasApplicantUserIdColumn) {
                $transformed = [
                    'id' => $interview->id,
                    'application_id' => $interview->application_id,
                    // Ensure interview_date is returned as YYYY-MM-DD string format (as received from HR)
                    'interview_date' => $interview->interview_date instanceof \Carbon\Carbon 
                        ? $interview->interview_date->format('Y-m-d')
                        : (is_string($interview->interview_date) ? $interview->interview_date : $interview->interview_date),
                    // Ensure interview_time is returned as HH:MM string format (as received from HR)
                    'interview_time' => is_string($interview->interview_time) 
                        ? $interview->interview_time 
                        : (isset($interview->interview_time) ? date('H:i', strtotime($interview->interview_time)) : null),
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
                
                // Add end_time only if column exists
                // Ensure end_time is returned as HH:MM string format (as received from HR)
                if ($hasEndTimeColumn) {
                    $transformed['end_time'] = is_string($interview->end_time) 
                        ? $interview->end_time 
                        : (isset($interview->end_time) ? date('H:i', strtotime($interview->end_time)) : null);
                } else {
                    $transformed['end_time'] = null;
                }
                
                // Add applicant_user_id only if column exists
                if ($hasApplicantUserIdColumn) {
                    $transformed['applicant_user_id'] = $interview->applicant_user_id;
                }
                
                return $transformed;
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
     * Only the authenticated user can access their own interviews for privacy
     */
    public function getUserInterviewsByUserId(Request $request, $user_id = null): JsonResponse
    {
        try {
            // Get authenticated user
            $authenticatedUser = $request->user();
            
            if (!$authenticatedUser) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Authentication required'
                ], 401);
            }
            
            // Get user_id from route parameter or request
            $userId = $user_id ?? $request->get('user_id');
            
            if (!$userId) {
                return response()->json([
                    'error' => 'User ID is required'
                ], 400);
            }
            
            // Security: Ensure the authenticated user can only access their own interviews
            // Allow HR staff/assistants to access any user's interviews, but applicants can only see their own
            $userRole = $authenticatedUser->role->name ?? '';
            $isHRStaff = in_array($userRole, ['HR Staff', 'HR Assistant']);
            
            if (!$isHRStaff && $authenticatedUser->id != $userId) {
                Log::warning('InterviewController: Unauthorized access attempt', [
                    'authenticated_user_id' => $authenticatedUser->id,
                    'requested_user_id' => $userId,
                    'role' => $userRole
                ]);
                
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'You can only access your own interview information'
                ], 403);
            }
            
            Log::info('InterviewController: Getting user interviews by user ID', [
                'requested_user_id' => $userId,
                'authenticated_user_id' => $authenticatedUser->id,
                'role' => $userRole
            ]);
            
            // Verify user exists
            $user = User::find($userId);
            if (!$user) {
                return response()->json([
                    'error' => 'User not found'
                ], 404);
            }
            
            // Get interviews directly by applicant_user_id (more efficient and ensures privacy)
            // Check if applicant_user_id column exists (migration may not have run yet)
            $hasApplicantUserIdColumn = Schema::hasColumn('interviews', 'applicant_user_id');
            
            if ($hasApplicantUserIdColumn) {
                // Use applicant_user_id column if it exists
                $interviews = Interview::with([
                    'application.jobPosting', 
                    'application.applicant'
                ])
                ->where('applicant_user_id', $userId)
                ->orderBy('interview_date', 'asc')
                ->orderBy('interview_time', 'asc')
                ->get();
            } else {
                // Fallback: Find interviews through application relationship
                $userApplications = Application::whereHas('applicant', function($query) use ($userId) {
                    $query->where('user_id', $userId);
                })->pluck('id');
                
                $interviews = Interview::with([
                    'application.jobPosting', 
                    'application.applicant'
                ])
                ->whereIn('application_id', $userApplications)
                ->orderBy('interview_date', 'asc')
                ->orderBy('interview_time', 'asc')
                ->get();
            }
            
            if ($interviews->isEmpty()) {
                Log::info('InterviewController: No interviews found for user', ['user_id' => $userId]);
                return response()->json([], 200);
            }

            // Transform the data for better frontend consumption
            $hasEndTimeColumn = Schema::hasColumn('interviews', 'end_time');
            $hasApplicantUserIdColumn = Schema::hasColumn('interviews', 'applicant_user_id');
            
            $transformedInterviews = $interviews->map(function ($interview) use ($hasEndTimeColumn, $hasApplicantUserIdColumn) {
                $transformed = [
                    'id' => $interview->id,
                    'application_id' => $interview->application_id,
                    // Ensure interview_date is returned as YYYY-MM-DD string format (as received from HR)
                    'interview_date' => $interview->interview_date instanceof \Carbon\Carbon 
                        ? $interview->interview_date->format('Y-m-d')
                        : (is_string($interview->interview_date) ? $interview->interview_date : $interview->interview_date),
                    // Ensure interview_time is returned as HH:MM string format (as received from HR)
                    'interview_time' => is_string($interview->interview_time) 
                        ? $interview->interview_time 
                        : (isset($interview->interview_time) ? date('H:i', strtotime($interview->interview_time)) : null),
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
                
                // Add end_time only if column exists
                // Ensure end_time is returned as HH:MM string format (as received from HR)
                if ($hasEndTimeColumn) {
                    $transformed['end_time'] = is_string($interview->end_time) 
                        ? $interview->end_time 
                        : (isset($interview->end_time) ? date('H:i', strtotime($interview->end_time)) : null);
                } else {
                    $transformed['end_time'] = null;
                }
                
                // Add applicant_user_id only if column exists
                if ($hasApplicantUserIdColumn) {
                    $transformed['applicant_user_id'] = $interview->applicant_user_id;
                }
                
                return $transformed;
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
