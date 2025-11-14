<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BenefitsEnrollment;
use App\Models\DocumentRequirement;
use App\Models\DocumentSubmission;
use App\Models\DocumentFollowUpRequest;
use App\Notifications\DocumentStatusChanged;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\QueryException;

class DocumentController extends Controller
{
    private const SUBMISSION_WINDOW_DAYS = 10;
    private static bool $identifierColumnsEnsured = false;
    private static bool $benefitsTableEnsured = false;

    private const STATUS_META = [
        'not_submitted' => [
            'label' => 'Not Submitted',
            'badge' => 'secondary',
            'description' => 'Document has not been uploaded yet.',
        ],
        'pending' => [
            'label' => 'Pending',
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

    private const REVIEWED_STATUS_BASE_PATTERNS = [
        'received',
        'approved',
        'completed',
        'done',
    ];

    private function buildReviewedStatusClause(Builder $query): Builder
    {
        return $query->where(function (Builder $statusQuery) {
            foreach (self::REVIEWED_STATUS_BASE_PATTERNS as $index => $pattern) {
                $applyPattern = function (Builder $clause) use ($pattern) {
                    $patternLower = strtolower($pattern);
                    $clause
                        ->whereRaw("LOWER(TRIM(status)) = ?", [$patternLower])
                        ->orWhereRaw("LOWER(TRIM(status)) LIKE ?", ["{$patternLower} %"])
                        ->orWhereRaw("LOWER(TRIM(status)) LIKE ?", ["{$patternLower}_%"]);
                };

                if ($index === 0) {
                    $applyPattern($statusQuery);
                } else {
                    $statusQuery->orWhere(function (Builder $subQuery) use ($applyPattern) {
                        $applyPattern($subQuery);
                    });
                }
            }
        });
    }

    private function applyReviewedStatusFilter(Builder $query): Builder
    {
        return $this->buildReviewedStatusClause($query);
    }

    private function normalizeReviewedSubmissionStatuses(int $applicationId): void
    {
        try {
            $query = DocumentSubmission::query()->where('application_id', $applicationId);
            $this->buildReviewedStatusClause($query)->update(['status' => 'received']);
        } catch (\Throwable $e) {
            Log::warning('Failed to normalize document submission statuses.', [
                'application_id' => $applicationId,
                'error' => $e->getMessage(),
            ]);
        }
    }

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
            'is_required' => true,
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
            'is_required' => true,
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
            } else {
                $needsSave = false;

                if (!$existing->document_key) {
                    $existing->document_key = $documentKey;
                    $needsSave = true;
                }

                $desiredRequired = $definition['is_required'] ?? true;
                if ($existing->is_required !== $desiredRequired) {
                    $existing->is_required = $desiredRequired;
                    $needsSave = true;
                }

                if ($needsSave) {
                    $existing->save();
                }
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

    private function generateDocumentKey(string $name, int $applicationId, ?int $ignoreId = null): string
    {
        $base = Str::slug($name ?: 'additional-document');
        if (empty($base)) {
            $base = 'additional-document';
        }

        $prefix = 'additional-' . $base;
        $key = $prefix;
        $suffix = 1;

        while (
            DocumentRequirement::where('application_id', $applicationId)
                ->when($ignoreId, function ($query) use ($ignoreId) {
                    $query->where('id', '!=', $ignoreId);
                })
                ->where('document_key', $key)
                ->exists()
        ) {
            $key = $prefix . '-' . $suffix++;
        }

        return $key;
    }

    private function ensureDocumentKey(DocumentRequirement $requirement): string
    {
        if ($requirement->document_key) {
            return $requirement->document_key;
        }

        $resolved = $this->resolveDocumentKey($requirement);
        if ($resolved) {
            $requirement->document_key = $resolved;
            $requirement->save();

            return $resolved;
        }

        $generated = $this->generateDocumentKey(
            $requirement->document_name ?? 'Additional Requirement',
            $requirement->application_id,
            $requirement->id
        );

        $requirement->document_key = $generated;
        $requirement->save();

        return $generated;
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
        $statusMeta = self::STATUS_META[$submission->status] ?? [
            'label' => ucfirst($submission->status),
            'description' => null,
        ];
        $requiresHrReview = $submission->status !== 'received';
        $isOptionalRequirement = optional($submission->documentRequirement)->is_required === false;

        return [
            'id' => $submission->id,
            'document_requirement_id' => $submission->document_requirement_id,
            'document_type' => $submission->document_type ?? optional($submission->documentRequirement)->document_key,
            'file_path' => $submission->file_path,
            'file_name' => $submission->file_name,
            'file_type' => $submission->file_type,
            'file_size' => $submission->file_size,
            'sss_number' => $submission->sss_number,
            'philhealth_number' => $submission->philhealth_number,
            'pagibig_number' => $submission->pagibig_number,
            'tin_number' => $submission->tin_number,
            'status' => $submission->status,
            'status_label' => $statusMeta['label'] ?? ucfirst($submission->status),
            'status_description' => $statusMeta['description'] ?? null,
            'rejection_reason' => $submission->rejection_reason,
            'submitted_at' => optional($submission->submitted_at)->toISOString(),
            'reviewed_at' => optional($submission->reviewed_at)->toISOString(),
            'reviewed_by' => $submission->reviewed_by,
            'reviewer' => $submission->reviewer ? [
                'id' => $submission->reviewer->id,
                'name' => $submission->reviewer->name,
            ] : null,
            'requires_hr_review' => $requiresHrReview,
            'is_optional_requirement' => $isOptionalRequirement,
        ];
    }

    private function shouldLockUploads(?DocumentSubmission $submission, string $status): bool
    {
        if (!$submission) {
            return false;
        }

        if ($status === 'rejected') {
            return false;
        }

        return true;
    }

    private const COMPLETED_STATUSES = [
        'Orientation Schedule',
        'Starting Date',
        'Benefits Enroll',
        'Profile Creation',
        'Hired',
    ];

    private function getUploadLockReason(string $status): ?string
    {
        return match ($status) {
            'pending' => 'Upload locked while document is pending HR review.',
            'received' => 'Upload locked because the document is already approved.',
            default => null,
        };
    }

    private function getDocumentsCompletionMessage(): string
    {
        return 'Congratulations! You’ve completed all document requirements. Please wait for HR’s next update on your onboarding schedule.';
    }

    private function storeDocumentsSnapshotIfNeeded(Application $application, array $documents, array $statusCounts, bool $documentsCompleted): void
    {
        try {
            if (empty($documents)) {
                return;
            }

            $hasSubmittedDocument = collect($documents)->contains(function (array $document) {
                return !empty($document['submission']);
            });

            if (!$hasSubmittedDocument) {
                return;
            }

            $normalizedRequirements = collect($documents)
                ->map(function (array $document) {
                    $submission = $document['submission'] ?? null;

                    return [
                        'requirement_id' => $document['requirement_id'] ?? null,
                        'document_key' => $document['document_key'] ?? null,
                        'document_name' => $document['document_name'] ?? null,
                        'description' => $document['description'] ?? null,
                        'is_required' => (bool)($document['is_required'] ?? false),
                        'status' => $document['status'] ?? null,
                        'status_label' => $document['status_label'] ?? null,
                        'submission' => $submission ? [
                            'id' => $submission['id'] ?? null,
                            'document_requirement_id' => $submission['document_requirement_id'] ?? null,
                            'document_type' => $submission['document_type'] ?? null,
                            'file_name' => $submission['file_name'] ?? null,
                            'file_path' => $submission['file_path'] ?? null,
                            'file_type' => $submission['file_type'] ?? null,
                            'file_size' => $submission['file_size'] ?? null,
                            'status' => $submission['status'] ?? null,
                            'status_label' => $submission['status_label'] ?? null,
                            'submitted_at' => $submission['submitted_at'] ?? null,
                            'reviewed_at' => $submission['reviewed_at'] ?? null,
                            'reviewed_by' => $submission['reviewed_by'] ?? null,
                            'reviewer' => $submission['reviewer'] ?? null,
                            'rejection_reason' => $submission['rejection_reason'] ?? null,
                        ] : null,
                    ];
                })
                ->values()
                ->all();

            $snapshotPayload = [
                'captured_at' => now()->toIso8601String(),
                'requirements' => $normalizedRequirements,
                'status_counts' => $statusCounts,
                'completed' => $documentsCompleted,
                'completion_at' => optional($application->documents_approved_at)->toIso8601String(),
                'completion_message' => $documentsCompleted ? $this->getDocumentsCompletionMessage() : null,
            ];

            $existingSnapshot = $application->documents_snapshot ?? null;

            if ($existingSnapshot) {
                $existingComparable = [
                    'requirements' => $existingSnapshot['requirements'] ?? [],
                    'status_counts' => $existingSnapshot['status_counts'] ?? [],
                    'completed' => $existingSnapshot['completed'] ?? false,
                    'completion_at' => $existingSnapshot['completion_at'] ?? null,
                    'completion_message' => $existingSnapshot['completion_message'] ?? null,
                ];

                $newComparable = [
                    'requirements' => $snapshotPayload['requirements'],
                    'status_counts' => $snapshotPayload['status_counts'],
                    'completed' => $snapshotPayload['completed'],
                    'completion_at' => $snapshotPayload['completion_at'],
                    'completion_message' => $snapshotPayload['completion_message'],
                ];

                if ($existingComparable == $newComparable) {
                    return;
                }
            }

            $application->forceFill(['documents_snapshot' => $snapshotPayload])->save();
            $application->documents_snapshot = $snapshotPayload;
        } catch (\Throwable $e) {
            Log::error('Failed to persist documents snapshot', [
                'application_id' => $application->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function resolveSubmissionWindow(Application $application): array
    {
        $totalDays = config('onboarding.documents_submission_days', self::SUBMISSION_WINDOW_DAYS);
        $start = $application->documents_start_date;

        if (!$start) {
            return [
                'is_active' => false,
                'has_started' => false,
                'total_days' => $totalDays,
                'start_date' => null,
                'deadline' => null,
                'days_remaining' => null,
                'is_locked' => false,
                'locked_at' => null,
                'lock_reason' => null,
            ];
        }

        $deadline = $application->documents_deadline;
        $lockedAt = $application->documents_locked_at;

        $updates = [];

        if (!$deadline) {
            $deadline = $start->copy()->addDays($totalDays);
            $updates['documents_deadline'] = $deadline;
        }

        $now = Carbon::now();
        if ($deadline && $now->greaterThan($deadline) && !$lockedAt) {
            $lockedAt = $now;
            $updates['documents_locked_at'] = $lockedAt;
        }

        if (!empty($updates)) {
            $application->forceFill($updates)->save();
            $application->refresh();
            $start = $application->documents_start_date;
            $deadline = $application->documents_deadline;
            $lockedAt = $application->documents_locked_at;
        }

        $daysRemaining = $lockedAt
            ? 0
            : max(0, $now->startOfDay()->diffInDays($deadline->endOfDay(), false));

        return [
            'is_active' => true,
            'has_started' => true,
            'total_days' => $totalDays,
            'start_date' => $start ? $start->toIso8601String() : null,
            'deadline' => $deadline ? $deadline->toIso8601String() : null,
            'days_remaining' => $daysRemaining,
            'is_locked' => (bool) $lockedAt,
            'locked_at' => $lockedAt ? $lockedAt->toIso8601String() : null,
            'lock_reason' => $lockedAt
                ? 'Document submission period has ended. Please contact HR for assistance.'
                : null,
        ];
    }

    private function buildDocumentOverview(Application $application): array
    {
        $this->ensureStandardRequirements($application);

        $application->load([
            'documentRequirements.latestSubmission',
            'documentRequirements.latestSubmission.reviewer',
            'documentFollowUpRequests',
        ]);

        $followUpsByDocument = $application->documentFollowUpRequests
            ->groupBy(function (DocumentFollowUpRequest $followUp) {
                return $followUp->document_key;
            });

        $submissionWindow = $this->resolveSubmissionWindow($application);
        $documents = $application->documentRequirements
            ->sortBy('order')
            ->values()
            ->map(function (DocumentRequirement $requirement) use ($submissionWindow, $followUpsByDocument, $application) {
                $documentKey = $this->ensureDocumentKey($requirement);
                $submission = $requirement->latestSubmission;
                $status = $submission ? $this->mapStatusForOverview($submission->status) : 'not_submitted';
                $statusMeta = self::STATUS_META[$status] ?? self::STATUS_META['not_submitted'];

                $documentFollowUps = $followUpsByDocument[$documentKey] ?? collect();
                $latestAcceptedFollowUp = $documentFollowUps
                    ->where('status', 'accepted')
                    ->sortByDesc(function (DocumentFollowUpRequest $request) {
                        return $request->extension_deadline ?? $request->responded_at ?? $request->created_at;
                    })
                    ->first();

                $latestFollowUp = $documentFollowUps
                    ->sortByDesc(function (DocumentFollowUpRequest $request) {
                        return $request->updated_at ?? $request->created_at;
                    })
                    ->first();

                $now = Carbon::now();

                $extensionDeadline = $latestAcceptedFollowUp?->extension_deadline;
                $extensionDaysRemaining = null;
                $extensionActive = false;
                $totalExtensionDays = (int) $documentFollowUps
                    ->where('status', 'accepted')
                    ->sum(function (DocumentFollowUpRequest $request) {
                        return (int) ($request->extension_days ?? 0);
                    });

                $baseTotalDays = (int) ($submissionWindow['total_days'] ?? self::SUBMISSION_WINDOW_DAYS);
                $overallTotalDays = $baseTotalDays + $totalExtensionDays;
                $baseDaysRemaining = $submissionWindow['days_remaining'] ?? null;
                if (is_numeric($baseDaysRemaining)) {
                    $baseDaysRemaining = (int) $baseDaysRemaining;
                } else {
                    $baseDaysRemaining = null;
                }

                if ($extensionDeadline instanceof Carbon) {
                    $extensionDaysRemaining = max(
                        0,
                        $now->startOfDay()->diffInDays(
                            $extensionDeadline->copy()->endOfDay(),
                            false
                        )
                    );
                    $extensionActive = $extensionDeadline->greaterThanOrEqualTo($now);
                }

                $extensionDaysRemainingInt = $extensionDaysRemaining !== null
                    ? (int) $extensionDaysRemaining
                    : null;

                $forceLock = (bool)($submissionWindow['is_locked'] ?? false);
                $lockUploads = $forceLock || $this->shouldLockUploads($submission, $status);

                if ($extensionActive) {
                    $forceLock = false;
                    $lockUploads = false;
                }

                $lockReason = $forceLock
                    ? ($submissionWindow['lock_reason'] ?? 'Document submission window has ended.')
                    : $this->getUploadLockReason($status);

                $isOptionalWithoutSubmission = !$requirement->is_required && !$submission;
                $requiresHrReview = $submission !== null && $submission->status !== 'received';

                if ($isOptionalWithoutSubmission) {
                    $statusMeta = [
                        'label' => 'Optional',
                        'badge' => 'secondary',
                        'description' => 'Optional document. HR review becomes available once the applicant uploads a file.',
                    ];
                }

                $documentsCompleted = $application->documents_completed_at !== null
                    || in_array($application->status, self::COMPLETED_STATUSES, true);

                if ($documentsCompleted) {
                    $statusMeta = [
                        'label' => 'Completed',
                        'badge' => 'success',
                        'description' => 'All document checks completed by HR.',
                    ];
                }

                return [
                    'requirement_id' => $requirement->id,
                    'document_key' => $documentKey,
                    'document_type' => $submission ? ($submission->document_type ?? $documentKey) : $documentKey,
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
                    'lock_uploads' => $lockUploads,
                    'can_upload' => !$lockUploads,
                    'upload_lock_reason' => $lockUploads ? $lockReason : null,
                    'requires_hr_review' => $requiresHrReview,
                    'review_actions_visible' => $requiresHrReview,
                    'is_optional_without_submission' => $isOptionalWithoutSubmission,
                    'submission_window' => [
                        'has_started' => $submissionWindow['has_started'] ?? false,
                        'is_active' => !$lockUploads,
                        'deadline' => $extensionActive && $extensionDeadline
                            ? $extensionDeadline->toIso8601String()
                            : ($submissionWindow['deadline'] ?? null),
                        'days_remaining' => $extensionActive && $extensionDeadline
                            ? $extensionDaysRemainingInt
                            : $baseDaysRemaining,
                        'extended' => $extensionActive,
                        'extension_days' => $extensionActive ? ($latestAcceptedFollowUp->extension_days ?? null) : null,
                        'extension_deadline' => $extensionActive && $extensionDeadline
                            ? $extensionDeadline->toIso8601String()
                            : null,
                        'total_days' => $extensionActive ? $overallTotalDays : $baseTotalDays,
                        'original_total_days' => $baseTotalDays,
                        'extension_days_total' => $totalExtensionDays,
                        'extension_days_active' => $extensionActive ? ($latestAcceptedFollowUp->extension_days ?? null) : null,
                    ],
                    'follow_up' => $latestFollowUp ? [
                        'id' => $latestFollowUp->id,
                        'status' => $latestFollowUp->status,
                        'message' => $latestFollowUp->message,
                        'submitted_at' => optional($latestFollowUp->created_at)->toIso8601String(),
                        'responded_at' => optional($latestFollowUp->responded_at)->toIso8601String(),
                        'hr_response' => $latestFollowUp->hr_response,
                        'extension_days' => $latestFollowUp->extension_days,
                        'extension_deadline' => optional($latestFollowUp->extension_deadline)->toIso8601String(),
                        'attachment_url' => $latestFollowUp->attachment_path
                            ? url("/api/applications/{$application->id}/documents/follow-ups/{$latestFollowUp->id}/attachment")
                            : null,
                    ] : null,
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

        $documentsCompleted = ($application->documents_approved_at !== null)
            || in_array($application->status, self::COMPLETED_STATUSES, true);
        $documentsCompletionMessage = $documentsCompleted ? $this->getDocumentsCompletionMessage() : null;
        $documentsCompletionAt = optional($application->documents_approved_at)->toIso8601String();

        $this->storeDocumentsSnapshotIfNeeded($application, $documents, $statusCounts, $documentsCompleted);

        return [
            'application_id' => $application->id,
            'documents' => $documents,
            'status_counts' => $statusCounts,
            'documents_submission_window' => $submissionWindow,
            'documents_submission_locked' => (bool)($submissionWindow['is_locked'] ?? false),
            'documents_submission_days_total' => $submissionWindow['total_days'] ?? self::SUBMISSION_WINDOW_DAYS,
            'documents_approved_at' => optional($application->documents_approved_at)->toIso8601String(),
            'last_updated_at' => now()->toISOString(),
            'documents_completed' => $documentsCompleted,
            'documents_completion_message' => $documentsCompletionMessage,
            'documents_completion_at' => $documentsCompletionAt,
            'documents_snapshot' => $application->documents_snapshot,
        ];
    }

    public function getOverview(Request $request, $applicationId)
    {
        try {
            $application = Application::with(['applicant.user'])->findOrFail($applicationId);

            try {
                $this->ensureBenefitsEnrollmentTable();
            } catch (\Throwable $tableError) {
                Log::warning('Unable to verify benefits_enrollments table during overview request.', [
                    'application_id' => $applicationId,
                    'error' => $tableError->getMessage(),
                ]);
            }

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

            $this->ensureDocumentKey($requirement);

            $application->loadMissing('benefitsEnrollment');
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
                ->get()
                ->map(function (DocumentRequirement $requirement) {
                    $this->ensureDocumentKey($requirement);
                    return $requirement;
                })
                ->values();

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
            $documentKey = $this->generateDocumentKey($request->document_name, $applicationId);

            $requirement = DocumentRequirement::create([
                'application_id' => $applicationId,
                'document_key' => $documentKey,
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
    public function deleteRequirement(Request $request, $applicationId, $requirementId)
    {
        try {
            $requirement = DocumentRequirement::with(['application', 'submissions'])->findOrFail($requirementId);

            if ((int) $requirement->application_id !== (int) $applicationId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document requirement not found for this application'
                ], 404);
            }

            $application = $requirement->application ?: Application::findOrFail($applicationId);

            if (!$this->userCanAccessApplication($request->user(), $application)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }
            
            // Delete associated submissions and files
            foreach ($requirement->submissions as $submission) {
                if (Storage::exists($submission->file_path)) {
                    Storage::delete($submission->file_path);
                }
                $submission->delete();
            }

            $requirement->delete();

            $overview = $this->buildDocumentOverview($application);

            return response()->json([
                'success' => true,
                'message' => 'Document requirement deleted successfully',
                'overview' => $overview
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
                ->get()
                ->map(function (DocumentSubmission $submission) {
                    $requiresHrReview = $submission->status !== 'received';
                    $isOptionalRequirement = optional($submission->documentRequirement)->is_required === false;

                    $submission->setAttribute('requires_hr_review', $requiresHrReview);
                    $submission->setAttribute('is_optional_requirement', $isOptionalRequirement);

                    return $submission;
                });

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
            $this->ensureGovernmentIdentifierColumns();

            $application = Application::findOrFail($applicationId);
            $requirement = DocumentRequirement::findOrFail($requirementId);

            if (!$this->userCanAccessApplication(Auth::user(), $application)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 403);
            }

            $documentKey = $this->ensureDocumentKey($requirement);
            $identifierFieldMap = [
                'sssDocument' => 'sss_number',
                'philhealthDocument' => 'philhealth_number',
                'pagibigDocument' => 'pagibig_number',
                'tinDocument' => 'tin_number',
            ];
            $identifierField = $identifierFieldMap[$documentKey] ?? null;

            $rules = [
                'file' => 'required|file|max:51200', // 50MB max
            ];

            if ($identifierField) {
                $rules[$identifierField] = 'nullable|string|max:50';
            }

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $submissionWindow = $this->resolveSubmissionWindow($application);

            $activeExtension = DocumentFollowUpRequest::where('application_id', $applicationId)
                ->where('document_requirement_id', $requirementId)
                ->where('status', 'accepted')
                ->whereNotNull('extension_deadline')
                ->orderByDesc('extension_deadline')
                ->first();

            $extensionActive = false;
            if ($activeExtension && $activeExtension->extension_deadline) {
                $extensionDeadline = $activeExtension->extension_deadline instanceof Carbon
                    ? $activeExtension->extension_deadline
                    : Carbon::parse($activeExtension->extension_deadline);

                if ($extensionDeadline->copy()->endOfDay()->isFuture()) {
                    $extensionActive = true;
                }
            }

            if (($submissionWindow['is_locked'] ?? false) && !$extensionActive) {
                return response()->json([
                    'success' => false,
                    'message' => $submissionWindow['lock_reason']
                        ?? 'Document submission period has ended. Please contact HR.',
                ], 403);
            }

            // Validate file format if specified
            if ($requirement->file_format) {
                $allowedFormats = collect(explode(',', $requirement->file_format))
                    ->map(fn ($ext) => strtolower(trim($ext)))
                    ->filter()
                    ->values()
                    ->all();

                $fileExtension = strtolower($request->file('file')->getClientOriginalExtension());

                if (!empty($allowedFormats) && !in_array($fileExtension, $allowedFormats, true)) {
                    $formattedList = collect($allowedFormats)
                        ->map(fn ($ext) => strtoupper($ext))
                        ->join(', ');

                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid file format. Allowed formats: ' . $formattedList
                    ], 422);
                }
            }

            // Validate file size
            $maxSize = $requirement->max_file_size_mb;
            $fileSizeMB = $request->file('file')->getSize() / (1024 * 1024);
            if (is_numeric($maxSize) && $maxSize > 0 && $fileSizeMB > $maxSize) {
                return response()->json([
                    'success' => false,
                    'message' => 'File size exceeds maximum allowed size of ' . $maxSize . 'MB'
                ], 422);
            }

            // Store file
            $file = $request->file('file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('document_submissions/' . $applicationId, $fileName, 'public');

            $existingSubmission = DocumentSubmission::where('application_id', $applicationId)
                ->where('document_requirement_id', $requirementId)
                ->first();

            $existingFilePath = $existingSubmission?->file_path;
            if (is_string($existingFilePath) && $existingFilePath !== '' && Storage::disk('public')->exists($existingFilePath)) {
                Storage::disk('public')->delete($existingFilePath);
            }

            $documentType = $requirement->document_key ?? $request->input('document_type');
            if (!$documentType) {
                $documentType = 'requirement_' . $requirementId;
            }

            $identifierValue = null;
            if ($identifierField) {
                $rawIdentifier = $request->input($identifierField);
                if ($rawIdentifier !== null) {
                    $trimmedIdentifier = trim((string) $rawIdentifier);
                    $identifierValue = $trimmedIdentifier !== '' ? $trimmedIdentifier : null;
                } elseif ($existingSubmission) {
                    $identifierValue = $existingSubmission->{$identifierField};
                }
            }

            $attributes = [
                'document_type' => $documentType,
                'file_path' => $filePath,
                'file_name' => $file->getClientOriginalName(),
                'file_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
                'status' => 'pending',
                'submitted_at' => now(),
                'reviewed_at' => null,
                'reviewed_by' => null,
                'rejection_reason' => null,
            ];

            if ($identifierField) {
                $attributes[$identifierField] = $identifierValue;
            }

            $submission = DocumentSubmission::updateOrCreate(
                [
                    'application_id' => $applicationId,
                    'document_requirement_id' => $requirementId
                ],
                $attributes
            );

            $overview = $this->buildDocumentOverview($application->fresh());

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $submission->load('documentRequirement'),
                'overview' => $overview,
            ]);
        } catch (\Exception $e) {
            Log::error(sprintf(
                'Error uploading document (application_id=%s, requirement_id=%s): %s',
                $applicationId,
                $requirementId,
                $e->getMessage()
            ), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document'
            ], 500);
        }
    }

    private function ensureGovernmentIdentifierColumns(): void
    {
        if (self::$identifierColumnsEnsured) {
            return;
        }

        $columns = [
            'sss_number',
            'philhealth_number',
            'pagibig_number',
            'tin_number',
        ];

        $missing = array_filter($columns, fn ($column) => !Schema::hasColumn('document_submissions', $column));

        if (!empty($missing)) {
            Schema::table('document_submissions', function (Blueprint $table) use ($missing) {
                if (in_array('sss_number', $missing, true)) {
                    $table->string('sss_number', 50)->nullable();
                }
                if (in_array('philhealth_number', $missing, true)) {
                    $table->string('philhealth_number', 50)->nullable();
                }
                if (in_array('pagibig_number', $missing, true)) {
                    $table->string('pagibig_number', 50)->nullable();
                }
                if (in_array('tin_number', $missing, true)) {
                    $table->string('tin_number', 50)->nullable();
                }
            });
        }

        self::$identifierColumnsEnsured = true;
    }

    private function ensureBenefitsEnrollmentTable(): void
    {
        if (self::$benefitsTableEnsured) {
            return;
        }

        try {
            if (!Schema::hasTable('benefits_enrollments')) {
                Schema::create('benefits_enrollments', function (Blueprint $table) {
                    $table->id();
                    $table->foreignId('application_id')
                        ->constrained()
                        ->cascadeOnDelete()
                        ->unique();
                    $table->string('enrollment_status')->default(BenefitsEnrollment::STATUS_PENDING);
                    $table->timestamp('assigned_at')->nullable();
                    $table->json('metadata')->nullable();
                    $table->timestamps();
                });
            }

            self::$benefitsTableEnsured = true;
        } catch (\Throwable $e) {
            Log::warning('Failed to ensure benefits_enrollments table exists.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    // Submit all uploaded documents for HR review
    public function submitDocuments(Request $request, $applicationId)
    {
        try {
            $application = Application::findOrFail($applicationId);

            $submissionWindow = $this->resolveSubmissionWindow($application);
            if ($submissionWindow['is_locked'] ?? false) {
                return response()->json([
                    'success' => false,
                    'message' => $submissionWindow['lock_reason']
                        ?? 'Document submission period has ended. Please contact HR.',
                ], 403);
            }

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
            $this->normalizeReviewedSubmissionStatuses($applicationId);

            $approvedSubmissions = $this->applyReviewedStatusFilter(
                DocumentSubmission::where('application_id', $applicationId)
                    ->whereIn('document_requirement_id', $requiredIds)
            )->get();

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
    public function reviewSubmission(Request $request, $applicationId, $submissionId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:approved,received,rejected',
                'rejection_reason' => 'required_if:status,rejected|nullable|string',
                'document_type' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $submission = DocumentSubmission::where('id', $submissionId)
                ->where('application_id', $applicationId)
                ->firstOrFail();

            $application = $submission->application;
            $status = $request->status === 'approved' ? 'received' : $request->status;

            $requestedDocumentType = $request->input('document_type');
            $currentDocumentType = $submission->document_type ?? optional($submission->documentRequirement)->document_key;
            if ($requestedDocumentType && $currentDocumentType && $requestedDocumentType !== $currentDocumentType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Document type mismatch for the specified submission.',
                ], 422);
            }

            if (!$currentDocumentType) {
                $currentDocumentType = $requestedDocumentType ?: optional($submission->documentRequirement)->document_key ?: 'requirement_' . $submission->document_requirement_id;
            }
            
            $submission->update([
                'document_type' => $currentDocumentType,
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
                $requiredDocs = DocumentRequirement::where('application_id', $applicationId)
                    ->where('is_required', true)
                    ->pluck('id');

                $this->normalizeReviewedSubmissionStatuses($applicationId);

                $approvedCount = $this->applyReviewedStatusFilter(
                    DocumentSubmission::where('application_id', $applicationId)
                        ->whereIn('document_requirement_id', $requiredDocs)
                )->count();

                if ($requiredDocs->count() > 0 && $approvedCount === $requiredDocs->count()) {
                    $allApproved = true;

                    $applicationUpdates = [
                        'reviewed_at' => Carbon::now(),
                    ];

                    if (!$application->documents_approved_at) {
                        $applicationUpdates['documents_approved_at'] = Carbon::now();
                    }

                    $application->update($applicationUpdates);
                } elseif ($status === 'rejected') {
                    $application->update([
                        'documents_approved_at' => null,
                        'documents_completed_at' => null,
                    ]);

                    BenefitsEnrollment::where('application_id', $application->id)->delete();
                }
            } catch (\Exception $e) {
                Log::error('Error checking document approval status: ' . $e->getMessage());
            }

            $application->refresh()->load('benefitsEnrollment');

            $overview = $this->buildDocumentOverview($application->fresh());

            return response()->json([
                'success' => true,
                'message' => 'Document reviewed successfully',
                'data' => $submission,
                'all_documents_approved' => $allApproved,
                'application_status' => $application->status,
                'documents_stage_status' => $application->documents_stage_status,
                'documents_status_label' => $application->documents_stage_status === 'completed'
                    ? 'Completed'
                    : ($allApproved ? 'Approved Documents' : 'In Progress'),
                'documents_completed_at' => optional($application->documents_completed_at)->toISOString(),
                'is_in_benefits_enrollment' => $application->benefitsEnrollment !== null,
                'benefits_enrollment_status' => optional($application->benefitsEnrollment)->enrollment_status,
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

    public function completeDocuments(Request $request, $applicationId)
    {
        try {
            $application = Application::with(['applicant.user'])->findOrFail($applicationId);

            $user = $request->user();
            $roleName = strtolower($user->role->name ?? '');
            $isHrRole = in_array($roleName, ['hr assistant', 'hr staff', 'hr admin'], true);

            if (!$user || !$isHrRole || !$this->userCanAccessApplication($user, $application)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized',
                ], 403);
            }

            $requiredDocs = DocumentRequirement::where('application_id', $applicationId)
                ->where('is_required', true)
                ->pluck('id');

            $this->normalizeReviewedSubmissionStatuses($applicationId);

            try {
                $this->ensureBenefitsEnrollmentTable();
            } catch (\Throwable $tableError) {
                Log::warning('Unable to verify benefits_enrollments table during completion.', [
                    'application_id' => $applicationId,
                    'error' => $tableError->getMessage(),
                ]);
            }

            $now = Carbon::now();
            $applicationUpdates = [
                'documents_approved_at' => $application->documents_approved_at ?: $now,
                'documents_completed_at' => $now,
                'reviewed_at' => $now,
            ];

            $terminalStatuses = [
                'Benefits Enroll',
                'Orientation Schedule',
                'Starting Date',
                'Profile Creation',
                'Hired',
            ];

            if (!in_array($application->status, $terminalStatuses, true)) {
                $applicationUpdates['status'] = 'Benefits Enroll';
            }

            try {
                $application->update($applicationUpdates);
            } catch (QueryException $e) {
                $message = $e->getMessage();
                if (isset($applicationUpdates['status']) &&
                    str_contains(strtolower($message), 'incorrect enum value')) {
                    Log::warning('Unable to set application status to Benefits Enroll due to enum constraint.', [
                        'application_id' => $application->id,
                        'error' => $message,
                    ]);

                    unset($applicationUpdates['status']);
                    $application->forceFill($applicationUpdates)->save();
                } else {
                    throw $e;
                }
            }

            $benefitsEnrollment = null;
            try {
                if (Schema::hasTable('benefits_enrollments')) {
                    $benefitsEnrollment = BenefitsEnrollment::updateOrCreate(
                        ['application_id' => $application->id],
                        [
                            'enrollment_status' => BenefitsEnrollment::STATUS_PENDING,
                            'assigned_at' => $now,
                        ]
                    );
                } else {
                    Log::warning('Benefits enrollment table missing; skipping record creation.', [
                        'application_id' => $application->id,
                    ]);
                }
            } catch (QueryException $benefitsException) {
                Log::error('Unable to create or update benefits enrollment record.', [
                    'application_id' => $application->id,
                    'error' => $benefitsException->getMessage(),
                ]);
            }

            $application->refresh()->load([
                'benefitsEnrollment',
                'documentRequirements.documentSubmissions',
                'documentSubmissions',
            ]);

            $overview = null;

            try {
                $overview = $this->buildDocumentOverview($application);
            } catch (\Throwable $overviewException) {
                Log::warning('Unable to build document overview after completion.', [
                    'application_id' => $application->id,
                    'error' => $overviewException->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Document submission marked as completed.',
                'documents_completed' => true,
                'documents_stage_status' => $application->documents_stage_status,
                'documents_status_label' => 'Completed',
                'documents_completed_at' => optional($application->documents_completed_at)->toISOString(),
                'application_status' => $application->status,
                'is_in_benefits_enrollment' => $application->benefitsEnrollment !== null,
                'benefits_enrollment_status' => optional($application->benefitsEnrollment)->enrollment_status,
                'benefits_enrollment' => $benefitsEnrollment,
                'overview' => $overview,
            ]);
        } catch (\Exception $e) {
            Log::error('Error completing document submission: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Unable to finalize the document submission. Please try again or contact support.',
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


