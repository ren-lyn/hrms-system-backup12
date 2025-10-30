<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\Applicant;
// use App\Models\OnboardingRecord; // Removed model dependency; using query builder instead
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApplicationController extends Controller
{
    // Get all applications for HR staff to view
    public function index(Request $request)
    {
        $applications = Application::with(['jobPosting', 'applicant'])
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
            'status' => 'required|in:Pending,Applied,ShortListed,Interview,Offered,Offer Sent,Offer Accepted,Onboarding,Hired,Rejected'
        ]);

        $application = Application::findOrFail($id);
        
        // Log the status change for debugging
        Log::info('Updating application status', [
            'application_id' => $id,
            'old_status' => $application->status,
            'new_status' => $request->status,
            'user_id' => Auth::check() ? Auth::id() : 'unknown'
        ]);
        
        $application->update([
            'status' => $request->status,
            'reviewed_at' => now(),
        ]);

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
            $request->validate([
                'interview_date' => 'required|date|after_or_equal:yesterday',
                'interview_time' => 'required',
                'end_time' => 'required',
                'interview_type' => 'required|string',
                'location' => 'required|string',
                'interviewer' => 'required|string',
                'notes' => 'nullable|string'
            ]);

            $application = Application::findOrFail($id);
            
            // Update application status to On going Interview
            if ($application->status !== 'On going Interview') {
                $application->update(['status' => 'On going Interview']);
            }

            // Prevent duplicate interview for this application
            $alreadyScheduled = \App\Models\Interview::where('application_id', $id)->exists();
            if ($alreadyScheduled) {
                return response()->json([
                    'error' => 'Interview already scheduled for this application'
                ], 409);
            }

            // Create interview record
            $interview = \App\Models\Interview::create([
                'application_id' => $id,
                'interview_date' => $request->interview_date,
                'interview_time' => $request->interview_time,
                // end_time is accepted from client but not persisted here to avoid DB schema issues
                'interview_type' => $request->interview_type,
                'location' => $request->location,
                'interviewer' => $request->interviewer,
                'notes' => $request->notes ?? '',
                'status' => 'scheduled'
            ]);

            // Attach end_time to the response object (not persisted)
            $interview->end_time = $request->end_time;

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
                'message' => 'Interview scheduled successfully.',
                'interview' => $interview,
                'application' => $application->load(['jobPosting', 'applicant'])
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
            $request->validate([
                'application_ids' => 'required|array|min:1',
                'application_ids.*' => 'required|integer|exists:applications,id',
                'interview_date' => 'required|date|after_or_equal:yesterday',
                'interview_time' => 'required',
                'end_time' => 'required',
                'interview_type' => 'required|string',
                'location' => 'required|string',
                'interviewer' => 'required|string',
                'notes' => 'nullable|string'
            ]);

            $applicationIds = $request->application_ids;
            $interviewData = $request->only([
                'interview_date', 'interview_time', 'end_time',
                'interview_type', 'location', 'interviewer', 'notes'
            ]);

            $successfulInterviews = [];
            $failedInterviews = [];

            DB::beginTransaction();

            foreach ($applicationIds as $applicationId) {
                try {
                    $application = Application::findOrFail($applicationId);
                    
                    // Update application status to On going Interview
                    if ($application->status !== 'On going Interview') {
                        $application->update(['status' => 'On going Interview']);
                    }

                    // Skip if interview already exists for this application
                    if (\App\Models\Interview::where('application_id', $applicationId)->exists()) {
                        $failedInterviews[] = [
                            'application_id' => $applicationId,
                            'reason' => 'Interview already scheduled for this application'
                        ];
                        continue;
                    }

                    // Create interview record
                    $interview = \App\Models\Interview::create([
                        'application_id' => $applicationId,
                        'interview_date' => $interviewData['interview_date'],
                        'interview_time' => $interviewData['interview_time'],
                        // end_time is accepted from client but not persisted here to avoid DB schema issues
                        'interview_type' => $interviewData['interview_type'],
                        'location' => $interviewData['location'],
                        'interviewer' => $interviewData['interviewer'],
                        'notes' => $interviewData['notes'] ?? '',
                        'status' => 'scheduled'
                    ]);

                    // Attach end_time to the response object (not persisted)
                    $interview->end_time = $interviewData['end_time'] ?? null;

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
        $application = Application::findOrFail($id);
        
        // Idempotent send: if already offered/accepted/hired/rejected, do not change state
        if (in_array($application->status, ['Offered', 'Offer Accepted', 'Hired', 'Rejected'])) {
            return response()->json([
                'message' => 'Offer already processed.',
                'application' => $application->load(['jobPosting', 'applicant'])
            ]);
        }

        // Update status to Offered (HR UI shows this under Offered tab)
        $application->update(['status' => 'Offered']);
        
        // Here you could send email notification to applicant
        // Mail::to($application->applicant->email)->send(new JobOfferMail($application));
        
        return response()->json([
            'message' => 'Job offer sent successfully.',
            'application' => $application->load(['jobPosting', 'applicant'])
        ]);
    }
    
    // Accept job offer (applicant action)
    public function acceptOffer(Request $request, $id)
    {
        try {
            DB::beginTransaction();
            
            $application = Application::with(['jobPosting', 'applicant'])->findOrFail($id);
            
            Log::info('Accept offer request received', [
                'application_id' => $id,
                'current_status' => $application->status,
                'applicant_id' => $application->applicant_id
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
            
            // Update status to Offer Accepted
            $application->update(['status' => 'Offer Accepted']);
            
            Log::info('Application status updated to Offer Accepted', [
                'application_id' => $id
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
                'application' => $application->fresh(['jobPosting', 'applicant'])
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
    
    // Decline job offer
    public function declineOffer(Request $request, $id)
    {
        $application = Application::findOrFail($id);
        
        // Verify the application status is 'Offer Sent'
        if ($application->status !== 'Offer Sent') {
            return response()->json([
                'message' => 'Invalid application status for offer decline.'
            ], 400);
        }
        
        // Update status to Rejected
        $application->update(['status' => 'Rejected']);
        
        return response()->json([
            'message' => 'Job offer declined.',
            'application' => $application->load(['jobPosting', 'applicant'])
        ]);
    }
    
    // Get applicant's own applications
    public function myApplications(Request $request)
    {
        $user = $request->user();
        
        // Get applications for the current user (assuming they have an applicant profile)
        $applications = Application::with(['jobPosting', 'applicant'])
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
}