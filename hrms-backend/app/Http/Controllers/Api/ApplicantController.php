<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Applicant;
use App\Models\Role;
use App\Models\EmailVerification;
use App\Models\SecuritySettings;
use App\Mail\EmailVerificationCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class ApplicantController extends Controller
{
    public function register(Request $request)
    {
        // Validate the incoming request
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name'  => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email|unique:applicants,email',
            'password'   => [
                'required',
                'confirmed',
                'min:12',
                'max:16',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/',
            ],
            'phone'      => 'required|string|size:11|regex:/^09\d{9}$/',
            'resume'     => 'nullable|string|max:1000',
        ], [
            'password.min' => 'Password must be at least 12 characters long.',
            'password.max' => 'Password must not exceed 16 characters.',
            'password.regex' => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
            'phone.required' => 'Phone number is required.',
            'phone.size' => 'Phone number must be exactly 11 digits.',
            'phone.regex' => 'Phone number must be a valid Philippine mobile number starting with 09.',
        ]);

        // Check for password uniqueness
        $existingPassword = User::where('password', Hash::make($request->password))->exists();
        if ($existingPassword) {
            return response()->json([
                'message' => 'This password has already been used by another account. Please choose a different password.',
                'errors' => ['password' => ['This password has already been used by another account.']]
            ], 422);
        }

        // Check if 2FA is enabled
        $settings = SecuritySettings::getSettings();
        $twoFactorEnabled = $settings->two_factor_auth === true;

        // If 2FA is disabled, complete registration immediately
        if (!$twoFactorEnabled) {
            // Get the Applicant role ID dynamically
            $applicantRole = Role::where('name', 'Applicant')->first();
            if (!$applicantRole) {
                return response()->json([
                    'message' => 'Applicant role not found. Please contact system administrator.',
                    'errors' => ['system' => ['System configuration error']]
                ], 500);
            }

            // Create the user with Applicant role
            $user = User::create([
                'first_name' => $request->first_name,
                'last_name'  => $request->last_name,
                'email'      => $request->email,
                'password'   => Hash::make($request->password),
                'role_id'    => $applicantRole->id,
            ]);

            // Create the applicant profile
            Applicant::create([
                'user_id'        => $user->id,
                'first_name' => $request->first_name,
                'last_name'  => $request->last_name,
                'email'          => $request->email,
                'contact_number' => $request->phone ?? null,
                'resume_path'    => $request->resume ?? null,
            ]);

            return response()->json([
                'message' => 'Registration completed successfully.',
                'requires_verification' => false,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->first_name . ' ' . $user->last_name,
                    'email' => $user->email,
                ]
            ], 200);
        }

        // 2FA is enabled - require email verification
        // Check if there's an existing unverified verification for this email
        $existingVerification = EmailVerification::where('email', $request->email)
            ->where('verified', false)
            ->where('expires_at', '>', now())
            ->first();

        // Generate a 6-digit verification code
        $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store registration data
        $registrationData = [
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => $request->password,
            'phone' => $request->phone,
            'resume' => $request->resume ?? null,
        ];

        // Create or update email verification record
        if ($existingVerification) {
            $existingVerification->update([
                'verification_code' => $verificationCode,
                'registration_data' => $registrationData,
                'expires_at' => Carbon::now()->addMinutes(15),
                'verified' => false,
                'verified_at' => null,
            ]);
            $emailVerification = $existingVerification;
        } else {
            $emailVerification = EmailVerification::create([
                'email' => $request->email,
                'verification_code' => $verificationCode,
                'registration_data' => $registrationData,
                'expires_at' => Carbon::now()->addMinutes(15),
                'verified' => false,
            ]);
        }

        // Send verification code email
        try {
            Mail::to($request->email)->send(new EmailVerificationCode(
                $request->email,
                $verificationCode,
                $request->first_name
            ));
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send verification email. Please try again.',
                'errors' => ['email' => ['Email sending failed. Please check your email address and try again.']]
            ], 500);
        }

        return response()->json([
            'message' => 'Verification code has been sent to your email address. Please verify to complete registration.',
            'email' => $request->email,
            'requires_verification' => true
        ], 200);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'verification_code' => 'required|string|size:6',
        ]);

        $emailVerification = EmailVerification::where('email', $request->email)
            ->where('verification_code', $request->verification_code)
            ->where('verified', false)
            ->first();

        if (!$emailVerification) {
            return response()->json([
                'message' => 'Invalid verification code or email address.',
                'errors' => ['verification_code' => ['The verification code is invalid or has already been used.']]
            ], 422);
        }

        if ($emailVerification->isExpired()) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new code.',
                'errors' => ['verification_code' => ['The verification code has expired.']]
            ], 422);
        }

        // Check if email is still unique (in case someone else registered in the meantime)
        $registrationData = $emailVerification->registration_data;
        
        if (User::where('email', $registrationData['email'])->exists() || 
            Applicant::where('email', $registrationData['email'])->exists()) {
            return response()->json([
                'message' => 'This email address has already been registered.',
                'errors' => ['email' => ['This email address is already in use.']]
            ], 422);
        }

        // Get the Applicant role ID dynamically
        $applicantRole = Role::where('name', 'Applicant')->first();
        if (!$applicantRole) {
            return response()->json([
                'message' => 'Applicant role not found. Please contact system administrator.',
                'errors' => ['system' => ['System configuration error']]
            ], 500);
        }

        // Create the user with Applicant role
        $user = User::create([
            'first_name' => $registrationData['first_name'],
            'last_name'  => $registrationData['last_name'],
            'email'      => $registrationData['email'],
            'password'   => Hash::make($registrationData['password']),
            'role_id'    => $applicantRole->id,
        ]);

        // Create the applicant profile
        Applicant::create([
            'user_id'        => $user->id,
            'first_name' => $registrationData['first_name'],
            'last_name'  => $registrationData['last_name'],
            'email'          => $registrationData['email'],
            'contact_number' => $registrationData['phone'] ?? null,
            'resume_path'    => $registrationData['resume'] ?? null,
        ]);

        // Mark verification as verified
        $emailVerification->markAsVerified();

        return response()->json([
            'message' => 'Email verified successfully. Registration completed.',
            'user' => [
                'id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'email' => $user->email,
            ]
        ], 200);
    }

    public function resend(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $emailVerification = EmailVerification::where('email', $request->email)
            ->where('verified', false)
            ->first();

        if (!$emailVerification) {
            return response()->json([
                'message' => 'No pending verification found for this email address.',
                'errors' => ['email' => ['No pending verification found.']]
            ], 422);
        }

        // Generate a new 6-digit verification code
        $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Update verification record
        $emailVerification->update([
            'verification_code' => $verificationCode,
            'expires_at' => Carbon::now()->addMinutes(15),
        ]);

        // Send verification code email
        try {
            $registrationData = $emailVerification->registration_data;
            Mail::to($request->email)->send(new EmailVerificationCode(
                $request->email,
                $verificationCode,
                $registrationData['first_name'] ?? null
            ));
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send verification email. Please try again.',
                'errors' => ['email' => ['Email sending failed. Please check your email address and try again.']]
            ], 500);
        }

        return response()->json([
            'message' => 'Verification code has been resent to your email address.',
        ], 200);
    }
}
// This controller handles the registration of applicants with email verification.