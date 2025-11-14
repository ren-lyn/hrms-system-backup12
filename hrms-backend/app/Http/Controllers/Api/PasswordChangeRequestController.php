<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordChangeRequest;
use App\Models\User;
use App\Models\AuditLog;
use App\Mail\PasswordResetLinkMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class PasswordChangeRequestController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required_without:email|string|max:255|filled',
            'employee_id' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'reason' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
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
            return response()->json(['message' => 'Password change request submitted', 'id' => $requestModel->id, 'saved' => true], 201);
        } catch (\Throwable $e) {
            // Log the error for debugging
            \Log::error('Password change request creation failed', [
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
            $repository = method_exists($broker, 'getRepository') ? $broker->getRepository() : null;
            
            if (!$repository) {
                throw new \Exception('Password reset repository not available');
            }
            
            $token = $repository->create($user);
            
            // Send email to Gmail address (not the stored email)
            // The token validation will still work because it's stored with the user's email
            Mail::to($gmailAddress)->send(new PasswordResetLinkMail($user, $token, $req->id));
            
            // Update request status and timestamp
            $req->status = 'approved';
            $req->approved_by = auth()->id();
            $req->decision_at = now();
            $req->reset_token_sent_at = now();
            $req->save();
            
            AuditLog::log(auth()->id(), 'Password change request approved', 'success', request()->ip(), request()->userAgent(), [
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
            $req->approved_by = auth()->id();
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
        AuditLog::log(auth()->id(), 'Password change request rejected', 'success', request()->ip(), request()->userAgent(), [
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
        
        return Storage::disk('public')->response($path);
    }
}


