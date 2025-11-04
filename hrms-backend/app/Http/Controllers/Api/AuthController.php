<?php
// hrms-backend/app/Http/Controllers/Api/AuthController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\LoginAttempt;
use App\Models\SecuritySettings;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required', // this can be email or user_id (fallback)
            'password' => 'required'
        ]);

        $ipAddress = $request->ip();
        $userAgent = $request->userAgent();
        $email = $request->login;

        // Try to find the user by email first, then by user_id as fallback
        $user = User::where('email', $request->login)->with('role')->first();
        
        // If not found by email and login is numeric, try by user_id (for backward compatibility)
        if (!$user && is_numeric($request->login)) {
            $user = User::where('id', $request->login)->with('role')->first();
            if ($user) {
                $email = $user->email;
            }
        }

        // Check if account is locked
        $lockoutInfo = LoginAttempt::getLockoutInfo($email, $ipAddress);
        if ($lockoutInfo) {
            AuditLog::log(null, 'Login attempt blocked - account locked', 'failed', $ipAddress, $userAgent);
            $remainingMinutes = $lockoutInfo['remaining_minutes'];
            $attemptsCount = $lockoutInfo['attempts_count'];
            
            if ($remainingMinutes > 0) {
                $timeText = $remainingMinutes == 1 ? '1 minute' : "{$remainingMinutes} minutes";
                $message = "Your account has been blocked due to {$attemptsCount} failed login attempts. Try to log in again after {$timeText}.";
            } else {
                $message = "Your account has been blocked due to {$attemptsCount} failed login attempts. Please try again later.";
            }
            
            return response()->json(['message' => $message], 423);
        }

        // Check credentials
        if (!$user || !Hash::check($request->password, $user->password)) {
            // Record failed attempt
            $attempt = LoginAttempt::recordAttempt($email, $ipAddress, $userAgent, false);
            $settings = SecuritySettings::getSettings();
            $remainingAttempts = LoginAttempt::getRemainingAttempts($email, $ipAddress);
            
            // Check if we should lock the account
            if ($attempt && $attempt->attempts_count >= $settings->lockout_attempts) {
                LoginAttempt::lockAccount($email, $ipAddress);
                AuditLog::log($user ? $user->id : null, 'Account locked due to failed login attempts', 'failed', $ipAddress, $userAgent);
                
                $timeText = $settings->lockout_duration == 1 ? '1 minute' : "{$settings->lockout_duration} minutes";
                $message = "Your account has been blocked due to {$attempt->attempts_count} failed login attempts. Try to log in again after {$timeText}.";
                
                return response()->json(['message' => $message], 423);
            }
            
            AuditLog::log($user ? $user->id : null, 'Login failed - invalid credentials', 'failed', $ipAddress, $userAgent);
            return response()->json([
                'message' => "Incorrect user login details. You have {$remainingAttempts} more login attempts remaining."
            ], 401);
        }

        // Check if user account is active
        if (!$user->is_active) {
            AuditLog::log($user->id, 'Login failed - account inactive', 'failed', $ipAddress, $userAgent);
            return response()->json(['message' => 'You cannot log in because your account is inactive.'], 403);
        }

        // Record successful login
        LoginAttempt::recordAttempt($email, $ipAddress, $userAgent, true);
        AuditLog::log($user->id, 'Login successful', 'success', $ipAddress, $userAgent);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            "access_token" => $token,
            "user" => [
                "id" => $user->id,
                "email" => $user->email,
                "role" => [
                    "id" => $user->role_id ?? null,
                    "name" => $user->role->name ?? null
                ]
            ]
        ]);
    }


    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function user(Request $request)
    {
        $user = $request->user()->load(['role', 'employeeProfile']);
        
        return response()->json([
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => $user->name,
            'full_name' => $user->first_name . ' ' . $user->last_name,
            'email' => $user->email,
            'role_id' => $user->role_id,
            'role' => [
                'id' => $user->role_id,
                'name' => $user->role->name ?? 'Employee'
            ],
            'employeeProfile' => $user->employeeProfile ? [
                'department' => $user->employeeProfile->department,
                'position' => $user->employeeProfile->position,
                'job_title' => $user->employeeProfile->job_title,
                'employment_status' => $user->employeeProfile->employment_status,
                'hire_date' => $user->employeeProfile->hire_date,
            ] : null
        ]);
    }
}
// This controller handles user authentication, allowing users to log in and log out.
// The login method checks the user's credentials and returns an access token if valid.