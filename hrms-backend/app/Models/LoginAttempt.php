<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class LoginAttempt extends Model
{
    protected $fillable = [
        'email',
        'ip_address',
        'user_agent',
        'success',
        'attempts_count',
        'locked_until'
    ];

    protected $casts = [
        'success' => 'boolean',
        'attempts_count' => 'integer',
        'locked_until' => 'datetime'
    ];

    public static function recordAttempt($email, $ipAddress, $userAgent, $success = false)
    {
        $attempt = self::where('email', $email)
                      ->where('ip_address', $ipAddress)
                      ->where('created_at', '>=', Carbon::now()->subMinutes(15))
                      ->first();

        if ($attempt) {
            if (!$success) {
                $attempt->increment('attempts_count');
            } else {
                $attempt->update([
                    'success' => true,
                    'attempts_count' => 0,
                    'locked_until' => null
                ]);
            }
        } else {
            self::create([
                'email' => $email,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'success' => $success,
                'attempts_count' => $success ? 0 : 1,
                'locked_until' => null
            ]);
        }

        return $attempt ? $attempt->fresh() : self::where('email', $email)
                                                      ->where('ip_address', $ipAddress)
                                                      ->latest()
                                                      ->first();
    }

    public static function isLocked($email, $ipAddress)
    {
        $attempt = self::where('email', $email)
                      ->where('ip_address', $ipAddress)
                      ->where('locked_until', '>', Carbon::now())
                      ->first();

        return $attempt !== null;
    }

    public static function getLockoutInfo($email, $ipAddress)
    {
        $attempt = self::where('email', $email)
                      ->where('ip_address', $ipAddress)
                      ->where('locked_until', '>', Carbon::now())
                      ->first();

        if (!$attempt) {
            return null;
        }

        $settings = SecuritySettings::getSettings();
        $remainingMinutes = Carbon::now()->diffInMinutes($attempt->locked_until, false);
        
        return [
            'is_locked' => true,
            'attempts_count' => $attempt->attempts_count,
            'locked_until' => $attempt->locked_until,
            'remaining_minutes' => max(0, ceil($remainingMinutes)),
            'lockout_duration' => $settings->lockout_duration
        ];
    }

    public static function getRemainingAttempts($email, $ipAddress)
    {
        $settings = SecuritySettings::getSettings();
        $attempt = self::where('email', $email)
                      ->where('ip_address', $ipAddress)
                      ->where('created_at', '>=', Carbon::now()->subMinutes(15))
                      ->first();

        if (!$attempt) {
            return $settings->lockout_attempts;
        }

        return max(0, $settings->lockout_attempts - $attempt->attempts_count);
    }

    public static function lockAccount($email, $ipAddress)
    {
        $settings = SecuritySettings::getSettings();
        $attempt = self::where('email', $email)
                      ->where('ip_address', $ipAddress)
                      ->where('created_at', '>=', Carbon::now()->subMinutes(15))
                      ->first();

        if ($attempt) {
            $attempt->update([
                'locked_until' => Carbon::now()->addMinutes($settings->lockout_duration)
            ]);
        }
    }
}
