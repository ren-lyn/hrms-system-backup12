<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class JobPostingController extends Controller
{
    // HR staff/assistant view with applications
    public function index()
    {
        return JobPosting::with('applications')->latest()->get();
    }

    // Store new job posting
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'requirements' => 'required|string',
            'department' => 'required|string',
            'status' => 'sometimes|in:Open,Closed',  // Made optional with default
        ]);

        $jobPosting = JobPosting::create([
            'hr_staff_id' => Auth::check() ? Auth::id() : null,
            'title' => $request->title,
            'description' => $request->description,
            'requirements' => $request->requirements,
            'department' => $request->department,
            'status' => $request->status ?? 'Open',  // Default to 'Open' if not provided
        ]);

        // Send notification to HR Staff only (Job Posting is HR Staff's responsibility)
        try {
            $hrStaff = \App\Models\User::whereHas('role', function($query) {
                $query->where('name', 'HR Staff');
            })->get();

            foreach ($hrStaff as $hr) {
                $hr->notify(new \App\Notifications\JobPostingCreated($jobPosting));
            }

            \Log::info('Job posting creation notifications sent', [
                'job_posting_id' => $jobPosting->id,
                'title' => $jobPosting->title,
                'department' => $jobPosting->department,
                'hr_staff_notified' => $hrStaff->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send job posting creation notifications', [
                'job_posting_id' => $jobPosting->id,
                'error' => $e->getMessage()
            ]);
        }

        return response()->json([
            'message' => 'Job posting created successfully.',
            'job_posting' => $jobPosting
        ], 201);
    }

    // Update job posting
    public function update(Request $request, $id)
    {
        $job = JobPosting::findOrFail($id);

        $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'requirements' => 'required|string',
            'department' => 'required|string',
            'status' => 'required|in:Open,Closed',
        ]);

        $job->update($request->only([
            'title',
            'description',
            'requirements',
            'department',
            'status'
        ]));

        return response()->json(['message' => 'Updated successfully.']);
    }

    // Delete job posting
    public function destroy($id)
    {
        JobPosting::findOrFail($id)->delete();

        return response()->json(['message' => 'Deleted successfully.']);
    }

    // Public endpoint for applicants
    public function getPublicJobPostings()
    {
        return JobPosting::where('status', 'Open')
            ->select('id', 'title', 'description', 'requirements', 'department', 'status', 'created_at')
            ->latest()
            ->get();
    }

    // Toggle status (enable/disable job posting)
    public function toggleStatus($id)
    {
        $job = JobPosting::findOrFail($id);
        $job->status = $job->status === 'Open' ? 'Closed' : 'Open';
        $job->save();

        return response()->json(['success' => true, 'status' => $job->status]);
    }
}
