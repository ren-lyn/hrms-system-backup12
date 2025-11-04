<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SecuritySettings;

class SecuritySettingsSeeder extends Seeder
{
    public function run(): void
    {
        SecuritySettings::firstOrCreate(
            ['id' => 1],
            [
                'two_factor_auth' => false,
                'password_policy' => true,
                'account_lockout' => true,
                'session_timeout' => 30,
                'password_min_length' => 8,
                'password_require_special' => true,
                'password_require_numbers' => true,
                'lockout_attempts' => 5,
                'lockout_duration' => 15
            ]
        );
        
        $this->command->info('Security settings initialized successfully.');
    }
}
