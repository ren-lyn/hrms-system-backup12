<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobPosting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class JobPostingController extends Controller
{
    // HR staff/assistant view with applications
    public function index()
    {
        return JobPosting::with('applications')
            ->select('id', 'hr_staff_id', 'title', 'description', 'requirements', 'department', 'position', 'salary_min', 'salary_max', 'salary_notes', 'status', 'created_at', 'updated_at')
            ->latest()
            ->get();
    }

    // Store new job posting
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'requirements' => 'required|string',
            'department' => 'required|string',
            'position' => 'required|string',
            'status' => 'sometimes|in:Open,Closed',  // Made optional with default
        ]);

        // Check for existing job posting with same department and position
        $existingJob = JobPosting::where('department', $request->department)
            ->where('position', $request->position)
            ->where('status', 'Open')
            ->first();

        if ($existingJob) {
            return response()->json([
                'message' => 'A job posting for this department and position already exists.',
                'duplicate_detected' => true,
                'existing_job' => [
                    'id' => $existingJob->id,
                    'title' => $existingJob->title,
                    'department' => $existingJob->department,
                    'position' => $existingJob->position,
                    'created_at' => $existingJob->created_at,
                    'salary_range' => [
                        'min' => $existingJob->salary_min,
                        'max' => $existingJob->salary_max,
                        'notes' => $existingJob->salary_notes
                    ]
                ],
                'suggestion' => 'Please update the existing post instead of creating a duplicate.'
            ], 409);
        }

        // Use salary values from request if provided, otherwise get from position mapping
        $salaryMin = $request->has('salary_min') ? (float)$request->salary_min : null;
        $salaryMax = $request->has('salary_max') ? (float)$request->salary_max : null;
        
        // If salary not provided in request, try to get from position mapping
        if ($salaryMin === null || $salaryMax === null) {
            $salaryRange = JobPosting::getSalaryRangeForPosition($request->position);
            $salaryMin = $salaryMin !== null ? $salaryMin : ($salaryRange['min'] ?? null);
            $salaryMax = $salaryMax !== null ? $salaryMax : ($salaryRange['max'] ?? null);
        }
        
        $jobPosting = JobPosting::create([
            'hr_staff_id' => Auth::check() ? Auth::id() : null,
            'title' => $request->title,
            'description' => $request->description,
            'requirements' => $request->requirements,
            'department' => $request->department,
            'position' => $request->position,
            'salary_min' => $salaryMin,
            'salary_max' => $salaryMax,
            'salary_notes' => $request->salary_notes ?? null,
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

            Log::info('Job posting creation notifications sent', [
                'job_posting_id' => $jobPosting->id,
                'title' => $jobPosting->title,
                'department' => $jobPosting->department,
                'hr_staff_notified' => $hrStaff->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send job posting creation notifications', [
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
            'position' => 'required|string',
            'status' => 'required|in:Open,Closed',
        ]);

        $updateData = $request->only([
            'title',
            'description',
            'requirements',
            'department',
            'position',
            'status'
        ]);
        
        // Use salary values from request if provided, otherwise get from position mapping
        if ($request->has('salary_min') || $request->has('salary_max')) {
            $updateData['salary_min'] = $request->has('salary_min') ? (float)$request->salary_min : null;
            $updateData['salary_max'] = $request->has('salary_max') ? (float)$request->salary_max : null;
        } else {
            // If salary not in request, get from position mapping
            $salaryRange = JobPosting::getSalaryRangeForPosition($request->position);
            $updateData['salary_min'] = $salaryRange['min'] ?? null;
            $updateData['salary_max'] = $salaryRange['max'] ?? null;
        }
        
        // Add salary notes if provided
        if ($request->has('salary_notes')) {
            $updateData['salary_notes'] = $request->salary_notes;
        }
        
        $job->update($updateData);

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
            ->select('id', 'title', 'description', 'requirements', 'department', 'position', 'salary_min', 'salary_max', 'salary_notes', 'status', 'created_at')
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

    // Get salary ranges for positions
    public function getSalaryRanges()
    {
        return response()->json(JobPosting::getSalaryRanges());
    }
}
