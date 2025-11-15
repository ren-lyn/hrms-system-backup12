<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\Applicant;
use App\Models\JobOffer;
// use App\Models\OnboardingRecord; // Removed model dependency; using query builder instead
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class ApplicationController extends Controller
{
    private const DOCUMENT_SUBMISSION_WINDOW_DAYS = 10;

    // Get all applications for HR staff to view
    public function index(Request $request)
    {
        $applications = Application::with(['jobPosting', 'applicant', 'jobOffer', 'benefitsEnrollment'])
            ->when($request->job_posting_id, function($query, $jobId) {
                return $query->where('job_posting_id', $jobId);
            })
            ->when($request->status, function($query, $status) {
                return $query->where('status', $status);
            })
            ->latest()
            ->get();

        // Debug logging
        Log::info('Applications API called', [
            'count' => $applications->count(),
            'first_application' => $applications->first() ? [
                'id' => $applications->first()->id,
                'status' => $applications->first()->status,
                'applicant' => $applications->first()->applicant ? [
                    'first_name' => $applications->first()->applicant->first_name,
                    'last_name' => $applications->first()->applicant->last_name,
                    'email' => $applications->first()->applicant->email
                ] : null,
                'job_posting' => $applications->first()->jobPosting ? [
                    'title' => $applications->first()->jobPosting->title,
                    'department' => $applications->first()->jobPosting->department,
                    'position' => $applications->first()->jobPosting->position
                ] : null
            ] : null
        ]);

        return response()->json($applications);
    }

    // Get applications for a specific job posting
    public function getByJobPosting($jobId)
    {
        $applications = Application::with(['applicant'])
            ->where('job_posting_id', $jobId)
            ->latest()
            ->get();

        return response()->json($applications);
    }

    // Submit application (for applicants)
    public function store(Request $request)
    {
        $request->validate([
            'job_posting_id' => 'required|exists:job_postings,id',
            'resume' => 'required|file|mimes:pdf|max:10240', // 10MB max, PDF only
        ]);

        $user = Auth::user();

        // Ensure the user has an Applicant profile (create if missing)
        $applicant = $user->applicant;
        if (!$applicant) {
            $applicant = Applicant::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'first_name' => $user->first_name ?? '',
                    'last_name'  => $user->last_name ?? '',
                    'email'      => $user->email,
                    'contact_number' => null,
                ]
            );
        }

        // Check if applicant already applied for this job
        $existingApplication = Application::where('applicant_id', $applicant->id)
            ->where('job_posting_id', $request->job_posting_id)
            ->first();

        if ($existingApplication) {
            return response()->json(['message' => 'You have already applied for this job.'], 409);
        }

        // Check if applicant has any existing applications to prevent applying to multiple positions
        $anyExistingApplication = Application::where('applicant_id', $applicant->id)
            ->whereIn('status', ['Applied', 'ShortListed', 'Interview', 'Offer Sent', 'Offer Accepted'])
            ->with(['jobPosting'])
            ->first();

        if ($anyExistingApplication) {
            return response()->json([
                'message' => 'You already have an active application in progress.',
                'details' => [
                    'existing_application' => [
                        'job_title' => $anyExistingApplication->jobPosting->title,
                        'position' => $anyExistingApplication->jobPosting->position,
                        'department' => $anyExistingApplication->jobPosting->department,
                        'status' => $anyExistingApplication->status,
                        'applied_at' => $anyExistingApplication->applied_at
                    ]
                ],
                'suggestion' => 'Please wait for your current application to be processed before applying to other positions.'
            ], 409);
        }

        // Handle file upload
        $resumePath = $request->file('resume')->store('resumes', 'public');

        // Create application
        $application = Application::create([
            'job_posting_id' => $request->job_posting_id,
            'applicant_id' => $applicant->id,
            'status' => 'Pending',
            'applied_at' => now(),
            'resume_path' => $resumePath,
        ]);

        // Send notification to HR Staff only (Job Applications are HR Staff's responsibility)
        try {
            $application->load(['jobPosting', 'applicant']);
            
            $hrStaff = \App\Models\User::whereHas('role', function($query) {
                $query->where('name', 'HR Staff');
            })->get();

            foreach ($hrStaff as $hr) {
                $hr->notify(new \App\Notifications\OnboardingApplicationSubmitted($application));
            }

            Log::info('Onboarding application submission notifications sent', [
                'application_id' => $application->id,
                'applicant_id' => $applicant->id,
                'job_posting_id' => $request->job_posting_id,
                'hr_staff_notified' => $hrStaff->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send job application submission notifications', [
                'application_id' => $application->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'message' => 'Application submitted successfully.',
            'application' => $application->load(['jobPosting', 'applicant'])
        ], 201);
    }

    // Update application status (for HR)
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            // Canonical statuses used across app and HR dashboards
            'status' => 'required|in:Pending,Applied,ShortListed,Interview,Offered,Offer Sent,Offer Accepted,Onboarding,Document Submission,Orientation Schedule,Starting Date,Benefits Enroll,Profile Creation,Hired,Rejected'
        ]);

        $application = Application::findOrFail($id);
        
        // Log the status change for debugging
        Log::info('Updating application status', [
            'application_id' => $id,
            'old_status' => $application->status,
            'new_status' => $request->status,
            'user_id' => Auth::check() ? Auth::id() : 'unknown'
        ]);
        
        $updates = [
            'status' => $request->status,
            'reviewed_at' => now(),
        ];

        $application->update($updates);

        if (in_array($request->status, ['Document Submission', 'Onboarding'], true)) {
            $this->ensureDocumentSubmissionWindowInitialized($application);
        }

        // If status changed to ShortListed, automatically create onboarding record
        if ($request->status === 'ShortListed') {
            try {
                // Check if onboarding record already exists (using query builder to avoid model dependency)
                $existingOnboardingRecord = DB::table('onboarding_records')->where('application_id', $id)->first();
                
                if (!$existingOnboardingRecord) {
                    // Load the application with related data
                    $application->load(['jobPosting', 'applicant']);
                    
                    // Create onboarding record (query builder)
                    DB::table('onboarding_records')->insert([
                        'application_id' => $id,
                        'employee_name' => $application->applicant->first_name . ' ' . $application->applicant->last_name,
                        'employee_email' => $application->applicant->email,
                        'position' => $application->jobPosting->position,
                        'department' => $application->jobPosting->department,
                        'onboarding_status' => 'pending_documents',
                        'progress' => 0,
                        'notes' => 'Automatically created when applicant was shortlisted',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    
                    Log::info('Onboarding record created automatically', [
                        'application_id' => $id,
                        'applicant_id' => $application->applicant_id,
                        'employee_name' => $application->applicant->first_name . ' ' . $application->applicant->last_name,
                        'position' => $application->jobPosting->position
                    ]);
                } else {
                    Log::info('Onboarding record already exists for this application', [
                        'application_id' => $id,
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Failed to create onboarding record automatically', [
                    'application_id' => $id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }

        // Verify the update was successful
        $updatedApplication = Application::find($id);
        Log::info('Status update verification', [
            'application_id' => $id,
            'current_status' => $updatedApplication->status,
            'updated_at' => $updatedApplication->updated_at
        ]);

        // Send notification to applicant about status change
        try {
            $application->load(['jobPosting', 'applicant']);
            
            if ($application->applicant && $application->applicant->user) {
                $application->applicant->user->notify(new \App\Notifications\OnboardingStatusChanged($application));
            }

            Log::info('Onboarding status change notification sent', [
                'application_id' => $application->id,
                'applicant_id' => $application->applicant_id,
                'new_status' => $request->status
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send job application status change notification', [
                'application_id' => $application->id,
                'error' => $e->getMessage()
            ]);
        }
        
        return response()->json([
            'message' => 'Application status updated successfully.',
            'application' => $application->load(['jobPosting', 'applicant'])
        ]);
    }

    // Download resume
    public function downloadResume($id)
    {
        $application = Application::findOrFail($id);
        
        if (!Storage::disk('public')->exists($application->resume_path)) {
            return response()->json(['message' => 'Resume file not found.'], 404);
        }

        $path = Storage::disk('public')->path($application->resume_path);

        return response()->download(
        $path,
        'resume_' . $application->applicant->first_name . '_' . $application->applicant->last_name . '.pdf'
);
    }

    // Schedule interview for application
    public function scheduleInterview(Request $request, $id)
    {
        try {
            // Validate HR role
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Authentication required'
                ], 401);
            }

            $userRole = $user->role->name ?? '';
            $isHRStaff = in_array($userRole, ['HR Staff', 'HR Assistant']);
            
            if (!$isHRStaff) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'Only HR Staff and HR Assistants can schedule interviews'
                ], 403);
            }

            $request->validate([
                'interview_date' => 'required|date|after_or_equal:yesterday',
                'interview_time' => 'required',
                'end_time' => 'required',
                'interview_type' => 'required|string',
                'location' => 'required|string',
                'interviewer' => 'required|string',
                'notes' => 'nullable|string',
                'stage' => 'nullable|string|max:50'
            ]);

            $application = Application::with('applicant')->findOrFail($id);
            
            // Get applicant's user_id to tie the invite to their account
            if (!$application->applicant || !$application->applicant->user_id) {
                return response()->json([
                    'error' => 'Invalid application',
                    'message' => 'Application does not have a valid applicant account'
                ], 400);
            }

            $applicantUserId = $application->applicant->user_id;
            
            // Update application status to On going Interview
            if ($application->status !== 'On going Interview') {
                $application->update(['status' => 'On going Interview']);
            }

            // Check for existing active interview invite for this applicant (by user_id)
            // If exists, update it; otherwise create new
            // This ensures each applicant has only one active interview invite at a time
            // Check if applicant_user_id column exists (migration may not have run yet)
            $hasApplicantUserIdColumn = Schema::hasColumn('interviews', 'applicant_user_id');
            
            if ($hasApplicantUserIdColumn) {
                // Use applicant_user_id column if it exists
                $existingInterview = \App\Models\Interview::where('applicant_user_id', $applicantUserId)
                    ->where('status', 'scheduled')
                    ->first();
            } else {
                // Fallback: Find interviews through application relationship
                $userApplications = Application::whereHas('applicant', function($query) use ($applicantUserId) {
                    $query->where('user_id', $applicantUserId);
                })->pluck('id');
                
                $existingInterview = \App\Models\Interview::whereIn('application_id', $userApplications)
                    ->where('status', 'scheduled')
                    ->first();
            }
            
            $isUpdate = $existingInterview !== null;
            $stage = $request->input('stage', 'general');

            if ($existingInterview) {
                // Update existing interview invite
                // Check if end_time column exists (migration may not have run yet)
                $hasEndTimeColumn = Schema::hasColumn('interviews', 'end_time');
                
                $updateData = [
                    'application_id' => $id,
                    'interview_date' => $request->interview_date,
                    'interview_time' => $request->interview_time,
                    'interview_type' => $request->interview_type,
                    'location' => $request->location,
                    'interviewer' => $request->interviewer,
                    'notes' => $request->notes ?? '',
                    'stage' => $stage,
                    'status' => 'scheduled',
                    'updated_at' => now()
                ];
                
                // Add end_time only if column exists
                if ($hasEndTimeColumn) {
                    $updateData['end_time'] = $request->end_time;
                }
                
                // Add applicant_user_id only if column exists
                if ($hasApplicantUserIdColumn) {
                    $updateData['applicant_user_id'] = $applicantUserId;
                }
                
                $existingInterview->update($updateData);

                $interview = $existingInterview;
                
                Log::info('Interview invite updated for applicant', [
                    'interview_id' => $interview->id,
                    'applicant_user_id' => $applicantUserId,
                    'application_id' => $id,
                    'updated_by_hr_user_id' => $user->id
                ]);
                
                // Send notification about the update
                try {
                    $application->load(['jobPosting', 'applicant']);
                    if ($application->applicant && $application->applicant->user) {
                        $application->applicant->user->notify(new \App\Notifications\InterviewScheduled($interview, $application));
                    }
                    Log::info('Interview update notification sent', [
                        'application_id' => $application->id,
                        'interview_id' => $interview->id,
                        'applicant_id' => $application->applicant_id
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send interview update notification', [
                        'application_id' => $application->id,
                        'error' => $e->getMessage()
                    ]);
                }
            } else {
                // Create new interview record with all interview details
                // Check if columns exist (migrations may not have run yet)
                $hasEndTimeColumn = Schema::hasColumn('interviews', 'end_time');
                // Note: $hasApplicantUserIdColumn is already defined above in the function scope
                
                $interviewData = [
                    'application_id' => $id,
                    'interview_date' => $request->interview_date,
                    'interview_time' => $request->interview_time,
                    'interview_type' => $request->interview_type,
                    'location' => $request->location,
                    'interviewer' => $request->interviewer,
                    'notes' => $request->notes ?? '',
                    'stage' => $stage,
                    'status' => 'scheduled'
                ];
                
                // Add end_time only if column exists
                if ($hasEndTimeColumn) {
                    $interviewData['end_time'] = $request->end_time;
                }
                
                // Add applicant_user_id only if column exists
                if ($hasApplicantUserIdColumn) {
                    $interviewData['applicant_user_id'] = $applicantUserId;
                }
                
                $interview = \App\Models\Interview::create($interviewData);
                
                Log::info('Interview created (fallback mode if columns missing)', [
                    'interview_id' => $interview->id,
                    'application_id' => $id,
                    'has_end_time_column' => $hasEndTimeColumn,
                    'has_applicant_user_id_column' => $hasApplicantUserIdColumn,
                    'applicant_user_id' => $applicantUserId
                ]);

                Log::info('New interview invite created for applicant', [
                    'interview_id' => $interview->id,
                    'applicant_user_id' => $applicantUserId,
                    'application_id' => $id,
                    'created_by_hr_user_id' => $user->id
                ]);
            }

            // Load interview with application data
            $interview->load('application.jobPosting', 'application.applicant');

            // Send notification to applicant
            try {
                $application->load(['jobPosting', 'applicant']);
                
                if ($application->applicant && $application->applicant->user) {
                    $application->applicant->user->notify(new \App\Notifications\InterviewScheduled($interview, $application));
                }
                
                Log::info('Interview scheduled notification sent', [
                    'application_id' => $application->id,
                    'interview_id' => $interview->id,
                    'applicant_id' => $application->applicant_id
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send interview scheduled notification', [
                    'application_id' => $application->id,
                    'error' => $e->getMessage()
                ]);
            }

            return response()->json([
                'message' => $isUpdate ? 'Interview invite updated successfully.' : 'Interview scheduled successfully.',
                'interview' => $interview,
                'application' => $application->load(['jobPosting', 'applicant']),
                'updated' => $isUpdate
            ]);
        } catch (\Exception $e) {
            Log::error('Error scheduling interview', [
                'application_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to schedule interview',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // Schedule batch interviews for multiple applications
    public function scheduleBatchInterviews(Request $request)
    {
        try {
            // Validate HR role
            $user = $request->user();
            if (!$user) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'Authentication required'
                ], 401);
            }

            $userRole = $user->role->name ?? '';
            $isHRStaff = in_array($userRole, ['HR Staff', 'HR Assistant']);
            
            if (!$isHRStaff) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'Only HR Staff and HR Assistants can schedule interviews'
                ], 403);
            }

            $request->validate([
                'application_ids' => 'required|array|min:1',
                'application_ids.*' => 'required|integer|exists:applications,id',
                'interview_date' => 'required|date|after_or_equal:yesterday',
                'interview_time' => 'required',
                'end_time' => 'required',
                'interview_type' => 'required|string',
                'location' => 'required|string',
                'interviewer' => 'required|string',
                'notes' => 'nullable|string',
                'stage' => 'nullable|string|max:50'
            ]);

            $applicationIds = $request->application_ids;
            $interviewData = $request->only([
                'interview_date', 'interview_time', 'end_time',
                'interview_type', 'location', 'interviewer', 'notes'
            ]);
            $stage = $request->input('stage', 'general');

            $successfulInterviews = [];
            $failedInterviews = [];

            DB::beginTransaction();

            foreach ($applicationIds as $applicationId) {
                try {
                    $application = Application::with('applicant')->findOrFail($applicationId);
                    
                    // Update application status to On going Interview
                    if ($application->status !== 'On going Interview') {
                        $application->update(['status' => 'On going Interview']);
                    }

                    // Get applicant's user_id to tie the invite to their account
                    $applicantUserId = $application->applicant->user_id ?? null;
                    
                    if (!$applicantUserId) {
                        $failedInterviews[] = [
                            'application_id' => $applicationId,
                            'error' => 'Application does not have a valid applicant account'
                        ];
                        continue;
                    }

                    // Check for existing active interview invite for this applicant
                    // Check if applicant_user_id column exists (migration may not have run yet)
                    $hasApplicantUserIdColumn = Schema::hasColumn('interviews', 'applicant_user_id');
                    
                    if ($hasApplicantUserIdColumn) {
                        // Use applicant_user_id column if it exists
                        $existingInterview = \App\Models\Interview::where('applicant_user_id', $applicantUserId)
                            ->where('status', 'scheduled')
                            ->first();
                    } else {
                        // Fallback: Find interviews through application relationship
                        $userApplications = Application::whereHas('applicant', function($query) use ($applicantUserId) {
                            $query->where('user_id', $applicantUserId);
                        })->pluck('id');
                        
                        $existingInterview = \App\Models\Interview::whereIn('application_id', $userApplications)
                            ->where('status', 'scheduled')
                            ->first();
                    }

                    // Check if end_time column exists (migration may not have run yet)
                    $hasEndTimeColumn = Schema::hasColumn('interviews', 'end_time');
                    
                    if ($existingInterview) {
                        // Update existing interview invite
                        $updateData = [
                            'application_id' => $applicationId,
                            'interview_date' => $interviewData['interview_date'],
                            'interview_time' => $interviewData['interview_time'],
                            'interview_type' => $interviewData['interview_type'],
                            'location' => $interviewData['location'],
                            'interviewer' => $interviewData['interviewer'],
                            'notes' => $interviewData['notes'] ?? '',
                            'stage' => $stage,
                            'status' => 'scheduled',
                            'updated_at' => now()
                        ];
                        
                        // Add end_time only if column exists
                        if ($hasEndTimeColumn) {
                            $updateData['end_time'] = $interviewData['end_time'] ?? null;
                        }
                        
                        // Add applicant_user_id only if column exists
                        if ($hasApplicantUserIdColumn) {
                            $updateData['applicant_user_id'] = $applicantUserId;
                        }
                        
                        $existingInterview->update($updateData);
                        $interview = $existingInterview;
                    } else {
                        // Create interview record with all interview details
                        $createData = [
                            'application_id' => $applicationId,
                            'interview_date' => $interviewData['interview_date'],
                            'interview_time' => $interviewData['interview_time'],
                            'interview_type' => $interviewData['interview_type'],
                            'location' => $interviewData['location'],
                            'interviewer' => $interviewData['interviewer'],
                            'notes' => $interviewData['notes'] ?? '',
                            'stage' => $stage,
                            'status' => 'scheduled'
                        ];
                        
                        // Add end_time only if column exists
                        if ($hasEndTimeColumn) {
                            $createData['end_time'] = $interviewData['end_time'] ?? null;
                        }
                        
                        // Add applicant_user_id only if column exists
                        if ($hasApplicantUserIdColumn) {
                            $createData['applicant_user_id'] = $applicantUserId;
                        }
                        
                        $interview = \App\Models\Interview::create($createData);
                    }

                    // Load interview with application data
                    $interview->load('application.jobPosting', 'application.applicant');

                    // Send notification to applicant
                    try {
                        $application->load(['jobPosting', 'applicant']);
                        
                        if ($application->applicant && $application->applicant->user) {
                            $application->applicant->user->notify(new \App\Notifications\InterviewScheduled($interview, $application));
                        }
                        
                        Log::info('Batch interview scheduled notification sent', [
                            'application_id' => $application->id,
                            'interview_id' => $interview->id,
                            'applicant_id' => $application->applicant_id
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Failed to send batch interview scheduled notification', [
                            'application_id' => $application->id,
                            'error' => $e->getMessage()
                        ]);
                    }

                    $successfulInterviews[] = [
                        'application_id' => $applicationId,
                        'interview_id' => $interview->id,
                        'applicant_name' => $application->applicant ? 
                            $application->applicant->first_name . ' ' . $application->applicant->last_name : 'Unknown',
                        'job_title' => $application->jobPosting ? $application->jobPosting->title : 'Unknown'
                    ];

                } catch (\Exception $e) {
                    $failedInterviews[] = [
                        'application_id' => $applicationId,
                        'error' => $e->getMessage()
                    ];
                    
                    Log::error('Failed to schedule interview for application', [
                        'application_id' => $applicationId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Batch interview scheduling completed.',
                'successful_count' => count($successfulInterviews),
                'failed_count' => count($failedInterviews),
                'successful_interviews' => $successfulInterviews,
                'failed_interviews' => $failedInterviews
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error in batch interview scheduling', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to schedule batch interviews',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // Send job offer to applicant
    public function sendOffer(Request $request, $id)
    {
        try {
            $request->validate([
                'payment_schedule' => 'required|string',
                'employment_type' => 'required|string',
                'work_setup' => 'required|string',
                'offer_validity' => 'required|string',
                'contact_person' => 'required|string',
                'contact_number' => 'required|string',
                'department' => 'nullable|string',
                'position' => 'nullable|string',
                'salary' => 'nullable|string',
                'notes' => 'nullable|string'
            ]);

            $application = Application::findOrFail($id);
            
            // Idempotent send: if already offered/accepted/hired/rejected, do not change state
            if (in_array($application->status, ['Offered', 'Offer Accepted', 'Hired', 'Rejected'])) {
                return response()->json([
                    'message' => 'Offer already processed.',
                    'application' => $application->load(['jobPosting', 'applicant', 'jobOffer'])
                ]);
            }

            // Check if job offer already exists for this application
            $existingOffer = JobOffer::where('application_id', $id)->first();
            
            if ($existingOffer) {
                // Update existing offer
                $existingOffer->update([
                    'department' => $request->department,
                    'position' => $request->position,
                    'salary' => $request->salary,
                    'payment_schedule' => $request->payment_schedule,
                    'employment_type' => $request->employment_type,
                    'work_setup' => $request->work_setup,
                    'offer_validity' => $request->offer_validity,
                    'contact_person' => $request->contact_person,
                    'contact_number' => $request->contact_number,
                    'notes' => $request->notes,
                    'status' => 'pending',
                    'offer_sent_at' => now(),
                    'responded_at' => null,
                ]);
                
                Log::info('Job offer updated', [
                    'application_id' => $id,
                    'offer_id' => $existingOffer->id
                ]);
            } else {
                // Create new job offer
                $existingOffer = JobOffer::create([
                    'application_id' => $id,
                    'department' => $request->department,
                    'position' => $request->position,
                    'salary' => $request->salary,
                    'payment_schedule' => $request->payment_schedule,
                    'employment_type' => $request->employment_type,
                    'work_setup' => $request->work_setup,
                    'offer_validity' => $request->offer_validity,
                    'contact_person' => $request->contact_person,
                    'contact_number' => $request->contact_number,
                    'notes' => $request->notes,
                    'status' => 'pending',
                    'offer_sent_at' => now(),
                    'responded_at' => null,
                ]);
                
                Log::info('Job offer created', [
                    'application_id' => $id,
                    'offer_id' => $existingOffer->id
                ]);
            }

            // Update application status to Offered
            $application->update(['status' => 'Offered']);

            $application->load(['jobOffer']);
            
            // Here you could send email notification to applicant
            // Mail::to($application->applicant->email)->send(new JobOfferMail($application));
            
            return response()->json([
                'message' => 'Job offer sent successfully.',
                'application' => $application->load(['jobPosting', 'applicant', 'jobOffer']),
                'job_offer' => $existingOffer
            ]);
        } catch (\Exception $e) {
            Log::error('Error sending job offer', [
                'application_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Failed to send job offer.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    // Accept job offer (applicant action)
    public function acceptOffer(Request $request, $id)
    {
        try {
            DB::beginTransaction();
            
            $user = $request->user();
            $application = Application::with(['jobPosting', 'applicant', 'jobOffer'])
                ->whereHas('applicant', function($query) use ($user) {
                    $query->where('user_id', $user->id);
                })
                ->findOrFail($id);
            
            Log::info('Accept offer request received', [
                'application_id' => $id,
                'current_status' => $application->status,
                'applicant_id' => $application->applicant_id,
                'user_id' => $user->id
            ]);
            
            // Idempotency: if already accepted, return success
            if ($application->status === 'Offer Accepted') {
                // Ensure onboarding record reflects acceptance
                $onboardingRecord = DB::table('onboarding_records')
                    ->where('application_id', $id)
                    ->first();
                    
                if ($onboardingRecord) {
                    DB::table('onboarding_records')
                        ->where('application_id', $id)
                        ->update([
                            'onboarding_status' => 'accepted_offer',
                            'updated_at' => now(),
                        ]);
                }
                
                DB::commit();
                
                Log::info('Offer already accepted (idempotent response)', [
                    'application_id' => $id
                ]);
                
                return response()->json([
                    'message' => 'Job offer already accepted.',
                    'application' => $application
                ]);
            }
            
            // Allow acceptance from multiple statuses (more flexible)
            $allowedStatuses = ['Offer Sent', 'Offered', 'Interview', 'On going Interview', 'ShortListed'];
            if (!in_array($application->status, $allowedStatuses)) {
                Log::warning('Invalid status for offer acceptance', [
                    'application_id' => $id,
                    'current_status' => $application->status,
                    'allowed_statuses' => $allowedStatuses
                ]);
                
                return response()->json([
                    'message' => "Cannot accept offer. Current status: {$application->status}",
                    'current_status' => $application->status
                ], 400);
            }
            
            // Update status to Offer Accepted and record acceptance timestamp
            $application->update([
                'status' => 'Offer Accepted',
                'offer_accepted_at' => now()
            ]);

            $jobOffer = $application->jobOffer()->first();

            if ($jobOffer) {
                $jobOffer->update([
                    'status' => 'accepted',
                    'responded_at' => now(),
                ]);
            }
            
            Log::info('Application status updated to Offer Accepted', [
                'application_id' => $id,
                'offer_accepted_at' => now()
            ]);
            
            // Check if onboarding record exists
            $onboardingRecord = DB::table('onboarding_records')
                ->where('application_id', $id)
                ->first();
            
            if ($onboardingRecord) {
                // Update existing onboarding record
                DB::table('onboarding_records')
                    ->where('application_id', $id)
                    ->update([
                        'onboarding_status' => 'accepted_offer',
                        'updated_at' => now(),
                    ]);
                    
                Log::info('Onboarding record updated', [
                    'application_id' => $id,
                    'onboarding_record_id' => $onboardingRecord->id
                ]);
            } else {
                // Create new onboarding record
                DB::table('onboarding_records')->insert([
                    'application_id' => $id,
                    'employee_name' => $application->applicant->first_name . ' ' . $application->applicant->last_name,
                    'employee_email' => $application->applicant->email,
                    'position' => $application->jobPosting->position,
                    'department' => $application->jobPosting->department,
                    'onboarding_status' => 'accepted_offer',
                    'progress' => 10,
                    'notes' => 'Created automatically when offer was accepted',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                
                Log::info('New onboarding record created', [
                    'application_id' => $id
                ]);
            }
            
            DB::commit();
            
            // Send notification to HR about accepted offer
            try {
                $hrStaff = \App\Models\User::whereHas('role', function($query) {
                    $query->where('name', 'HR Staff');
                })->get();

                foreach ($hrStaff as $hr) {
                    $hr->notify(new \App\Notifications\OnboardingStatusChanged($application));
                }
                
                Log::info('Offer acceptance notifications sent to HR', [
                    'application_id' => $id,
                    'hr_staff_count' => $hrStaff->count()
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send offer acceptance notification', [
                    'application_id' => $id,
                    'error' => $e->getMessage()
                ]);
            }
            
            Log::info('Offer accepted successfully', [
                'application_id' => $id
            ]);
            
            return response()->json([
                'message' => 'Job offer accepted successfully.',
                'application' => $application->fresh(['jobPosting', 'applicant', 'jobOffer'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error accepting offer', [
                'application_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to accept offer. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    private function ensureDocumentSubmissionWindowInitialized(Application $application): void
    {
        $updates = [];

        if (!$application->documents_start_date) {
            $updates['documents_start_date'] = Carbon::now();
        }

        $startDate = isset($updates['documents_start_date'])
            ? Carbon::parse($updates['documents_start_date'])
            : ($application->documents_start_date ? $application->documents_start_date->copy() : null);

        if ($startDate && !$application->documents_deadline) {
            $updates['documents_deadline'] = $startDate->copy()->addDays(self::DOCUMENT_SUBMISSION_WINDOW_DAYS);
        }

        if (!empty($updates)) {
            $application->forceFill($updates)->save();
        }
    }
    
    // Decline job offer
    public function declineOffer(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $user = $request->user();
            $application = Application::with(['jobPosting', 'applicant', 'jobOffer'])
                ->whereHas('applicant', function($query) use ($user) {
                    $query->where('user_id', $user->id);
                })
                ->findOrFail($id);
            
            // Verify the application status allows declining
            $allowedStatuses = ['Offer Sent', 'Offered'];
            if (!in_array($application->status, $allowedStatuses)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Invalid application status for offer decline.'
                ], 400);
            }
            
            // Update status to Rejected
            $application->update(['status' => 'Rejected']);

            $jobOffer = $application->jobOffer()->first();

            if ($jobOffer) {
                $jobOffer->update([
                    'status' => 'declined',
                    'responded_at' => now(),
                ]);
            }

            DB::commit();
            
            return response()->json([
                'message' => 'Job offer declined.',
                'application' => $application->load(['jobPosting', 'applicant', 'jobOffer'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error declining offer', [
                'application_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Failed to decline offer. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
    
    // Get applicant's own applications
    public function myApplications(Request $request)
    {
        $user = $request->user();
        
        // Get applications for the current user (assuming they have an applicant profile)
        $applications = Application::with(['jobPosting', 'applicant', 'jobOffer'])
            ->whereHas('applicant', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->latest()
            ->get();
        
        return response()->json($applications);
    }

    // Get application statistics for HR dashboard
    public function getStats()
    {
        $stats = [
            'total_applications' => Application::count(),
            'applied' => Application::where('status', 'Applied')->count(),
            'shortlisted' => Application::where('status', 'ShortListed')->count(),
            'interview' => Application::where('status', 'Interview')->count(),
            // Treat "Offered" as the canonical sent-offer state, but include legacy "Offer Sent"
            'offer_sent' => Application::whereIn('status', ['Offered', 'Offer Sent'])->count(),
            'offer_accepted' => Application::where('status', 'Offer Accepted')->count(),
            'rejected' => Application::where('status', 'Rejected')->count(),
            'applications_this_month' => Application::whereMonth('applied_at', now()->month)->count(),
        ];

        return response()->json($stats);
    }
    
    // Get application status updates for real-time sync
    public function getStatusUpdates(Request $request, $since = null)
    {
        $query = Application::with(['jobPosting', 'applicant']);
        
        // If timestamp provided, get updates since then
        if ($since) {
            $query->where('updated_at', '>', $since);
        } else {
            // Default to updates in last hour
            $query->where('updated_at', '>', now()->subHour());
        }
        
        $applications = $query->latest('updated_at')->get();
        
        return response()->json([
            'applications' => $applications,
            'timestamp' => now()->toISOString()
        ]);
    }
    
    // Get job offer for applicant
    public function getJobOffer(Request $request, $applicationId)
    {
        try {
            $user = $request->user();
            
            // Verify the application belongs to the current user
            $application = Application::with(['jobPosting', 'applicant'])
                ->whereHas('applicant', function($query) use ($user) {
                    $query->where('user_id', $user->id);
                })
                ->findOrFail($applicationId);
            
            // Get job offer if exists
            $jobOffer = JobOffer::where('application_id', $applicationId)->first();
            
            if (!$jobOffer) {
                return response()->json([
                    'message' => 'No job offer found for this application.',
                    'offer' => null
                ], 404);
            }
            
            return response()->json([
                'message' => 'Job offer retrieved successfully.',
                'offer' => $jobOffer,
                'application' => $application
            ]);
        } catch (\Exception $e) {
            Log::error('Error retrieving job offer', [
                'application_id' => $applicationId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'message' => 'Failed to retrieve job offer.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get applicants ready for Profile Creation
     * Returns applicants who have completed benefits enrollment but are not yet hired
     * This is the source of truth for the Profile Creation tab
     */
    public function getProfileCreationQueue(Request $request)
    {
        try {
            // Get applicants with completed benefits enrollment who are not yet hired
            // Additional validation: Ensure benefits enrollment was completed after migration
            // This prevents old/stale data from appearing in Profile Creation tab
            $pendingProfileCreation = Application::with([
                'applicant.user',
                'jobPosting',
                'benefitsEnrollment'
            ])
            ->whereHas('benefitsEnrollment', function($query) {
                $query->where('enrollment_status', 'completed');
            })
            ->where('status', '!=', 'Hired') // Not yet hired
            ->whereHas('applicant') // Must have valid applicant
            ->whereHas('jobPosting') // Must have valid job posting
            ->latest()
            ->get()
            ->filter(function($application) {
                // Additional safety check: Ensure all required relationships exist
                return $application->applicant !== null 
                    && $application->jobPosting !== null
                    && $application->benefitsEnrollment !== null
                    && $application->benefitsEnrollment->enrollment_status === 'completed';
            });

            // Also get hired applicants who have employee profiles (for viewing/editing)
            $hiredWithProfiles = Application::with([
                'applicant.user.employeeProfile',
                'jobPosting',
                'benefitsEnrollment'
            ])
            ->where('status', 'Hired')
            ->whereHas('applicant.user.employeeProfile') // Has employee profile
            ->whereHas('applicant') // Must have valid applicant
            ->whereHas('jobPosting') // Must have valid job posting
            ->latest()
            ->get()
            ->filter(function($application) {
                // Additional safety check: Ensure all required relationships exist
                return $application->applicant !== null 
                    && $application->jobPosting !== null
                    && $application->applicant->user !== null
                    && $application->applicant->user->employeeProfile !== null;
            });

            // Combine both lists
            $applications = $pendingProfileCreation->merge($hiredWithProfiles);

            // Format the response with all necessary data for Profile Creation
            $formatted = $applications->map(function($application) {
                $applicant = $application->applicant;
                $benefitsEnrollment = $application->benefitsEnrollment;
                $isHired = $application->status === 'Hired';
                
                return [
                    'id' => $application->id,
                    'application_id' => $application->id,
                    'applicant_id' => $application->applicant_id,
                    'name' => $applicant ? trim(($applicant->first_name ?? '') . ' ' . ($applicant->last_name ?? '')) : 'N/A',
                    'email' => $applicant?->user?->email ?? $applicant?->email ?? 'N/A',
                    'department' => $application->jobPosting?->department ?? 'N/A',
                    'position' => $application->jobPosting?->position ?? 'N/A',
                    'status' => $application->status,
                    'isHired' => $isHired,
                    'enrollment_status' => $benefitsEnrollment?->enrollment_status ?? 'pending',
                    'benefits_enrollment_status' => $benefitsEnrollment?->enrollment_status ?? 'completed',
                    'completed_at' => $benefitsEnrollment?->updated_at?->toISOString(),
                    'applicant' => $applicant ? [
                        'id' => $applicant->id,
                        'first_name' => $applicant->first_name,
                        'last_name' => $applicant->last_name,
                        'email' => $applicant->email,
                        'contact_number' => $applicant->contact_number,
                        'user' => $applicant->user ? [
                            'id' => $applicant->user->id,
                            'email' => $applicant->user->email,
                        ] : null,
                    ] : null,
                    'job_posting' => $application->jobPosting ? [
                        'id' => $application->jobPosting->id,
                        'department' => $application->jobPosting->department,
                        'position' => $application->jobPosting->position,
                    ] : null,
                    'benefits_enrollment' => $benefitsEnrollment ? [
                        'id' => $benefitsEnrollment->id,
                        'enrollment_status' => $benefitsEnrollment->enrollment_status,
                        'metadata' => $benefitsEnrollment->metadata,
                        'assigned_at' => $benefitsEnrollment->assigned_at?->toISOString(),
                        'updated_at' => $benefitsEnrollment->updated_at?->toISOString(),
                    ] : null,
                ];
            });

            // Add cache control headers to prevent browser caching
            return response()->json([
                'success' => true,
                'data' => $formatted,
                'count' => $formatted->count(),
            ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
              ->header('Pragma', 'no-cache')
              ->header('Expires', '0');
        } catch (\Exception $e) {
            Log::error('Error retrieving profile creation queue', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve profile creation queue.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}