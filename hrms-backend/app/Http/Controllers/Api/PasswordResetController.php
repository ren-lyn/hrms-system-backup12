<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PasswordChangeRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class PasswordResetController extends Controller
{
    public function validateToken(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'request_id' => 'nullable|integer|exists:password_change_requests,id',
        ]);

        $user = User::where('email', $validated['email'])->first();
        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find a user with that email address.'],
            ]);
        }

        $this->ensurePasswordResetTableExists();

        $broker = Password::broker();
        $repository = method_exists($broker, 'getRepository') ? $broker->getRepository() : null;
        if ($repository && !$repository->exists($user, $validated['token'])) {
            throw ValidationException::withMessages([
                'token' => ['This password reset link is invalid or has already been used.'],
            ]);
        }

        return response()->json([
            'valid' => true,
            'email' => $user->email,
            'name' => $user->name,
            'request_id' => $validated['request_id'] ?? null,
        ]);
    }

    public function reset(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
            'request_id' => 'nullable|integer|exists:password_change_requests,id',
        ]);

        $user = User::where('email', $validated['email'])->first();
        if (!$user) {
            throw ValidationException::withMessages([
                'email' => ['We could not find a user with that email address.'],
            ]);
        }

        $this->ensurePasswordResetTableExists();

        // Get password_confirmation from request (not validated array, as Laravel's confirmed rule doesn't include it)
        $passwordConfirmation = $request->input('password_confirmation');

        $status = Password::reset(
            [
                'email' => $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => $passwordConfirmation,
                'token' => $validated['token'],
            ],
            function ($user) use ($request, $validated) {
                // Generate new password hash - this completely replaces the old password
                // The old password hash becomes invalid once this is saved
                $newPasswordHash = Hash::make($validated['password']);
                
                // Force update the password and remember token
                // This ensures the old password hash is completely replaced in the database
                $user->forceFill([
                    'password' => $newPasswordHash,
                    'remember_token' => Str::random(60),
                ])->save();

                // Delete all existing authentication tokens to force re-authentication
                // This ensures old sessions/tokens can't be used after password reset
                if (method_exists($user, 'tokens')) {
                    $user->tokens()->delete();
                }

                // The old password is now invalid because:
                // 1. The password hash in the database has been completely replaced
                // 2. Hash::check() with the old password will fail against the new hash
                // 3. All existing tokens have been deleted, forcing re-login

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Unable to reset password: ' . __($status)], 422);
        }

        $passwordRequest = null;
        if (!empty($validated['request_id'])) {
            $passwordRequest = PasswordChangeRequest::find($validated['request_id']);
            if ($passwordRequest && $passwordRequest->status !== 'completed') {
                $passwordRequest->status = 'completed';
                $passwordRequest->completed_at = now();
                $passwordRequest->save();
            }
        }

        AuditLog::log(
            $user->id,
            'Password reset completed',
            'success',
            $request->ip(),
            $request->userAgent(),
            [
                'request_id' => $passwordRequest?->id,
            ]
        );

        return response()->json(['message' => 'Password has been reset successfully.']);
    }

    private function ensurePasswordResetTableExists(): void
    {
        $table = config('auth.passwords.users.table', 'password_reset_tokens');
        $connection = config('database.default');
        $schema = Schema::connection($connection);

        if (!$schema->hasTable($table)) {
            $schema->create($table, function (Blueprint $tableBlueprint) {
                $tableBlueprint->string('email')->index();
                $tableBlueprint->string('token');
                $tableBlueprint->timestamp('created_at')->nullable();
            });
        }
    }
}

