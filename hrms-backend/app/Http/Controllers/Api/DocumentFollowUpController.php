<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\DocumentFollowUpRequest;
use App\Models\DocumentRequirement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

class DocumentFollowUpController extends Controller
{
    public function index(Request $request, $applicationId)
    {
        $application = Application::with(['applicant.user', 'documentRequirements'])
            ->findOrFail($applicationId);

        $user = $request->user();

        $canAccess = $this->userCanAccessFollowUps($user, $application);

        if (!$canAccess) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $requests = DocumentFollowUpRequest::with(['documentRequirement', 'applicant', 'hrUser'])
            ->where('application_id', $application->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(function (DocumentFollowUpRequest $followUp) use ($application) {
                $documentRequirement = $followUp->documentRequirement;
                $applicant = $application->applicant;

                $applicantName = $applicant
                    ? trim(($applicant->first_name ?? '') . ' ' . ($applicant->last_name ?? ''))
                    : null;

                $attachmentUrl = $followUp->attachment_path
                    ? url("/api/applications/{$application->id}/documents/follow-ups/{$followUp->id}/attachment")
                    : null;

                return [
                    'id' => $followUp->id,
                    'application_id' => $followUp->application_id,
                    'document_key' => $followUp->document_key,
                    'document_requirement_id' => $followUp->document_requirement_id,
                    'document_name' => $documentRequirement->document_name ?? $followUp->document_key,
                    'message' => $followUp->message,
                    'status' => $followUp->status,
                    'sent_at' => optional($followUp->created_at)->toIso8601String(),
                    'attachment_url' => $attachmentUrl,
                    'attachment_name' => $followUp->attachment_name,
                    'extension_days' => $followUp->extension_days,
                    'extension_deadline' => optional($followUp->extension_deadline)->toIso8601String(),
                    'hr_response' => $followUp->hr_response,
                    'responded_at' => optional($followUp->responded_at)->toIso8601String(),
                    'hr_user' => $followUp->hrUser ? [
                        'id' => $followUp->hrUser->id,
                        'name' => $followUp->hrUser->name ?? trim(($followUp->hrUser->first_name ?? '') . ' ' . ($followUp->hrUser->last_name ?? '')),
                        'email' => $followUp->hrUser->email ?? null,
                    ] : null,
                    'applicant_name' => $applicantName ?: 'Applicant',
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    public function store(Request $request, $applicationId)
    {
        $application = Application::with(['applicant.user', 'documentRequirements'])
            ->findOrFail($applicationId);

        $user = $request->user();

        if (!$user || !$application->applicant || !$application->applicant->user || $application->applicant->user->id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'document_key' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
            'attachment' => [
                'nullable',
                'file',
                'max:5120', // 5MB
                'mimes:pdf,jpg,jpeg,png',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid follow-up request.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $documentKey = $request->input('document_key');
        $message = $request->input('message');

        /** @var \App\Models\DocumentRequirement|null $documentRequirement */
        $documentRequirement = $this->findRequirementByKey($application, $documentKey);

        if (!$documentRequirement) {
            return response()->json([
                'success' => false,
                'message' => 'Document requirement not found.',
            ], 404);
        }

        $attachmentPath = null;
        $attachmentName = null;
        $attachmentMime = null;
        $attachmentSize = null;

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $filename = time() . '_' . Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
            $extension = $file->getClientOriginalExtension();
            $storedName = $filename . '.' . $extension;

            $attachmentPath = $file->storeAs(
                'document_follow_ups/' . $application->id,
                $storedName,
                'public'
            );
            $attachmentName = $file->getClientOriginalName();
            $attachmentMime = $file->getClientMimeType();
            $attachmentSize = $file->getSize();
        }

        $followUp = DocumentFollowUpRequest::create([
            'application_id' => $application->id,
            'document_requirement_id' => $documentRequirement->id,
            'document_key' => $documentRequirement->document_key ?: $documentKey,
            'applicant_id' => $application->applicant_id,
            'message' => $message,
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentName,
            'attachment_mime' => $attachmentMime,
            'attachment_size' => $attachmentSize,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Follow-up request submitted successfully.',
            'data' => $followUp,
        ], 201);
    }

    public function accept(Request $request, $applicationId, $followUpId)
    {
        $followUp = $this->resolveFollowUpForHr($request, $applicationId, $followUpId);

        if ($followUp instanceof \Illuminate\Http\JsonResponse) {
            return $followUp;
        }

        $validator = Validator::make($request->all(), [
            'extension_days' => ['required', 'integer', 'min:1', 'max:90'],
            'hr_response' => ['required', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid response.',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($followUp->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'This follow-up request has already been processed.',
            ], 422);
        }

        $extensionDays = (int) $request->input('extension_days', 0);

        $followUp->loadMissing(['application', 'documentRequirement']);
        $application = $followUp->application;

        $defaultWindowDays = (int) config('onboarding.documents_submission_days', 10);
        $now = Carbon::now();

        $baseDeadline = $application?->documents_deadline
            ? $application->documents_deadline->copy()
            : null;

        if (!$baseDeadline && $application?->documents_start_date) {
            $baseDeadline = $application->documents_start_date->copy()->addDays($defaultWindowDays);
        }

        if (!$baseDeadline) {
            $baseDeadline = Carbon::now()->addDays($defaultWindowDays);
        }

        $latestAcceptedFollowUp = DocumentFollowUpRequest::where('application_id', $application->id)
            ->where('document_requirement_id', $followUp->document_requirement_id)
            ->where('status', 'accepted')
            ->whereNotNull('extension_deadline')
            ->orderByDesc('extension_deadline')
            ->first();

        if ($latestAcceptedFollowUp && $latestAcceptedFollowUp->extension_deadline) {
            $baseDeadline = $latestAcceptedFollowUp->extension_deadline->copy();
        }

        if ($baseDeadline->lessThan($now)) {
            $baseDeadline = $now;
        }

        $extensionDeadline = $baseDeadline->copy()->addDays($extensionDays);

        $followUp->update([
            'status' => 'accepted',
            'extension_days' => $extensionDays,
            'extension_deadline' => $extensionDeadline,
            'hr_response' => $request->input('hr_response'),
            'hr_user_id' => $request->user()->id,
            'responded_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Follow-up request accepted successfully.',
            'data' => $followUp->fresh(),
        ]);
    }

    public function reject(Request $request, $applicationId, $followUpId)
    {
        $followUp = $this->resolveFollowUpForHr($request, $applicationId, $followUpId);

        if ($followUp instanceof \Illuminate\Http\JsonResponse) {
            return $followUp;
        }

        $validator = Validator::make($request->all(), [
            'hr_response' => ['required', 'string', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid response.',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($followUp->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'This follow-up request has already been processed.',
            ], 422);
        }

        $followUp->update([
            'status' => 'rejected',
            'extension_days' => null,
            'extension_deadline' => null,
            'hr_response' => $request->input('hr_response'),
            'hr_user_id' => $request->user()->id,
            'responded_at' => Carbon::now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Follow-up request rejected.',
            'data' => $followUp->fresh(),
        ]);
    }

    protected function resolveFollowUpForHr(Request $request, $applicationId, $followUpId)
    {
        $application = Application::with(['applicant.user'])
            ->findOrFail($applicationId);

        $user = $request->user();

        if (!$this->userCanAccessFollowUps($user, $application, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        /** @var DocumentFollowUpRequest $followUp */
        $followUp = DocumentFollowUpRequest::where('application_id', $application->id)
            ->findOrFail($followUpId);

        return $followUp;
    }

    public function downloadAttachment(Request $request, $applicationId, $followUpId)
    {
        $followUp = $this->resolveFollowUpForAccess($request, $applicationId, $followUpId);

        if ($followUp instanceof \Illuminate\Http\JsonResponse) {
            return $followUp;
        }

        if (!$followUp->attachment_path || !Storage::disk('public')->exists($followUp->attachment_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Attachment not found.',
            ], 404);
        }

        $downloadName = $followUp->attachment_name ?: basename($followUp->attachment_path);

        $filePath = Storage::disk('public')->path($followUp->attachment_path);

        return response()->download($filePath, $downloadName);
    }

    protected function findRequirementByKey(Application $application, string $documentKey): ?DocumentRequirement
    {
        $normalizedKey = strtolower(trim($documentKey));

        $requirements = $application->documentRequirements;

        if (!$requirements instanceof \Illuminate\Support\Collection) {
            $requirements = $application->documentRequirements()->get();
        }

        return $requirements->first(function ($requirement) use ($normalizedKey) {
            if (!$requirement instanceof DocumentRequirement) {
                return false;
            }

            $key = strtolower($requirement->document_key ?? '');
            $name = strtolower($requirement->document_name ?? '');
            $description = strtolower($requirement->description ?? '');

            return $key === $normalizedKey
                || $name === $normalizedKey
                || str_contains($key, $normalizedKey)
                || str_contains($normalizedKey, $key)
                || str_contains($description, $normalizedKey);
        });
    }

    protected function userCanAccessFollowUps($user, Application $application, bool $mustBeHr = false): bool
    {
        if (!$user) {
            return false;
        }

        $applicantUserId = optional($application->applicant->user)->id ?? null;

        if (!$mustBeHr && $applicantUserId && $user->id === $applicantUserId) {
            return true;
        }

        $roleName = strtolower($user->role->name ?? '');

        return in_array($roleName, ['hr assistant', 'hr staff', 'hr admin'], true);
    }

    protected function resolveFollowUpForAccess(Request $request, $applicationId, $followUpId)
    {
        $application = Application::with(['applicant.user'])
            ->findOrFail($applicationId);

        $user = $request->user();

        if (!$this->userCanAccessFollowUps($user, $application)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return DocumentFollowUpRequest::where('application_id', $application->id)
            ->findOrFail($followUpId);
    }
}

