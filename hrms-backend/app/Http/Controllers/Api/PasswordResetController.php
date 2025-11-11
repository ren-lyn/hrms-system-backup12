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

        $status = Password::reset(
            [
                'email' => $validated['email'],
                'password' => $validated['password'],
                'password_confirmation' => $validated['password_confirmation'],
                'token' => $validated['token'],
            ],
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->input('password')),
                    'remember_token' => Str::random(60),
                ])->save();

                if (method_exists($user, 'tokens')) {
                    $user->tokens()->delete();
                }

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

