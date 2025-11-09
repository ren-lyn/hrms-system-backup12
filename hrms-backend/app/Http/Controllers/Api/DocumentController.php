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
    private const STATUS_META = [
        'not_submitted' => [
            'label' => 'Not Submitted',
            'badge' => 'secondary',
            'description' => 'Document has not been uploaded yet.',
        ],
        'pending' => [
            'label' => 'Pending Review',
            'badge' => 'warning',
            'description' => 'Document awaiting HR review.',
        ],
        'received' => [
            'label' => 'Approved',
            'badge' => 'success',
            'description' => 'Document approved by HR.',
        ],
        'rejected' => [
            'label' => 'Resubmission Required',
            'badge' => 'danger',
            'description' => 'HR requested a resubmission for this document.',
        ],
    ];

    private const STANDARD_DOCUMENT_LABELS = [
        'valid government id' => 'governmentId',
        'government id' => 'governmentId',
        'birth certificate (psa)' => 'birthCertificate',
        'birth certificate' => 'birthCertificate',
        'resume / curriculum vitae (cv)' => 'resume',
        'resume' => 'resume',
        'curriculum vitae' => 'resume',
        'diploma / transcript of records (tor)' => 'diploma',
        'diploma' => 'diploma',
        'transcript of records (tor)' => 'diploma',
        '2x2 or passport-size photo' => 'photo',
        'photo' => 'photo',
        'certificate of employment / recommendation letters' => 'employmentCertificate',
        'nbi or police clearance' => 'nbiClearance',
        'barangay clearance' => 'barangayClearance',
        'sss number' => 'sssDocument',
        'philhealth number' => 'philhealthDocument',
        'pag-ibig mid number' => 'pagibigDocument',
        'tin (tax identification number)' => 'tinDocument',
        'medical certificate / fit-to-work clearance' => 'medicalCertificate',
        'medical certificate' => 'medicalCertificate',
        'fit-to-work clearance' => 'medicalCertificate',
        'vaccination records' => 'vaccinationRecords',
    ];

    private const STANDARD_DOCUMENT_DEFINITIONS = [
        [
            'document_key' => 'governmentId',
            'document_name' => 'Valid Government ID',
            'description' => "Passport, Driver's License, UMID, or National ID",
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'birthCertificate',
            'document_name' => 'Birth Certificate (PSA)',
            'description' => 'Official PSA-issued certificate for age and identity verification',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'resume',
            'document_name' => 'Resume / Curriculum Vitae (CV)',
            'description' => 'Latest copy detailing education and work experience',
            'is_required' => true,
            'file_format' => 'pdf',
        ],
        [
            'document_key' => 'diploma',
            'document_name' => 'Diploma / Transcript of Records (TOR)',
            'description' => 'Proof of educational attainment',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'photo',
            'document_name' => '2x2 or Passport-size Photo',
            'description' => 'For company ID and personnel records (plain background preferred)',
            'is_required' => true,
            'file_format' => 'jpg,jpeg,png',
        ],
        [
            'document_key' => 'employmentCertificate',
            'document_name' => 'Certificate of Employment / Recommendation Letters',
            'description' => 'Proof of past work experience or references',
            'is_required' => false,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'nbiClearance',
            'document_name' => 'NBI or Police Clearance',
            'description' => 'Issued within the last six (6) months',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'barangayClearance',
            'document_name' => 'Barangay Clearance',
            'description' => 'Proof of good moral character and residency',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'sssDocument',
            'document_name' => 'SSS Number',
            'description' => 'SSS E-1/E-4 form or ID showing the number',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'philhealthDocument',
            'document_name' => 'PhilHealth Number',
            'description' => 'PhilHealth ID or MDR with visible number',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'pagibigDocument',
            'document_name' => 'Pag-IBIG MID Number',
            'description' => 'Document showing your Pag-IBIG MID/RTN number',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'tinDocument',
            'document_name' => 'TIN (Tax Identification Number)',
            'description' => 'BIR Form 1902/1905 or any document showing your TIN',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'medicalCertificate',
            'document_name' => 'Medical Certificate / Fit-to-Work Clearance',
            'description' => 'Issued by a licensed doctor or accredited clinic',
            'is_required' => true,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
        [
            'document_key' => 'vaccinationRecords',
            'document_name' => 'Vaccination Records',
            'description' => 'If required by the company or job role',
            'is_required' => false,
            'file_format' => 'pdf,jpg,jpeg,png',
        ],
    ];

    private function ensureStandardRequirements(Application $application): void
    {
        $definitions = collect(self::STANDARD_DOCUMENT_DEFINITIONS)->values();

        foreach ($definitions as $index => $definition) {
            $documentKey = $definition['document_key'];
            $documentName = $definition['document_name'];

            $existing = DocumentRequirement::where('application_id', $application->id)
                ->where(function ($query) use ($documentKey, $documentName) {
                    $query->where('document_key', $documentKey)
                        ->orWhereRaw('LOWER(document_name) = ?', [strtolower($documentName)]);
                })
                ->first();

            if (!$existing) {
                DocumentRequirement::create([
                    'application_id' => $application->id,
                    'document_key' => $documentKey,
                    'document_name' => $documentName,
                    'description' => $definition['description'] ?? null,
                    'is_required' => $definition['is_required'] ?? true,
                    'file_format' => $definition['file_format'] ?? 'pdf,jpg,jpeg,png',
                    'max_file_size_mb' => $definition['max_file_size_mb'] ?? 5,
                    'order' => $definition['order'] ?? ($index + 1),
                ]);
            } elseif (!$existing->document_key) {
                $existing->document_key = $documentKey;
                $existing->save();
            }
        }
    }


    private function userCanAccessApplication($user, Application $application): bool
    {
        if (!$user) {
            return false;
        }

        // Applicant that owns the application
        if ($application->applicant_id === $user->id) {
            return true;
        }

        if ($application->relationLoaded('applicant')) {
            $applicant = $application->applicant;
        } else {
            $applicant = $application->applicant()->first();
        }

        if ($applicant) {
            if (method_exists($applicant, 'user') && $applicant->relationLoaded('user')) {
                $applicantUser = $applicant->user;
            } elseif (method_exists($applicant, 'user')) {
                $applicantUser = $applicant->user()->first();
            } else {
                $applicantUser = null;
            }

            if ($applicantUser && $applicantUser->id === $user->id) {
                return true;
            }

            if (isset($applicant->user_id) && $applicant->user_id === $user->id) {
                return true;
            }
        }

        // HR roles
        $roleName = strtolower($user->role->name ?? '');
        return in_array($roleName, ['hr assistant', 'hr staff', 'hr admin'], true);
    }

    private function normalizeLabel(?string $value): string
    {
        if (!$value) {
            return '';
        }
        return strtolower(trim(preg_replace('/\s+/', ' ', $value)));
    }

    private function resolveDocumentKey(DocumentRequirement $requirement): ?string
    {
        $candidates = [
            $requirement->document_key ?? null,
            $requirement->document_name ?? null,
            $requirement->description ?? null,
        ];

        foreach ($candidates as $candidate) {
            $normalized = $this->normalizeLabel($candidate);
            if ($normalized && isset(self::STANDARD_DOCUMENT_LABELS[$normalized])) {
                return self::STANDARD_DOCUMENT_LABELS[$normalized];
            }
        }

        return $requirement->document_key ?? null;
    }

    private function mapStatusForOverview(?string $status): string
    {
        $normalized = strtolower((string) $status);
        return match ($normalized) {
            'received', 'approved' => 'received',
            'rejected' => 'rejected',
            'pending', 'pending_review', 'uploaded', 'submitted' => 'pending',
            default => 'not_submitted',
        };
    }

    private function transformSubmission(DocumentSubmission $submission): array
    {
        return [
            'id' => $submission->id,
            'document_requirement_id' => $submission->document_requirement_id,
            'file_path' => $submission->file_path,
            'file_name' => $submission->file_name,
            'file_type' => $submission->file_type,
            'file_size' => $submission->file_size,
            'status' => $submission->status,
            'rejection_reason' => $submission->rejection_reason,
            'submitted_at' => optional($submission->submitted_at)->toISOString(),
            'reviewed_at' => optional($submission->reviewed_at)->toISOString(),
            'reviewed_by' => $submission->reviewed_by,
            'reviewer' => $submission->reviewer ? [
                'id' => $submission->reviewer->id,
                'name' => $submission->reviewer->name,
            ] : null,
        ];
    }

    private function buildDocumentOverview(Application $application): array
    {
        $this->ensureStandardRequirements($application);

        $application->load([
            'documentRequirements.latestSubmission',
            'documentRequirements.latestSubmission.reviewer',
        ]);

        $documents = $application->documentRequirements
            ->sortBy('order')
            ->values()
            ->map(function (DocumentRequirement $requirement) {
                $documentKey = $this->resolveDocumentKey($requirement);
                $submission = $requirement->latestSubmission;
                $status = $submission ? $this->mapStatusForOverview($submission->status) : 'not_submitted';
                $statusMeta = self::STATUS_META[$status] ?? self::STATUS_META['not_submitted'];

                return [
                    'requirement_id' => $requirement->id,
                    'document_key' => $documentKey,
                    'document_name' => $requirement->document_name,
                    'description' => $requirement->description,
                    'is_required' => (bool) $requirement->is_required,
                    'file_format' => $requirement->file_format,
                    'max_file_size_mb' => $requirement->max_file_size_mb,
                    'order' => $requirement->order,
                    'status' => $status,
                    'status_label' => $statusMeta['label'],
                    'status_badge' => $statusMeta['badge'],
                    'status_description' => $statusMeta['description'],
                    'submission' => $submission ? $this->transformSubmission($submission) : null,
                ];
            })
            ->values()
            ->all();

        $statusCounts = [
            'not_submitted' => 0,
            'pending' => 0,
            'received' => 0,
            'rejected' => 0,
        ];

        foreach ($documents as $document) {
            $status = $document['status'];
            if (!isset($statusCounts[$status])) {
                $statusCounts[$status] = 0;
            }
            $statusCounts[$status]++;
        }

        return [
            'application_id' => $application->id,
            'documents' => $documents,
            'status_counts' => $statusCounts,
            'last_updated_at' => now()->toISOString(),
        ];
    }

    public function getOverview(Request $request, $applicationId)
    {
        try {
            $application = Application::with(['applicant.user'])->findOrFail($applicationId);

            if (!$this->userCanAccessApplication($request->user(), $application)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $this->buildDocumentOverview($application),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching document overview: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch document overview',
            ], 500);
        }
    }

    public function resolveRequirementByKey(Request $request, $applicationId, $documentKey)
    {
        try {
            $application = Application::with(['applicant.user'])->findOrFail($applicationId);

            if (!$this->userCanAccessApplication($request->user(), $application)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            $normalizedInput = $this->normalizeLabel($documentKey);
            $canonicalKey = self::STANDARD_DOCUMENT_LABELS[$normalizedInput] ?? $documentKey;

            $this->ensureStandardRequirements($application);

            $requirement = DocumentRequirement::where('application_id', $applicationId)
                ->where(function ($query) use ($canonicalKey, $documentKey) {
                    $query->where('document_key', $canonicalKey)
                        ->orWhereRaw('LOWER(document_key) = ?', [strtolower($canonicalKey)])
                        ->orWhereRaw('LOWER(document_name) = ?', [strtolower($documentKey)])
                        ->orWhereRaw('LOWER(document_name) = ?', [strtolower($canonicalKey)]);
                })
                ->first();

            if (!$requirement) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document requirement not found for the specified key.',
                ], 404);
            }

            $overview = $this->buildDocumentOverview($application->fresh());

            return response()->json([
                'success' => true,
                'message' => 'Document requirement resolved successfully.',
                'requirement' => $requirement,
                'overview' => $overview,
            ]);
        } catch (\Exception $e) {
            Log::error('Error resolving document requirement by key: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to resolve document requirement.',
            ], 500);
        }
    }

    // Get document requirements for an application
    public function getRequirements($applicationId)
    {
        try {
            $application = Application::findOrFail($applicationId);
            $this->ensureStandardRequirements($application);

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

            if (!$this->userCanAccessApplication(Auth::user(), $application)) {
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

            $existingSubmission = DocumentSubmission::where('application_id', $applicationId)
                ->where('document_requirement_id', $requirementId)
                ->first();

            if ($existingSubmission && Storage::disk('public')->exists($existingSubmission->file_path)) {
                Storage::disk('public')->delete($existingSubmission->file_path);
            }

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
                    'status' => 'pending',
                    'submitted_at' => now(),
                    'reviewed_at' => null,
                    'reviewed_by' => null,
                    'rejection_reason' => null,
                ]
            );

            $overview = $this->buildDocumentOverview($application->fresh());

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $submission->load('documentRequirement'),
                'overview' => $overview,
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
                ->where('status', 'pending')
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
                ->where('status', 'pending')
                ->update([
                    'submitted_at' => now(),
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Documents submitted successfully for HR review',
                'data' => DocumentSubmission::where('application_id', $applicationId)
                    ->where('status', 'pending')
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
                ->where('status', 'received')
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
                'status' => 'required|in:approved,received,rejected',
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
            $status = $request->status === 'approved' ? 'received' : $request->status;
            
            $submission->update([
                'status' => $status,
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
                    ->where('status', 'received')
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

            $overview = $this->buildDocumentOverview($application->fresh());

            return response()->json([
                'success' => true,
                'message' => 'Document reviewed successfully',
                'data' => $submission,
                'all_documents_approved' => $allApproved,
                'application_status' => $application->status,
                'overview' => $overview,
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


