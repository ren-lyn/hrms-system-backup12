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

        // Create employee profile for admin
        $admin->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1001',
            'first_name' => 'System',
            'last_name' => 'Administrator',
            'email' => 'admin@company.com',
            'position' => 'System Administrator',
            'department' => 'IT Department',
            'employment_status' => 'Full Time',
            'salary' => 100000,
            'hire_date' => now()->subYears(3)->toDateString(),
        ]);

        $this->command?->info('Admin account created: admin@company.com (password: password123)');
    }
}
