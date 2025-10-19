<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\Applicant;
use App\Models\OnboardingRecord;
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
                $hr->notify(new \App\Notifications\JobApplicationSubmitted($application));
            }

            Log::info('Job application submission notifications sent', [
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
            'status' => 'required|in:Pending,Applied,ShortListed,Interview,Offered,Offered Accepted,Onboarding,Hired,Rejected'
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
                // Check if onboarding record already exists
                $existingOnboardingRecord = OnboardingRecord::where('application_id', $id)->first();
                
                if (!$existingOnboardingRecord) {
                    // Load the application with related data
                    $application->load(['jobPosting', 'applicant']);
                    
                    // Create onboarding record
                    OnboardingRecord::create([
                        'application_id' => $id,
                        'employee_name' => $application->applicant->first_name . ' ' . $application->applicant->last_name,
                        'employee_email' => $application->applicant->email,
                        'position' => $application->jobPosting->position,
                        'department' => $application->jobPosting->department,
                        'onboarding_status' => 'pending_documents',
                        'progress' => 0,
                        'notes' => 'Automatically created when applicant was shortlisted'
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
                        'onboarding_record_id' => $existingOnboardingRecord->id
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
                $application->applicant->user->notify(new \App\Notifications\JobApplicationStatusChanged($application));
            }

            Log::info('Job application status change notification sent', [
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
        $request->validate([
            'date' => 'required|date|after:now',
            'time' => 'required',
            'type' => 'required|string',
            'location' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $application = Application::findOrFail($id);
        
        // Update application status to Interview if not already
        if ($application->status !== 'Interview') {
            $application->update(['status' => 'Interview']);
        }

        // Here you would typically save interview details to a separate interviews table
        // For now, we'll just return success

        return response()->json([
            'message' => 'Interview scheduled successfully.',
            'application' => $application->load(['jobPosting', 'applicant'])
        ]);
    }

    // Send job offer to applicant
    public function sendOffer(Request $request, $id)
    {
        $application = Application::findOrFail($id);
        
        // Update status to Offer Sent
        $application->update(['status' => 'Offer Sent']);
        
        // Here you could send email notification to applicant
        // Mail::to($application->applicant->email)->send(new JobOfferMail($application));
        
        return response()->json([
            'message' => 'Job offer sent successfully.',
            'application' => $application->load(['jobPosting', 'applicant'])
        ]);
    }
    
    // Accept job offer
    public function acceptOffer(Request $request, $id)
    {
        try {
            DB::beginTransaction();
            
            $application = Application::findOrFail($id);
            
            // Verify the application status is 'Offer Sent'
            if ($application->status !== 'Offer Sent') {
                return response()->json([
                    'message' => 'Invalid application status for offer acceptance.'
                ], 400);
            }
            
            // Update status to Offer Accepted
            $application->update(['status' => 'Offer Accepted']);
            
            DB::commit();
            
            return response()->json([
                'message' => 'Job offer accepted successfully.',
                'application' => $application->load(['jobPosting', 'applicant'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to accept offer. Please try again.',
                'error' => $e->getMessage()
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
            'offer_sent' => Application::where('status', 'Offer Sent')->count(),
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