<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BenefitsEnrollment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BenefitsEnrollmentController extends Controller
{
    public function show(Request $request, $applicationId)
    {
        $application = Application::with(['applicant.user', 'jobPosting'])->findOrFail($applicationId);

        if (!$this->userCanAccessApplication($request->user(), $application)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $enrollment = BenefitsEnrollment::firstOrCreate(
            ['application_id' => $application->id],
            [
                'enrollment_status' => BenefitsEnrollment::STATUS_PENDING,
                'assigned_at' => Carbon::now(),
                'metadata' => $this->defaultMetadata(),
            ]
        );

        return response()->json($this->formatEnrollmentResponse($application, $enrollment));
    }

    public function update(Request $request, $applicationId)
    {
        $application = Application::with(['applicant.user', 'jobPosting'])->findOrFail($applicationId);

        if (!$this->userCanAccessApplication($request->user(), $application)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'enrollment_status' => 'required|in:pending,in_progress,completed',
            'selected_benefits' => 'array',
            'selected_benefits.*' => 'string',
            'sss_number' => 'nullable|string|max:50',
            'philhealth_number' => 'nullable|string|max:50',
            'pagibig_number' => 'nullable|string|max:50',
            'health_insurance_provider' => 'nullable|string|max:100',
            'health_insurance_plan' => 'nullable|string|max:100',
            'contribution_type' => 'nullable|string|max:50',
            'allowances' => 'array',
            'allowances.*.type' => 'required|string',
            'allowances.*.amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $enrollment = BenefitsEnrollment::firstOrCreate(
            ['application_id' => $application->id],
            [
                'enrollment_status' => BenefitsEnrollment::STATUS_PENDING,
                'assigned_at' => Carbon::now(),
                'metadata' => $this->defaultMetadata(),
            ]
        );

        $metadata = [
            'selected_benefits' => array_values($validated['selected_benefits'] ?? []),
            'fields' => [
                'sss_number' => $validated['sss_number'] ?? null,
                'philhealth_number' => $validated['philhealth_number'] ?? null,
                'pagibig_number' => $validated['pagibig_number'] ?? null,
                'health_insurance_provider' => $validated['health_insurance_provider'] ?? null,
                'health_insurance_plan' => $validated['health_insurance_plan'] ?? null,
                'contribution_type' => $validated['contribution_type'] ?? 'employee',
            ],
            'allowances' => $this->transformAllowances($validated['allowances'] ?? []),
            'notes' => $validated['notes'] ?? null,
            'last_updated_by' => Auth::id(),
            'last_updated_at' => Carbon::now()->toISOString(),
        ];

        $enrollment->metadata = $metadata;
        $enrollment->enrollment_status = $validated['enrollment_status'];

        if (!$enrollment->assigned_at) {
            $enrollment->assigned_at = Carbon::now();
        }

        $enrollment->save();

        $payload = $this->formatEnrollmentResponse($application, $enrollment->fresh());
        $payload['message'] = 'Benefits enrollment updated successfully.';

        return response()->json($payload);
    }

    private function transformAllowances(array $allowances): array
    {
        $normalized = [];

        foreach ($allowances as $allowance) {
            if (!isset($allowance['type'])) {
                continue;
            }

            $normalized[] = [
                'type' => $allowance['type'],
                'amount' => array_key_exists('amount', $allowance)
                    ? ($allowance['amount'] !== null ? (float) $allowance['amount'] : null)
                    : null,
            ];
        }

        return $normalized;
    }

    private function defaultMetadata(): array
    {
        return [
            'selected_benefits' => [],
            'fields' => [
                'sss_number' => null,
                'philhealth_number' => null,
                'pagibig_number' => null,
                'health_insurance_provider' => null,
                'health_insurance_plan' => null,
                'contribution_type' => 'employee',
            ],
            'allowances' => [],
            'notes' => null,
        ];
    }

    private function formatEnrollmentResponse(Application $application, BenefitsEnrollment $enrollment): array
    {
        $application->loadMissing(['applicant.user', 'jobPosting']);

        $metadata = $this->normalizeMetadata($enrollment->metadata ?? []);

        $personalInfo = [
            'application_id' => $application->id,
            'applicant_id' => $application->applicant_id,
            'name' => trim(
                ($application->applicant->first_name ?? '') . ' ' .
                ($application->applicant->last_name ?? '')
            ) ?: null,
            'email' => optional(optional($application->applicant)->user)->email
                ?? ($application->applicant->email ?? null),
            'position' => optional($application->jobPosting)->position,
            'department' => optional($application->jobPosting)->department,
        ];

        return [
            'success' => true,
            'application_id' => $application->id,
            'enrollment_status' => $enrollment->enrollment_status,
            'metadata' => $metadata,
            'personal_info' => $personalInfo,
            'available_benefits' => $this->availableBenefits(),
            'available_allowances' => $this->availableAllowances(),
            'benefits_enrollment' => [
                'id' => $enrollment->id,
                'assigned_at' => optional($enrollment->assigned_at)->toISOString(),
                'updated_at' => optional($enrollment->updated_at)->toISOString(),
            ],
        ];
    }

    private function normalizeMetadata(array $metadata): array
    {
        $fields = $metadata['fields'] ?? [];
        $allowancesMeta = $metadata['allowances'] ?? [];

        $allowances = [];
        foreach ($allowancesMeta as $allowance) {
            if (!isset($allowance['type'])) {
                continue;
            }

            $allowances[] = [
                'type' => $allowance['type'],
                'amount' => array_key_exists('amount', $allowance)
                    ? ($allowance['amount'] !== null ? (float) $allowance['amount'] : null)
                    : null,
            ];
        }

        return [
            'selected_benefits' => array_values($metadata['selected_benefits'] ?? []),
            'fields' => [
                'sss_number' => $fields['sss_number'] ?? null,
                'philhealth_number' => $fields['philhealth_number'] ?? null,
                'pagibig_number' => $fields['pagibig_number'] ?? null,
                'health_insurance_provider' => $fields['health_insurance_provider'] ?? null,
                'health_insurance_plan' => $fields['health_insurance_plan'] ?? null,
                'contribution_type' => $fields['contribution_type'] ?? 'employee',
            ],
            'allowances' => $allowances,
            'notes' => $metadata['notes'] ?? null,
        ];
    }

    private function availableBenefits(): array
    {
        return [
            [
                'key' => 'sss',
                'label' => 'SSS',
                'description' => 'Social Security System contributions',
            ],
            [
                'key' => 'philhealth',
                'label' => 'PhilHealth',
                'description' => 'PhilHealth coverage details',
            ],
            [
                'key' => 'pagibig',
                'label' => 'Pag-IBIG',
                'description' => 'Home Development Mutual Fund contributions',
            ],
        ];
    }

    private function availableAllowances(): array
    {
        return [
            ['key' => 'meal', 'label' => 'Meal Allowance'],
            ['key' => 'transport', 'label' => 'Transportation Allowance'],
            ['key' => 'housing', 'label' => 'Housing Allowance'],
            ['key' => 'internet', 'label' => 'Internet Allowance'],
        ];
    }

    private function userCanAccessApplication($user, Application $application): bool
    {
        if (!$user) {
            return false;
        }

        if ($application->applicant_id === $user->id) {
            return true;
        }

        $applicant = $application->applicant;
        if ($applicant && method_exists($applicant, 'user') && $applicant->user && $applicant->user->id === $user->id) {
            return true;
        }

        $roleName = strtolower($user->role->name ?? '');
        return in_array($roleName, ['hr assistant', 'hr staff', 'hr admin'], true);
    }
}
