<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\EmployeeProfile;
use App\Models\Applicant;

class DefaultAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Resolve role IDs by name to avoid relying on order
        $roles = Role::pluck('id', 'name');

        // HR Staff
        $hrStaff = User::firstOrCreate(
            ['email' => 'hrstaff@company.com'],
            [
                'first_name' => 'Crystal Anne',
                'last_name' => 'Barayang',
                'password' => Hash::make('password123'),
                'role_id' => $roles['HR Staff'] ?? 2,
            ]
        );
        $hrStaff->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1002',
            'first_name' => 'Crystal Anne',
            'last_name' => 'Barayang',
            'email' => 'hrstaff@company.com',
            'position' => 'HR Staff',
            'department' => 'HR Department',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subYears(1)->toDateString(),
        ]);

        // Manager
        $manager = User::firstOrCreate(
            ['email' => 'manager@company.com'],
            [
                'first_name' => 'Shariel',
                'last_name' => 'Osias',
                'password' => Hash::make('password123'),
                'role_id' => $roles['Manager'] ?? 3,
            ]
        );
        $manager->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1003',
            'first_name' => 'Shariel',
            'last_name' => 'Osias',
            'email' => 'manager@company.com',
            'position' => 'Manager',
            'department' => 'Operations',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subYears(2)->toDateString(),
        ]);

        // Employee
        $employee = User::firstOrCreate(
            ['email' => 'employee@company.com'],
            [
                'first_name' => 'Donna Mae',
                'last_name' => 'Cabuyao',
                'password' => Hash::make('password123'),
                'role_id' => $roles['Employee'] ?? 4,
            ]
        );
        $employee->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1004',
            'first_name' => 'Donna Mae',
            'last_name' => 'Cabuyao',
            'email' => 'employee@company.com',
            'position' => 'Staff',
            'department' => 'Operations',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subMonths(6)->toDateString(),
        ]);

        // Applicant
        $applicantUser = User::firstOrCreate(
            ['email' => 'applicant@company.com'],
            [
                'first_name' => 'Ren',
                'last_name' => 'Santiago',
                'password' => Hash::make('password123'),
                'role_id' => $roles['Applicant'] ?? 5,
            ]
        );
        Applicant::firstOrCreate(
            ['user_id' => $applicantUser->id],
            [
                'first_name' => 'Ren',
                'last_name' => 'Santiago',
                'email' => 'applicant@company.com',
                'contact_number' => '09990001111',
                'resume_path' => null,
            ]
        );

        $this->command?->info('Default accounts created: HR Staff, Manager, Employee, Applicant (password: password123)');
    }
}
