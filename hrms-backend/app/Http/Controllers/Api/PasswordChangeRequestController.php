<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordChangeRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Carbon\Carbon;
use Illuminate\Support\Str;
use App\Notifications\PasswordChangeRequestSubmitted;
use App\Notifications\PasswordChangeRequestStatusUpdated;
use App\Mail\PasswordResetLinkMail;

class PasswordChangeRequestController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name' => 'required|string|max:255',
            'employee_id' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'reason' => 'required|string|max:2000',
            'id_photo_1' => 'nullable|image|max:5120',
            'id_photo_2' => 'nullable|image|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $payload = $validator->validated();
        $user = $request->user();

        $data = [
            'user_id' => $user?->id,
            'full_name' => $payload['full_name'],
            'employee_id' => $payload['employee_id'] ?? null,
            'department' => $payload['department'] ?? null,
            'email' => $payload['email'] ?? ($user?->email),
            'reason' => $payload['reason'] ?? null,
            'status' => 'pending',
        ];

        if (empty($data['email'])) {
            return response()->json(['message' => 'A valid email address is required'], 422);
        }

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

            $admins = User::whereHas('role', function ($query) {
                $query->where('name', 'Admin');
            })->get();

            if ($admins->count()) {
                Notification::send($admins, new PasswordChangeRequestSubmitted($requestModel));
            }

            return response()->json([
                'message' => 'Password change request submitted',
                'id' => $requestModel->id,
                'saved' => true,
            ], 201);
        } catch (\Throwable $e) {
            // Graceful fallback when table is missing or any other storage error occurs
            return response()->json(['message' => 'Password change request submitted', 'saved' => false], 201);
        }
    }

    public function index()
    {
        $items = PasswordChangeRequest::with(['user:id,first_name,last_name,email', 'approver:id,first_name,last_name,email'])
            ->latest()
            ->take(200)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'user_id' => $item->user_id,
                    'full_name' => $item->full_name,
                    'employee_id' => $item->employee_id,
                    'department' => $item->department,
                    'email' => $item->email,
                    'reason' => $item->reason,
                    'decision_notes' => $item->decision_notes,
                    'status' => $item->status,
                    'id_photo_1_url' => $this->buildPublicUrl($item->id_photo_1_path),
                    'id_photo_2_url' => $this->buildPublicUrl($item->id_photo_2_path),
                    'created_at' => $item->created_at,
                    'updated_at' => $item->updated_at,
                    'decision_at' => $item->decision_at,
                    'reset_token_sent_at' => $item->reset_token_sent_at,
                    'completed_at' => $item->completed_at,
                    'approved_by' => $item->approved_by,
                    'requester' => $item->user ? [
                        'id' => $item->user->id,
                        'name' => trim(($item->user->first_name ?? '') . ' ' . ($item->user->last_name ?? '')) ?: ($item->user->name ?? $item->user->email),
                        'email' => $item->user->email,
                    ] : null,
                    'approver' => $item->approver ? [
                        'id' => $item->approver->id,
                        'name' => trim(($item->approver->first_name ?? '') . ' ' . ($item->approver->last_name ?? '')) ?: ($item->approver->name ?? $item->approver->email),
                        'email' => $item->approver->email,
                    ] : null,
                ];
            });

        return response()->json($items);
    }

    public function approve(Request $request, $id)
    {
        $request->validate([
            'notes' => 'nullable|string|max:2000',
        ]);

        $admin = $request->user();
        if (!$admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $passwordRequest = PasswordChangeRequest::findOrFail($id);

        if ($passwordRequest->status === 'approved') {
            return response()->json(['message' => 'Request already approved'], 422);
        }

        $user = $passwordRequest->user ?: User::where('email', $passwordRequest->email)->first();
        if (!$user) {
            return response()->json(['message' => 'No matching user was found for this request'], 404);
        }

        $this->ensurePasswordResetTableExists();
        $token = Password::broker()->createToken($user);
        $frontendBase = rtrim(config('services.frontend.url', 'http://localhost:3000'), '/');
        $resetUrl = $frontendBase . '/reset-password?token=' . urlencode($token) . '&email=' . urlencode($user->email) . '&requestId=' . $passwordRequest->id;
        $expiresAt = Carbon::now()->addMinutes(config('auth.passwords.users.expire', 60));

        try {
            Mail::to($passwordRequest->email)->send(
                new PasswordResetLinkMail($user, $passwordRequest, $resetUrl, $expiresAt)
            );
        } catch (\Throwable $mailError) {
            AuditLog::log($admin->id, 'Password change request approval failed (email)', 'failed', $request->ip(), $request->userAgent(), [
                'request_id' => $passwordRequest->id,
                'email' => $passwordRequest->email,
                'error' => $mailError->getMessage(),
            ]);

            return response()->json([
                'message' => 'Reset email could not be sent. Please verify the mail configuration and try again.',
            ], 500);
        }

        DB::transaction(function () use ($passwordRequest, $admin, $request) {
            $locked = PasswordChangeRequest::where('id', $passwordRequest->id)->lockForUpdate()->first();
            if ($locked) {
                $locked->status = 'approved';
                $locked->decision_notes = $request->input('notes');
                $locked->approved_by = $admin->id;
                $locked->decision_at = now();
                $locked->reset_token_sent_at = now();
                $locked->save();
            }
        });

        $passwordRequest->refresh();

        $user->notify(new PasswordChangeRequestStatusUpdated($passwordRequest));

        AuditLog::log($admin->id, 'Password change request approved', 'success', $request->ip(), $request->userAgent(), [
            'request_id' => $passwordRequest->id,
            'email' => $passwordRequest->email,
        ]);

        AuditLog::log($user->id, 'Password reset link issued', 'success', 'system', $request->userAgent(), [
            'request_id' => $passwordRequest->id,
        ]);

        return response()->json([
            'message' => 'Request approved and password reset email sent',
            'reset_url' => $resetUrl,
            'expires_at' => $expiresAt,
        ]);
    }

    public function reject(Request $request, $id)
    {
        $request->validate([
            'notes' => 'required|string|max:2000',
        ]);

        $admin = $request->user();
        if (!$admin) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $passwordRequest = PasswordChangeRequest::findOrFail($id);

        if ($passwordRequest->status === 'approved') {
            return response()->json(['message' => 'Approved requests cannot be rejected'], 422);
        }

        DB::transaction(function () use ($passwordRequest, $admin, $request) {
            $locked = PasswordChangeRequest::where('id', $passwordRequest->id)->lockForUpdate()->first();
            if ($locked) {
                $locked->status = 'rejected';
                $locked->decision_notes = $request->input('notes');
                $locked->approved_by = $admin->id;
                $locked->decision_at = now();
                $locked->save();
            }
        });

        $passwordRequest->refresh();

        if ($passwordRequest->user) {
            $passwordRequest->user->notify(new PasswordChangeRequestStatusUpdated($passwordRequest));
        }

        AuditLog::log($admin->id, 'Password change request rejected', 'success', $request->ip(), $request->userAgent(), [
            'request_id' => $passwordRequest->id,
            'email' => $passwordRequest->email,
        ]);

        return response()->json(['message' => 'Request rejected and user notified']);
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

    private function buildPublicUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $relative = Storage::disk('public')->url($path);

        if (Str::startsWith($relative, ['http://', 'https://'])) {
            return $relative;
        }

        $base = null;

        if (app()->bound('request') && request()) {
            $base = request()->getSchemeAndHttpHost();
        }

        if (!$base) {
            $base = config('app.url');
        }

        if (!$base) {
            $base = url('/');
        }

        $base = rtrim($base, '/');

        return $base . '/' . ltrim($relative, '/');
    }

    public function attachment(Request $request, $id, $slot)
    {
        $user = $request->user();

        if (!$user && $request->bearerToken()) {
            $personalAccessToken = PersonalAccessToken::findToken($request->bearerToken());
            if ($personalAccessToken) {
                $user = $personalAccessToken->tokenable;
                Auth::setUser($user);
            }
        }

        if (!$user) {
            $tokenValue = $request->query('token');
            if ($tokenValue) {
                $personalAccessToken = PersonalAccessToken::findToken($tokenValue);
                if ($personalAccessToken) {
                    $user = $personalAccessToken->tokenable;
                    Auth::setUser($user);
                }
            }
        }

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->role || $user->role->name !== 'Admin') {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $passwordRequest = PasswordChangeRequest::findOrFail($id);
        $column = $slot === '2' ? 'id_photo_2_path' : 'id_photo_1_path';
        $path = $passwordRequest->$column;

        if (!$path || !Storage::disk('public')->exists($path)) {
            abort(404);
        }

        $mime = Storage::disk('public')->mimeType($path) ?: 'application/octet-stream';
        $stream = Storage::disk('public')->readStream($path);

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'max-age=86400, public',
            'Content-Disposition' => 'inline; filename="' . basename($path) . '"',
        ]);
    }
}


