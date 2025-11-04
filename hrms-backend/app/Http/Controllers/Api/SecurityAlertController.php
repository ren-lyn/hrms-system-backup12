<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LoginAttempt;
use App\Models\PasswordChangeRequest;
use Carbon\Carbon;

class SecurityAlertController extends Controller
{
    public function index()
    {
        $now = Carbon::now();

        // 1) Pending password change requests (last 30 days)
        $passwordRequests = PasswordChangeRequest::where('status', 'pending')
            ->where('created_at', '>=', $now->copy()->subDays(30))
            ->get()
            ->map(function ($r, $idx) {
                return [
                    'type' => 'Password Change Request',
                    'ref' => $r->full_name ? ($r->full_name . ' • ' . ($r->email ?? '')) : ($r->email ?? 'Unknown'),
                    'meta' => [
                        'id' => $r->id,
                        'created_at' => $r->created_at,
                        'department' => $r->department,
                    ]
                ];
            })->values();

        // 1b) Fallback: audit logs created by password assistance (covers cases where table is absent)
        $passwordRequestLogs = AuditLog::with('user')
            ->where('action', 'Password change request submitted')
            ->where('created_at', '>=', $now->copy()->subDays(30))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                $email = is_array($log->details ?? null) ? ($log->details['email'] ?? null) : null;
                return [
                    'type' => 'Password Change Request',
                    'ref' => ($log->user?->name ?? ($email ?? 'Unknown')),
                    'meta' => [
                        'timestamp' => $log->created_at,
                    ]
                ];
            })->values();

        // 2) Multiple login attempts in short period (>=2 attempts in 15 minutes)
        //    Use updated_at so increments are captured within the window
        $recentAttempts = LoginAttempt::where('updated_at', '>=', $now->copy()->subMinutes(15))->get();
        $mlAlerts = [];
        foreach ($recentAttempts as $attempt) {
            if (($attempt->attempts_count ?? 0) >= 2 && !$attempt->success) {
                $mlAlerts[] = [
                    'type' => 'Multiple Login Attempts',
                    'ref' => ($attempt->email ?? 'unknown') . ' @ ' . ($attempt->ip_address ?? 'unknown') . " • attempts: " . $attempt->attempts_count,
                    'meta' => [
                        'ip' => $attempt->ip_address,
                        'count' => $attempt->attempts_count,
                    ]
                ];
            }
        }

        // 3) Account lockouts (from audit logs)
        $lockouts = AuditLog::where('action', 'like', 'Account locked%')
            ->where('created_at', '>=', $now->copy()->subDay())
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'type' => 'Account Lockout',
                    'ref' => ($log->user?->name ?? 'Unknown User') . ' • ' . ($log->ip_address ?? 'unknown IP'),
                    'meta' => [
                        'timestamp' => $log->created_at,
                    ]
                ];
            })->values();

        // 4) Logins from new device/IP (success log from unseen IP in 30 days)
        $successLogs = AuditLog::with('user')
            ->where('action', 'Login successful')
            ->where('created_at', '>=', $now->copy()->subDays(30))
            ->orderBy('created_at', 'desc')
            ->get();
        $seenByUser = [];
        $newDeviceAlerts = [];
        foreach ($successLogs as $log) {
            $userId = $log->user_id ?: 0;
            $ip = $log->ip_address ?: 'unknown';
            $key = $userId . ':' . $ip;
            $seenByUser[$key] = true;
        }
        // Only check last 1 day for new-login alerts, and compare against earlier 30-day set
        $lastDaySuccess = AuditLog::with('user')
            ->where('action', 'Login successful')
            ->where('created_at', '>=', $now->copy()->subDay())
            ->orderBy('created_at', 'desc')
            ->get();
        foreach ($lastDaySuccess as $log) {
            $userId = $log->user_id ?: 0;
            $ip = $log->ip_address ?: 'unknown';
            $key = $userId . ':' . $ip;
            // If this exact key only exists due to the same-day set, we still consider it new if there was no prior 30-day entry before this record
            $priorExists = AuditLog::where('action', 'Login successful')
                ->where('user_id', $log->user_id)
                ->where('ip_address', $ip)
                ->where('created_at', '<', $log->created_at)
                ->exists();
            if (!$priorExists) {
                $newDeviceAlerts[] = [
                    'type' => 'New Device/IP Login',
                    'ref' => ($log->user?->name ?? 'Unknown User') . ' • ' . $ip,
                    'meta' => [
                        'timestamp' => $log->created_at,
                    ]
                ];
            }
        }

        $alerts = array_values(array_merge(
            array_merge($passwordRequests->toArray(), $passwordRequestLogs->toArray()),
            $mlAlerts,
            $lockouts->toArray(),
            $newDeviceAlerts
        ));

        return response()->json([
            'count' => count($alerts),
            'alerts' => $alerts,
        ]);
    }
}


