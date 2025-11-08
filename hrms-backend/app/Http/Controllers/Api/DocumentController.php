<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\DocumentRequirement;
use App\Models\DocumentSubmission;
use App\Notifications\DocumentStatusChanged;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class DocumentController extends Controller
{
    // Get document requirements for an application
    public function getRequirements($applicationId)
    {
        try {
            $requirements = DocumentRequirement::where('application_id', $applicationId)
                ->orderBy('order')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $requirements
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching document requirements: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch document requirements'
            ], 500);
        }
    }

    // Create document requirement (HR only)
    public function createRequirement(Request $request, $applicationId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'document_name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'is_required' => 'boolean',
                'file_format' => 'nullable|string',
                'max_file_size_mb' => 'nullable|integer|min:1|max:50',
                'order' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $application = Application::findOrFail($applicationId);

            $requirement = DocumentRequirement::create([
                'application_id' => $applicationId,
                'document_name' => $request->document_name,
                'description' => $request->description,
                'is_required' => $request->is_required ?? true,
                'file_format' => $request->file_format,
                'max_file_size_mb' => $request->max_file_size_mb ?? 5,
                'order' => $request->order ?? 0
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Document requirement created successfully',
                'data' => $requirement
            ]);
        } catch (\Exception $e) {
            Log::error('Error creating document requirement: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create document requirement'
            ], 500);
        }
    }

    // Update document requirement (HR only)
    public function updateRequirement(Request $request, $requirementId)
    {
        try {
            $requirement = DocumentRequirement::findOrFail($requirementId);

            $validator = Validator::make($request->all(), [
                'document_name' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'is_required' => 'boolean',
                'file_format' => 'nullable|string',
                'max_file_size_mb' => 'nullable|integer|min:1|max:50',
                'order' => 'nullable|integer'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $requirement->update($request->only([
                'document_name', 'description', 'is_required', 
                'file_format', 'max_file_size_mb', 'order'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Document requirement updated successfully',
                'data' => $requirement
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating document requirement: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update document requirement'
            ], 500);
        }
    }

    // Delete document requirement (HR only)
    public function deleteRequirement($requirementId)
    {
        try {
            $requirement = DocumentRequirement::findOrFail($requirementId);
            
            // Delete associated submissions and files
            foreach ($requirement->submissions as $submission) {
                if (Storage::exists($submission->file_path)) {
                    Storage::delete($submission->file_path);
                }
                $submission->delete();
            }

            $requirement->delete();

            return response()->json([
                'success' => true,
                'message' => 'Document requirement deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting document requirement: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete document requirement'
            ], 500);
        }
    }

    // Get document submissions for an application
    public function getSubmissions($applicationId)
    {
        try {
            $submissions = DocumentSubmission::where('application_id', $applicationId)
                ->with(['documentRequirement', 'reviewer'])
                ->orderBy('submitted_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $submissions
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching document submissions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch document submissions'
            ], 500);
        }
    }

    // Upload document submission (Applicant)
    public function uploadSubmission(Request $request, $applicationId, $requirementId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:51200' // 50MB max
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $application = Application::findOrFail($applicationId);
            $requirement = DocumentRequirement::findOrFail($requirementId);

            // Check if user owns this application
            if ($application->applicant_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Validate file format if specified
            if ($requirement->file_format) {
                $allowedFormats = explode(',', $requirement->file_format);
                $fileExtension = $request->file('file')->getClientOriginalExtension();
                if (!in_array(strtolower($fileExtension), array_map('strtolower', $allowedFormats))) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid file format. Allowed formats: ' . $requirement->file_format
                    ], 422);
                }
            }

            // Validate file size
            $fileSizeMB = $request->file('file')->getSize() / (1024 * 1024);
            if ($fileSizeMB > $requirement->max_file_size_mb) {
                return response()->json([
                    'success' => false,
                    'message' => 'File size exceeds maximum allowed size of ' . $requirement->max_file_size_mb . 'MB'
                ], 422);
            }

            // Store file
            $file = $request->file('file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('document_submissions/' . $applicationId, $fileName, 'public');

            // Check if there's an existing submission (might be rejected)
            $existingSubmission = DocumentSubmission::where('application_id', $applicationId)
                ->where('document_requirement_id', $requirementId)
                ->first();

            // When file is confirmed for upload, set status to 'pending_review'
            // This indicates the file is ready for HR review
            $newStatus = 'pending_review';
            
            // If re-uploading a rejected document, clear submitted_at to allow resubmission
            $shouldClearSubmittedAt = $existingSubmission && $existingSubmission->status === 'rejected';

            // Delete old file if exists
            if ($existingSubmission && Storage::disk('public')->exists($existingSubmission->file_path)) {
                Storage::disk('public')->delete($existingSubmission->file_path);
            }

            // Create or update submission
            $submission = DocumentSubmission::updateOrCreate(
                [
                    'application_id' => $applicationId,
                    'document_requirement_id' => $requirementId
                ],
                [
                    'file_path' => $filePath,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $file->getClientMimeType(),
                    'file_size' => $file->getSize(),
                    'status' => $newStatus,
                    'submitted_at' => $shouldClearSubmittedAt ? null : now(), // Clear if re-uploading rejected, otherwise set timestamp
                    'rejection_reason' => null // Clear rejection reason on re-upload
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $submission->load('documentRequirement')
            ]);
        } catch (\Exception $e) {
            Log::error('Error uploading document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document'
            ], 500);
        }
    }

    // Submit all uploaded documents for HR review
    public function submitDocuments(Request $request, $applicationId)
    {
        try {
            $application = Application::findOrFail($applicationId);

            // Check if user owns this application
            if ($application->applicant_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Get all uploaded documents that haven't been submitted yet (status is 'pending_review' from upload)
            $uploadedSubmissions = DocumentSubmission::where('application_id', $applicationId)
                ->where('status', 'pending_review')
                ->whereNull('submitted_at') // Only documents that haven't been submitted yet
                ->get();

            if ($uploadedSubmissions->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No documents to submit. Please upload documents first.'
                ], 400);
            }

            // Get all required documents
            $requiredDocuments = DocumentRequirement::where('application_id', $applicationId)
                ->where('is_required', true)
                ->get();

            $requiredIds = $requiredDocuments->pluck('id')->toArray();
            $uploadedIds = $uploadedSubmissions->pluck('document_requirement_id')->toArray();

            // Check if all required documents are uploaded
            $missingRequired = array_diff($requiredIds, $uploadedIds);
            if (!empty($missingRequired)) {
                $missingNames = DocumentRequirement::whereIn('id', $missingRequired)
                    ->pluck('document_name')
                    ->toArray();
                
                return response()->json([
                    'success' => false,
                    'message' => 'Please upload all required documents before submitting.',
                    'missing_documents' => $missingNames
                ], 400);
            }

            // Update all uploaded documents to 'submitted' status
            // Note: We'll use 'submitted' as a status, but if that doesn't exist in enum, we'll use 'pending_review' with submitted_at set
            DocumentSubmission::where('application_id', $applicationId)
                ->where('status', 'pending_review')
                ->whereNull('submitted_at')
                ->update([
                    'status' => 'pending_review', // Keep as pending_review but mark as submitted
                    'submitted_at' => now() // This marks them as officially submitted
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Documents submitted successfully for HR review',
                'data' => DocumentSubmission::where('application_id', $applicationId)
                    ->where('status', 'pending_review')
                    ->whereNotNull('submitted_at')
                    ->with('documentRequirement')
                    ->get()
            ]);
        } catch (\Exception $e) {
            Log::error('Error submitting documents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit documents'
            ], 500);
        }
    }

    // Check if all documents are approved
    public function checkAllApproved($applicationId)
    {
        try {
            $application = Application::findOrFail($applicationId);

            // Check if user owns this application
            if ($application->applicant_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            // Get all required documents
            $requiredDocuments = DocumentRequirement::where('application_id', $applicationId)
                ->where('is_required', true)
                ->get();

            if ($requiredDocuments->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'all_approved' => false,
                    'message' => 'No required documents found'
                ]);
            }

            $requiredIds = $requiredDocuments->pluck('id')->toArray();

            // Get all approved submissions
            $approvedSubmissions = DocumentSubmission::where('application_id', $applicationId)
                ->whereIn('document_requirement_id', $requiredIds)
                ->where('status', 'approved')
                ->get();

            $approvedIds = $approvedSubmissions->pluck('document_requirement_id')->toArray();
            $allApproved = count($approvedIds) === count($requiredIds) && 
                          empty(array_diff($requiredIds, $approvedIds));

            return response()->json([
                'success' => true,
                'all_approved' => $allApproved,
                'approved_count' => count($approvedIds),
                'required_count' => count($requiredIds),
                'message' => $allApproved 
                    ? 'All documents verified. You may proceed to the Orientation stage.'
                    : 'Some documents are still pending approval.'
            ]);
        } catch (\Exception $e) {
            Log::error('Error checking document approval status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to check approval status'
            ], 500);
        }
    }

    // Review document submission (HR only)
    public function reviewSubmission(Request $request, $submissionId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:approved,rejected',
                'rejection_reason' => 'required_if:status,rejected|nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $submission = DocumentSubmission::findOrFail($submissionId);
            $application = $submission->application;
            
            $submission->update([
                'status' => $request->status,
                'rejection_reason' => $request->rejection_reason,
                'reviewed_at' => now(),
                'reviewed_by' => Auth::id()
            ]);

            // Reload submission with relationships
            $submission->load(['documentRequirement', 'reviewer']);

            // Send notification to applicant
            try {
                if ($application && $application->applicant && $application->applicant->user) {
                    $application->applicant->user->notify(new DocumentStatusChanged($submission));
                }
            } catch (\Exception $e) {
                Log::error('Error sending document status notification: ' . $e->getMessage());
            }

            // Check if all required documents are approved
            $allApproved = false;
            try {
                $requiredDocs = DocumentRequirement::where('application_id', $application->id)
                    ->where('is_required', true)
                    ->pluck('id');

                $approvedCount = DocumentSubmission::where('application_id', $application->id)
                    ->whereIn('document_requirement_id', $requiredDocs)
                    ->where('status', 'approved')
                    ->count();

                if ($requiredDocs->count() > 0 && $approvedCount === $requiredDocs->count()) {
                    $allApproved = true;
                    
                    // Update application status to "Orientation Schedule" if it's currently "Onboarding" or "Document Submission"
                    if (in_array($application->status, ['Onboarding', 'Document Submission'])) {
                        $application->update([
                            'status' => 'Orientation Schedule',
                            'reviewed_at' => now()
                        ]);
                        
                        // Send notification about moving to next stage
                        if ($application->applicant && $application->applicant->user) {
                            $application->applicant->user->notify(new \App\Notifications\OnboardingStatusChanged($application));
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::error('Error checking document approval status: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Document reviewed successfully',
                'data' => $submission,
                'all_documents_approved' => $allApproved,
                'application_status' => $application->status
            ]);
        } catch (\Exception $e) {
            Log::error('Error reviewing document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to review document'
            ], 500);
        }
    }

    // Download document
    public function downloadSubmission($submissionId)
    {
        try {
            $submission = DocumentSubmission::findOrFail($submissionId);
            
            if (!Storage::disk('public')->exists($submission->file_path)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File not found'
                ], 404);
            }

            $filePath = Storage::disk('public')->path($submission->file_path);
            return response()->download($filePath, $submission->file_name);
        } catch (\Exception $e) {
            Log::error('Error downloading document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to download document'
            ], 500);
        }
    }

    // Delete document submission
    public function deleteSubmission($submissionId)
    {
        try {
            $submission = DocumentSubmission::findOrFail($submissionId);
            
            // Check ownership
            $user = Auth::user();
            $isOwner = $submission->application->applicant_id === $user->id;
            $isHR = in_array($user->role_id, [2, 3]); // Assuming role_id 2 = HR Assistant, 3 = HR Staff
            
            if (!$isOwner && !$isHR) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            if (Storage::disk('public')->exists($submission->file_path)) {
                Storage::disk('public')->delete($submission->file_path);
            }

            $submission->delete();

            return response()->json([
                'success' => true,
                'message' => 'Document deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting document: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete document'
            ], 500);
        }
    }
}


