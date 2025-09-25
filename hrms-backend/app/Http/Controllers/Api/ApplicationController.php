<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\JobPosting;
use App\Models\Applicant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

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

        // Handle file upload
        $resumePath = $request->file('resume')->store('resumes', 'public');

        // Create application
        $application = Application::create([
            'job_posting_id' => $request->job_posting_id,
            'applicant_id' => $applicant->id,
            'status' => 'Applied',
            'applied_at' => now(),
            'resume_path' => $resumePath,
        ]);

        return response()->json([
            'message' => 'Application submitted successfully.',
            'application' => $application->load(['jobPosting', 'applicant'])
        ], 201);
    }

    // Update application status (for HR)
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:Applied,Pending,Under Review,Interview,Hired,Rejected'
        ]);

        $application = Application::findOrFail($id);
        $application->update([
            'status' => $request->status,
            'reviewed_at' => now(),
        ]);

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

    // Get application statistics for HR dashboard
    public function getStats()
    {
        $stats = [
            'total_applications' => Application::count(),
            'pending_applications' => Application::where('status', 'Pending')->count(),
            'under_review' => Application::where('status', 'Under Review')->count(),
            'hired' => Application::where('status', 'Hired')->count(),
            'accepted' => Application::where('status', 'Hired')->count(), // alias for frontend label
            'rejected' => Application::where('status', 'Rejected')->count(),
            'applications_this_month' => Application::whereMonth('applied_at', now()->month)->count(),
        ];

        return response()->json($stats);
    }
}
