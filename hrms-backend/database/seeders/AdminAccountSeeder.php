<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\EmployeeProfile;

class AdminAccountSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure Admin role exists
        $adminRole = Role::firstOrCreate(['name' => 'Admin'], ['name' => 'Admin']);

        // Create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@company.com'],
            [
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'password' => Hash::make('password123'),
                'role_id' => $adminRole->id,
                'is_active' => true,
            ]
        );

        // Create or update employee profile for admin
        // Edit the government ID numbers below as needed
        $profile = $admin->employeeProfile()->firstOrCreate(
            ['user_id' => $admin->id],
            [
                'employee_id' => 'EM1001',
                'first_name' => 'System',
                'last_name' => 'Administrator',
                'email' => 'admin@company.com',
                'position' => 'System Administrator',
                'department' => 'IT Department',
                'employment_status' => 'Full Time',
                'salary' => 25000,
                'hire_date' => now()->subYears(3)->toDateString(),
            ]
        );
        
        // Always update these fields to ensure they're set
        $profile->update([
            'sss' => '12-3456789-0', // Edit this with the actual SSS number
            'philhealth' => '12-345678901-2', // Edit this with the actual PhilHealth number
            'pagibig' => '1234-5678-9012', // Edit this with the actual Pag-IBIG number
        ]);

        $this->command?->info('Admin account created: admin@company.com (password: password123)');
    }
}
