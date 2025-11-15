<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\BenefitsEnrollment;
use App\Models\EmployeeProfile;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ProfileCreationController extends Controller
{
    /**
     * Persist personal information captured during profile creation
     * and link it to the employee records.
     */
    public function store(Request $request, Application $application): JsonResponse
    {
        $this->authorizeProfileCreation($request->user());

        $application->loadMissing(['applicant.user', 'jobPosting', 'benefitsEnrollment']);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'nickname' => ['required', 'string', 'max:255'],
            'civil_status' => ['required', 'string', 'max:255'],
            'gender' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date'],
            'age' => ['required', 'integer', 'min:0'],
            'company_email' => ['nullable', 'email', 'max:255'],
            'contact_number' => ['required', 'string', 'max:255'],
            'emergency_contact_name' => ['required', 'string', 'max:255'],
            'emergency_contact_phone' => ['required', 'string', 'max:255'],
            'province' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:255'],
            'postal_code' => ['required', 'string', 'max:20'],
            'present_address' => ['required', 'string', 'max:500'],
            'position' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'employment_status' => ['required', 'string', 'max:255'],
            'hire_date' => ['required', 'date'],
            'salary' => ['required', 'numeric'],
            'tenurity' => ['required', 'string', 'max:255'],
            'sss' => ['nullable', 'string', 'max:100'],
            'philhealth' => ['nullable', 'string', 'max:100'],
            'pagibig' => ['nullable', 'string', 'max:100'],
            'tin_no' => ['nullable', 'string', 'max:100'],
            'metadata.profile_photo_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $profile = DB::transaction(function () use ($validated, $application) {
            $applicant = $application->applicant;
            $user = $applicant?->user;

            [$firstName, $lastName] = $this->resolveNameParts(
                $validated['full_name'],
                $applicant?->first_name,
                $applicant?->last_name
            );

            // company_email is optional and only for display purposes
            // Do NOT use it to change the user's email
            // Ignore company_email from request - it's display-only (removed from processing)

            // CRITICAL: Do NOT create new user or change existing user
            // The applicant account must remain unchanged - they keep their original email and Applicant role
            // Only create EmployeeProfile linked to existing applicant user account
            if (!$user) {
                // If no user exists, we still shouldn't create one - this shouldn't happen
                // But if it does, link to applicant's existing user or create minimal user
                if ($applicant && $applicant->user) {
                    $user = $applicant->user;
                } else {
                    // Fallback: create user but keep original email and Applicant role
                    $user = $this->createUserFromApplicant(
                        $firstName,
                        $lastName,
                        $applicant?->email ?? $applicant?->user?->email ?? $this->generateFallbackEmail($validated['full_name']),
                        $applicant
                    );
                }
            } else {
                // Do NOT update user email or role - keep applicant account unchanged
                // Only update name if needed, but preserve email and role
                $this->updateUserRecordWithoutEmailOrRole($user, $firstName, $lastName);
                if ($applicant && !$applicant->user_id) {
                    $applicant->user_id = $user->id;
                    $applicant->save();
                }
            }

            // No need to guard email uniqueness since we're not changing emails
            // $this->guardUniqueEmployeeEmail($companyEmail, $user->id);

            // Use original user email for EmployeeProfile (for display/info purposes)
            // Do NOT use company_email - it's just for display in frontend
            $profileData = [
                'first_name' => $firstName,
                'last_name' => $lastName,
                'nickname' => $validated['nickname'],
                'email' => $user->email, // Use original applicant email, not company email
                'position' => $validated['position'],
                'department' => $validated['department'],
                'employment_status' => $validated['employment_status'],
                'hire_date' => Carbon::parse($validated['hire_date'])->toDateString(),
                'salary' => $validated['salary'],
                'contact_number' => $validated['contact_number'],
                'phone' => $validated['contact_number'],
                'province' => $validated['province'],
                'barangay' => $validated['barangay'],
                'city' => $validated['city'],
                'postal_code' => $validated['postal_code'],
                'present_address' => $validated['present_address'],
                'address' => $validated['present_address'],
                'emergency_contact_name' => $validated['emergency_contact_name'],
                'emergency_contact_phone' => $validated['emergency_contact_phone'],
                'civil_status' => $validated['civil_status'],
                'gender' => $validated['gender'],
                'birth_date' => Carbon::parse($validated['birth_date'])->toDateString(),
                'age' => $validated['age'],
                'tenurity' => $validated['tenurity'],
                'job_title' => $validated['position'],
                'sss' => $validated['sss'] ?? null,
                'philhealth' => $validated['philhealth'] ?? null,
                'pagibig' => $validated['pagibig'] ?? null,
                'tin_no' => $validated['tin_no'] ?? null,
                'status' => 'Active',
            ];

            $employeeProfile = EmployeeProfile::updateOrCreate(
                ['user_id' => $user->id],
                $profileData
            );

            if ($applicant) {
                // CRITICAL: Do NOT update applicant email - preserve original registration email
                // Only update name if needed
                $applicant->update([
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    // DO NOT update email - keep original registration email
                ]);
            }

            $this->updateApplicationWorkflow($application, $validated, $employeeProfile);

            return $employeeProfile->fresh(['user']);
        });

        Cache::forget('employees_list');

        $application->refresh()->load(['benefitsEnrollment']);

        return response()->json([
            'success' => true,
            'message' => 'Personal information saved and linked to employee records.',
            'employee_profile' => $profile,
            'application' => $application,
        ]);
    }

    protected function authorizeProfileCreation(?User $user): void
    {
        $roleName = strtolower($user?->role?->name ?? '');

        if (!in_array($roleName, ['hr assistant', 'hr staff', 'hr admin'], true)) {
            abort(403, 'Unauthorized');
        }
    }

    protected function resolveNameParts(string $fullName, ?string $fallbackFirst, ?string $fallbackLast): array
    {
        $trimmed = trim(preg_replace('/\s+/', ' ', $fullName));

        if ($trimmed === '') {
            return [
                $fallbackFirst ?? 'Unknown',
                $fallbackLast ?? '',
            ];
        }

        $parts = explode(' ', $trimmed);
        $first = array_shift($parts) ?: ($fallbackFirst ?? 'Unknown');
        $last = count($parts) > 0 ? implode(' ', $parts) : ($fallbackLast ?? '');

        return [$first, $last];
    }

    protected function createUserFromApplicant(string $firstName, string $lastName, string $email, ?object $applicant): User
    {
        // CRITICAL: Keep Applicant role, do NOT change to Employee role
        // Applicant should remain as Applicant and only access JobPortal
        $applicantRoleId = Role::where('name', 'Applicant')->value('id');

        $user = User::create([
            'first_name' => $firstName,
            'last_name' => $lastName ?: 'Applicant',
            'email' => $email, // Use original email
            'password' => Hash::make(Str::random(16)),
            // Keep Applicant role - do NOT change to Employee
            'role_id' => $applicant?->user?->role_id ?? $applicantRoleId ?? null,
        ]);

        if ($applicant) {
            $applicant->user_id = $user->id;
            $applicant->save();
        }

        return $user;
    }

    protected function updateUserRecordWithoutEmailOrRole(User $user, string $firstName, string $lastName): void
    {
        // CRITICAL: Do NOT change user email or role
        // Only update name if needed, but preserve original email and Applicant role
        // The applicant must keep their original registration email for JobPortal access
        
        // Store original values for verification
        $originalEmail = $user->email;
        $originalRoleId = $user->role_id;
        
        $user->first_name = $firstName;
        $user->last_name = $lastName ?: $user->last_name;
        // DO NOT change email
        // DO NOT change role - keep Applicant role
        
        // Verify email and role are not changed before saving
        if ($user->email !== $originalEmail) {
            Log::error('CRITICAL: Email was changed in updateUserRecordWithoutEmailOrRole!', [
                'user_id' => $user->id,
                'original_email' => $originalEmail,
                'new_email' => $user->email
            ]);
            // Restore original email
            $user->email = $originalEmail;
        }
        
        if ($user->role_id !== $originalRoleId) {
            Log::error('CRITICAL: Role was changed in updateUserRecordWithoutEmailOrRole!', [
                'user_id' => $user->id,
                'original_role_id' => $originalRoleId,
                'new_role_id' => $user->role_id
            ]);
            // Restore original role
            $user->role_id = $originalRoleId;
        }
        
        $user->save();
        
        Log::info('User record updated (email and role preserved)', [
            'user_id' => $user->id,
            'email' => $user->email,
            'role_id' => $user->role_id
        ]);
    }

    // DEPRECATED: This method should not be used - it changes email and role
    // Kept for backward compatibility but not called
    protected function updateUserRecord(User $user, string $firstName, string $lastName, ?string $companyEmail): void
    {
        // This method is deprecated - use updateUserRecordWithoutEmailOrRole instead
        // CRITICAL: Do NOT use this method - it changes email and role which we don't want
        $this->updateUserRecordWithoutEmailOrRole($user, $firstName, $lastName);
    }

    protected function guardUniqueEmployeeEmail(?string $email, int $userId): void
    {
        if (!$email) {
            return;
        }

        $exists = EmployeeProfile::where('email', $email)
            ->where('user_id', '!=', $userId)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'company_email' => 'The generated company email is already used by another employee.',
            ]);
        }
    }

    protected function updateApplicationWorkflow(Application $application, array $validated, EmployeeProfile $employeeProfile): void
    {
        $now = Carbon::now();

        if ($application->status !== 'Hired') {
            $application->status = 'Hired';
        }

        $application->reviewed_at = $now;
        $application->save();

        if ($application->benefitsEnrollment) {
            $application->benefitsEnrollment->update([
                'enrollment_status' => BenefitsEnrollment::STATUS_COMPLETED,
            ]);
        } else {
            BenefitsEnrollment::updateOrCreate(
                ['application_id' => $application->id],
                [
                    'enrollment_status' => BenefitsEnrollment::STATUS_COMPLETED,
                    'assigned_at' => $now,
                ]
            );
        }

        if (Schema::hasTable('onboarding_records')) {
            DB::table('onboarding_records')->updateOrInsert(
                ['application_id' => $application->id],
                [
                    'employee_name' => $validated['full_name'],
                    'employee_email' => $employeeProfile->email, // Use original applicant email
                    'position' => $validated['position'],
                    'department' => $validated['department'],
                    'onboarding_status' => 'profile_completed',
                    'progress' => 100,
                    'notes' => 'Profile creation completed automatically via HR portal.',
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }

    protected function generateFallbackEmail(string $fullName): string
    {
        $slug = Str::slug($fullName);
        $suffix = Str::random(4);

        return $slug
            ? "{$slug}.{$suffix}@generated.local"
            : "employee.{$suffix}@generated.local";
    }
}


