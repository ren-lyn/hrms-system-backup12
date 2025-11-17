<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordChangeRequest;
use App\Models\PasswordAssistanceVerification;
use App\Models\User;
use App\Models\AuditLog;
use App\Models\SecuritySettings;
use App\Mail\PasswordResetLinkMail;
use App\Mail\PasswordAssistanceVerificationCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Notifications\PasswordChangeRequestSubmitted;

class PasswordChangeRequestController extends Controller
{
    public function store(Request $request)
    {
        // Check if 2FA is enabled
        $settings = SecuritySettings::getSettings();
        $twoFactorEnabled = $settings->two_factor_auth === true;

        // Make verification_code required only if 2FA is enabled
        $validationRules = [
            'full_name' => 'required_without:email|string|max:255|filled',
            'employee_id' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'email' => 'required|email|max:255',
            'reason' => 'nullable|string|max:2000',
        ];

        if ($twoFactorEnabled) {
            $validationRules['verification_code'] = 'required|string|size:6';
        } else {
            $validationRules['verification_code'] = 'nullable|string|size:6';
        }

        $validator = Validator::make($request->all(), $validationRules);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Verify email verification code only if 2FA is enabled
        if ($twoFactorEnabled) {
            $emailVerification = PasswordAssistanceVerification::where('email', $request->email)
                ->where('verification_code', $request->verification_code)
                ->where('verified', true)
                ->first();

            if (!$emailVerification) {
                return response()->json([
                    'message' => 'Invalid or missing verification code. Please verify your email first.',
                    'errors' => ['verification_code' => ['Invalid or missing verification code. Please verify your email first.']]
                ], 422);
            }

            if ($emailVerification->isExpired()) {
                return response()->json([
                    'message' => 'Verification code has expired. Please request a new code.',
                    'errors' => ['verification_code' => ['Verification code has expired.']]
                ], 422);
            }
        }

        $payload = $validator->validated();
        $user = $request->user();

        // Ensure full_name is always set - required by database schema
        $fullName = $payload['full_name'] ?? null;
        if (empty($fullName) && $user) {
            // Fallback to user's name if available
            $fullName = $user->name ?? $user->full_name ?? null;
        }
        if (empty($fullName)) {
            // Final fallback - use email or a default value
            $fullName = $payload['email'] ?? 'Unknown User';
        }

        $data = [
            'user_id' => $user?->id,
            'full_name' => trim($fullName),
            'employee_id' => $payload['employee_id'] ?? null,
            'department' => $payload['department'] ?? null,
            'email' => $payload['email'] ?? ($user?->email),
            'reason' => $payload['reason'] ?? null,
            'status' => 'pending',
        ];

        // Handle up to 2 image uploads
        $paths = [];
        foreach (['id_photo_1','id_photo_2'] as $idx => $key) {
            if ($request->hasFile($key) && $request->file($key)->isValid()) {
                $paths[$key] = $request->file($key)->store('password_requests', 'public');
            }
        }
        if (isset($paths['id_photo_1'])) $data['id_photo_1_path'] = $paths['id_photo_1'];
        if (isset($paths['id_photo_2'])) $data['id_photo_2_path'] = $paths['id_photo_2'];

        // Always write an audit log first so alerts can be generated even if DB create fails
        AuditLog::log($user?->id, 'Password change request submitted', 'success', $request->ip(), $request->userAgent(), [
            'email' => $data['email'] ?? null,
            'full_name' => $data['full_name'] ?? null,
            'department' => $data['department'] ?? null,
        ]);

        try {
            $requestModel = PasswordChangeRequest::create($data);
            // Notify admins immediately
            try {
                $admins = User::whereHas('role', function ($q) {
                    $q->whereIn('name', ['Admin', 'System Administrator', 'System Admin']);
                })->get();
                foreach ($admins as $admin) {
                    $admin->notify(new PasswordChangeRequestSubmitted($requestModel));
                }
                Log::info('Password change request notification sent to admins', [
                    'admins_notified' => $admins->count(),
                    'request_id' => $requestModel->id,
                    'email' => $requestModel->email,
                ]);
            } catch (\Throwable $notifyErr) {
                Log::error('Failed to send admin notification for password change request', [
                    'error' => $notifyErr->getMessage(),
                    'request_id' => $requestModel->id,
                ]);
            }
            return response()->json(['message' => 'Password change request submitted', 'id' => $requestModel->id, 'saved' => true], 201);
        } catch (\Throwable $e) {
            // Log the error for debugging
            Log::error('Password change request creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => array_merge($data, ['id_photo_1_path' => '***', 'id_photo_2_path' => '***'])
            ]);
            
            // Return error response with details in development, generic message in production
            $message = config('app.debug') 
                ? 'Failed to submit request: ' . $e->getMessage()
                : 'Failed to submit request. Please try again or contact support.';
            
            return response()->json(['message' => $message, 'saved' => false], 500);
        }
    }

    public function index()
    {
        $items = PasswordChangeRequest::latest()->limit(50)->get();
        
        // Add URL fields for ID photos if paths exist
        $items->transform(function ($item) {
            if ($item->id_photo_1_path) {
                $item->id_photo_1_url = true; // Flag to indicate photo exists
            }
            if ($item->id_photo_2_path) {
                $item->id_photo_2_url = true; // Flag to indicate photo exists
            }
            return $item;
        });
        
        return response()->json($items);
    }

    public function approve($id)
    {
        $req = PasswordChangeRequest::findOrFail($id);
        
        // Find the user associated with the request
        $user = null;
        if ($req->user_id) {
            $user = User::with('employeeProfile')->find($req->user_id);
        } elseif ($req->email) {
            // Try to find user by email from the request
            $user = User::with('employeeProfile')->where('email', $req->email)->first();
        }
        
        if (!$user) {
            return response()->json([
                'message' => 'User not found. Cannot send password reset link.',
                'error' => 'user_not_found'
            ], 404);
        }
        
        // Get the Gmail address for the user
        $gmailAddress = $this->getUserGmailAddress($user);
        
        if (!$gmailAddress) {
            return response()->json([
                'message' => 'Gmail address not found for this user. Cannot send password reset link.',
                'error' => 'gmail_not_found'
            ], 400);
        }
        
        try {
            // Generate password reset token using Laravel's Password facade
            // The token is stored with the user's email in the database for validation
            $broker = Password::broker();
            /** @var \Illuminate\Auth\Passwords\TokenRepositoryInterface|null $repository */
            $repository = null;
            if (method_exists($broker, 'getRepository')) {
                // This method exists at runtime but Intelephense doesn't recognize it
                // Using variable assignment to avoid direct method call error
                $methodName = 'getRepository';
                /** @var \Illuminate\Auth\Passwords\TokenRepositoryInterface $repository */
                $repository = $broker->$methodName();
            }
            
            if (!$repository) {
                throw new \Exception('Password reset repository not available');
            }
            
            $token = $repository->create($user);
            
            // Send email to Gmail address (not the stored email)
            // The token validation will still work because it's stored with the user's email
            Mail::to($gmailAddress)->send(new PasswordResetLinkMail($user, $token, $req->id));
            
            // Update request status and timestamp
            $req->status = 'approved';
            $req->approved_by = Auth::id();
            $req->decision_at = now();
            $req->reset_token_sent_at = now();
            $req->save();
            
            AuditLog::log(Auth::id(), 'Password change request approved', 'success', request()->ip(), request()->userAgent(), [
                'id' => $req->id,
                'email' => $req->email,
                'gmail_sent_to' => $gmailAddress,
            ]);
            
            return response()->json([
                'message' => 'Request approved. Password reset link has been sent to the user\'s Gmail account.',
                'gmail_sent_to' => $gmailAddress
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send password reset email', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_id' => $req->id,
                'user_id' => $user->id,
                'gmail_address' => $gmailAddress,
            ]);
            
            // Still approve the request even if email fails
            $req->status = 'approved';
            $req->approved_by = Auth::id();
            $req->decision_at = now();
            $req->save();
            
            return response()->json([
                'message' => 'Request approved, but failed to send email. Please contact the user manually.',
                'error' => 'email_send_failed',
                'error_details' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
    
    /**
     * Get the Gmail address for a user
     * Checks user email, then EmployeeProfile email
     * Returns the first Gmail address found, or null if none found
     *
     * @param User $user
     * @return string|null
     */
    private function getUserGmailAddress(User $user): ?string
    {
        // Check if user's email is a Gmail address
        if ($user->email && $this->isGmailAddress($user->email)) {
            return $user->email;
        }
        
        // Check EmployeeProfile email if it exists
        if ($user->employeeProfile && $user->employeeProfile->email) {
            if ($this->isGmailAddress($user->employeeProfile->email)) {
                return $user->employeeProfile->email;
            }
        }
        
        // If no Gmail found, return null
        // In production, you might want to log this or have a fallback mechanism
        return null;
    }
    
    /**
     * Send verification code for password assistance
     */
    public function sendVerification(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        // Check if 2FA is enabled
        $settings = SecuritySettings::getSettings();
        if ($settings->two_factor_auth !== true) {
            return response()->json([
                'message' => 'Two-factor authentication is not enabled. Verification code is not required.',
                'requires_verification' => false
            ], 200);
        }

        // Check if email exists in the system
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            // Also check employee profile
            $user = User::whereHas('employeeProfile', function($query) use ($request) {
                $query->where('email', $request->email);
            })->first();
        }

        if (!$user) {
            return response()->json([
                'message' => 'Email address not found in our system.',
                'errors' => ['email' => ['This email address is not registered.']]
            ], 404);
        }

        // Check if there's an existing unverified verification for this email
        $existingVerification = PasswordAssistanceVerification::where('email', $request->email)
            ->where('verified', false)
            ->where('expires_at', '>', now())
            ->first();

        // Generate a 6-digit verification code
        $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        // Create or update email verification record
        if ($existingVerification) {
            $existingVerification->update([
                'verification_code' => $verificationCode,
                'expires_at' => Carbon::now()->addMinutes(15),
                'verified' => false,
                'verified_at' => null,
            ]);
            $emailVerification = $existingVerification;
        } else {
            $emailVerification = PasswordAssistanceVerification::create([
                'email' => $request->email,
                'verification_code' => $verificationCode,
                'expires_at' => Carbon::now()->addMinutes(15),
                'verified' => false,
            ]);
        }

        // Send verification code email
        try {
            $userName = $user->first_name ?? $user->name ?? null;
            Mail::to($request->email)->send(new PasswordAssistanceVerificationCode(
                $request->email,
                $verificationCode,
                $userName
            ));
        } catch (\Exception $e) {
            Log::error('Failed to send password assistance verification email', [
                'error' => $e->getMessage(),
                'email' => $request->email,
            ]);
            return response()->json([
                'message' => 'Failed to send verification email. Please try again.',
                'errors' => ['email' => ['Email sending failed. Please check your email address and try again.']]
            ], 500);
        }

        return response()->json([
            'message' => 'Verification code has been sent to your email address.',
            'email' => $request->email,
            'requires_verification' => true
        ], 200);
    }

    /**
     * Verify the verification code for password assistance
     */
    public function verifyVerification(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'verification_code' => 'required|string|size:6',
        ]);

        $emailVerification = PasswordAssistanceVerification::where('email', $request->email)
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

        // Mark verification as verified (but don't mark as used yet - that happens on form submission)
        // We'll check if it's verified when submitting the form
        $emailVerification->markAsVerified();

        return response()->json([
            'message' => 'Email verified successfully. You can now proceed with your password assistance request.',
        ], 200);
    }

    /**
     * Resend verification code for password assistance
     */
    public function resendVerification(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        // Check if email exists in the system
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            $user = User::whereHas('employeeProfile', function($query) use ($request) {
                $query->where('email', $request->email);
            })->first();
        }

        if (!$user) {
            return response()->json([
                'message' => 'Email address not found in our system.',
                'errors' => ['email' => ['This email address is not registered.']]
            ], 404);
        }

        $emailVerification = PasswordAssistanceVerification::where('email', $request->email)
            ->where('verified', false)
            ->first();

        if (!$emailVerification) {
            // Create a new verification if none exists
            $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
            $emailVerification = PasswordAssistanceVerification::create([
                'email' => $request->email,
                'verification_code' => $verificationCode,
                'expires_at' => Carbon::now()->addMinutes(15),
                'verified' => false,
            ]);
        } else {
            // Generate a new 6-digit verification code
            $verificationCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

            // Update verification record
            $emailVerification->update([
                'verification_code' => $verificationCode,
                'expires_at' => Carbon::now()->addMinutes(15),
                'verified' => false,
                'verified_at' => null,
            ]);
        }

        // Send verification code email
        try {
            $userName = $user->first_name ?? $user->name ?? null;
            Mail::to($request->email)->send(new PasswordAssistanceVerificationCode(
                $request->email,
                $verificationCode,
                $userName
            ));
        } catch (\Exception $e) {
            Log::error('Failed to resend password assistance verification email', [
                'error' => $e->getMessage(),
                'email' => $request->email,
            ]);
            return response()->json([
                'message' => 'Failed to send verification email. Please try again.',
                'errors' => ['email' => ['Email sending failed. Please check your email address and try again.']]
            ], 500);
        }

        return response()->json([
            'message' => 'Verification code has been resent to your email address.',
        ], 200);
    }

    /**
     * Check if an email address is a Gmail address
     *
     * @param string $email
     * @return bool
     */
    private function isGmailAddress(string $email): bool
    {
        if (empty($email)) {
            return false;
        }
        
        $email = strtolower(trim($email));
        return str_ends_with($email, '@gmail.com');
    }

    public function reject($id)
    {
        $req = PasswordChangeRequest::findOrFail($id);
        $req->status = 'rejected';
        $req->save();
        AuditLog::log(Auth::id(), 'Password change request rejected', 'success', request()->ip(), request()->userAgent(), [
            'id' => $req->id,
            'email' => $req->email,
        ]);
        return response()->json(['message' => 'Request rejected']);
    }

    public function attachment($id, $slot)
    {
        $request = PasswordChangeRequest::findOrFail($id);
        
        $pathKey = "id_photo_{$slot}_path";
        if (!$request->$pathKey) {
            return response()->json(['message' => 'Attachment not found'], 404);
        }
        
        $path = $request->$pathKey;
        
        if (!Storage::disk('public')->exists($path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        
        $fullPath = Storage::disk('public')->path($path);
        return response()->file($fullPath);
    }
}


