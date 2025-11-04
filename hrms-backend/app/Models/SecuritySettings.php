<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecuritySettings extends Model
{
    protected $fillable = [
        'two_factor_auth',
        'password_policy',
        'account_lockout',
        'session_timeout',
        'password_min_length',
        'password_require_special',
        'password_require_numbers',
        'lockout_attempts',
        'lockout_duration'
    ];

    protected $casts = [
        'two_factor_auth' => 'boolean',
        'password_policy' => 'boolean',
        'account_lockout' => 'boolean',
        'password_require_special' => 'boolean',
        'password_require_numbers' => 'boolean',
        'session_timeout' => 'integer',
        'password_min_length' => 'integer',
        'lockout_attempts' => 'integer',
        'lockout_duration' => 'integer'
    ];

    public static function getSettings()
    {
        $settings = self::first();
        if (!$settings) {
            $settings = self::create([
                'two_factor_auth' => false,
                'password_policy' => true,
                'account_lockout' => true,
                'session_timeout' => 30,
                'password_min_length' => 8,
                'password_require_special' => true,
                'password_require_numbers' => true,
                'lockout_attempts' => 5,
                'lockout_duration' => 15
            ]);
        }
        return $settings;
    }
}
