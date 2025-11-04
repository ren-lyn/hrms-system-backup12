<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SecuritySettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SecuritySettingsController extends Controller
{
    /**
     * Display security settings.
     */
    public function index()
    {
        $settings = SecuritySettings::getSettings();
        
        return response()->json([
            'twoFactorAuth' => $settings->two_factor_auth,
            'passwordPolicy' => $settings->password_policy,
            'accountLockout' => $settings->account_lockout,
            'sessionTimeout' => $settings->session_timeout,
            'passwordMinLength' => $settings->password_min_length,
            'passwordRequireSpecial' => $settings->password_require_special,
            'passwordRequireNumbers' => $settings->password_require_numbers,
            'lockoutAttempts' => $settings->lockout_attempts,
            'lockoutDuration' => $settings->lockout_duration
        ]);
    }

    /**
     * Update security settings.
     */
    public function update(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'twoFactorAuth' => 'boolean',
                'passwordPolicy' => 'boolean',
                'accountLockout' => 'boolean',
                'sessionTimeout' => 'integer|min:5|max:480',
                'passwordMinLength' => 'integer|min:6|max:32',
                'passwordRequireSpecial' => 'boolean',
                'passwordRequireNumbers' => 'boolean',
                'lockoutAttempts' => 'integer|min:3|max:10',
                'lockoutDuration' => 'integer|min:5|max:60'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $settings = SecuritySettings::getSettings();
            
            $updateData = [
                'two_factor_auth' => $request->twoFactorAuth ?? $settings->two_factor_auth,
                'password_policy' => $request->passwordPolicy ?? $settings->password_policy,
                'account_lockout' => $request->accountLockout ?? $settings->account_lockout,
                'session_timeout' => $request->sessionTimeout ?? $settings->session_timeout,
                'password_min_length' => $request->passwordMinLength ?? $settings->password_min_length,
                'password_require_special' => $request->passwordRequireSpecial ?? $settings->password_require_special,
                'password_require_numbers' => $request->passwordRequireNumbers ?? $settings->password_require_numbers,
                'lockout_attempts' => $request->lockoutAttempts ?? $settings->lockout_attempts,
                'lockout_duration' => $request->lockoutDuration ?? $settings->lockout_duration
            ];
            
            $settings->update($updateData);

            return response()->json([
                'message' => 'Security settings updated successfully',
                'settings' => [
                    'twoFactorAuth' => $settings->two_factor_auth,
                    'passwordPolicy' => $settings->password_policy,
                    'accountLockout' => $settings->account_lockout,
                    'sessionTimeout' => $settings->session_timeout,
                    'passwordMinLength' => $settings->password_min_length,
                    'passwordRequireSpecial' => $settings->password_require_special,
                    'passwordRequireNumbers' => $settings->password_require_numbers,
                    'lockoutAttempts' => $settings->lockout_attempts,
                    'lockoutDuration' => $settings->lockout_duration
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Security settings update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update security settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
