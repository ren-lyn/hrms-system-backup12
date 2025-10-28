<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;

class MultipleAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure required roles exist and fetch IDs
        $requiredRoles = ['HR Staff', 'Manager', 'Employee', 'Applicant', 'Admin'];
        foreach ($requiredRoles as $roleName) {
            Role::firstOrCreate(['name' => $roleName], ['name' => $roleName]);
        }

        $users = [
            // HR Staff
            ['first_name' => 'Princes', 'last_name' => 'Duran', 'email' => 'princes.duran@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'Lanz', 'last_name' => 'Ardenio', 'email' => 'lanz.ardenio@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'Abigail', 'last_name' => 'Manalo', 'email' => 'abigail.manalo@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'Allen Jasper', 'last_name' => 'Ararao', 'email' => 'allen.ararao@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],

            // Managers
            ['first_name' => 'Elwin', 'last_name' => 'Madraga', 'email' => 'elwin.madraga@company.com', 'role' => 'Manager', 'position' => 'Production Manager', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Regie Shane', 'last_name' => 'Asi', 'email' => 'regie.asi@company.com', 'role' => 'Manager', 'position' => 'Logistics Manager', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' => 'Aeron', 'last_name' => 'Bagunu', 'email' => 'aeron.bagunu@company.com', 'role' => 'Manager', 'position' => 'Accounting Manager', 'department' => 'Accounting Department', 'salary' => 13520],
            ['first_name' => 'Shielwyn', 'last_name' => 'Kipte', 'email' => 'shielwyn.kipte@company.com', 'role' => 'Manager', 'position' => 'HR Manager', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'John Marvin', 'last_name' => 'Cero', 'email' => 'johnmarvin.cero@company.com', 'role' => 'Manager', 'position' => 'Operations Manager', 'department' => 'Operations Department', 'salary' => 13520],

            // Employees - Logistics
            ['first_name' => 'Joshua', 'last_name' => 'Bolilan', 'email' => 'joshua.bolilan@company.com', 'role' => 'Employee', 'position' => 'Driver', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' => 'Dominic', 'last_name' => 'Acla', 'email' => 'dominic.acla@company.com', 'role' => 'Employee', 'position' => 'Helper', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' =>  'Kyo', 'last_name' => 'Abaquita', 'email' => 'kyo.abaquita@company.com', 'role' => 'Employee', 'position' => 'Driver', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' => 'John Carlo', 'last_name' => 'Pitogo', 'email' => 'johncarlo.pitogo@company.com', 'role' => 'Employee', 'position' => 'Helper', 'department' => 'Logistics Department', 'salary' => 13520],

            // Employees - Accounting
            ['first_name' => 'John Chester', 'last_name' => 'Yalong', 'email' => 'johnchester.yalong@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Accounting Department', 'salary' => 13520],
            ['first_name' => 'Aaron', 'last_name' => 'Sagan', 'email' => 'aaron.sagan@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Accounting Department', 'salary' => 13520],

            // Employees - Production   
            ['first_name' => 'Arthur', 'last_name' => 'Regondola', 'email' => 'rey. @company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Hans Axle', 'last_name' => 'Consuelo', 'email' => 'hans.consuelo@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Mark Vincent', 'last_name' => 'Aguado', 'email' => 'mark.aguado@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],

            // Admins
            ['first_name' => 'Admin', 'last_name' => 'One', 'email' => 'admin.one@company.com', 'role' => 'Admin', 'position' => 'Admin', 'department' => 'IT Department', 'salary' => 13520],
            ['first_name' => 'Admin', 'last_name' => 'Two', 'email' => 'admin.two@company.com', 'role' => 'Admin', 'position' => 'Admin', 'department' => 'IT Department', 'salary' => 13520],

            // Applicants
            ['first_name' => 'Gwynne', 'last_name' => 'Nacawili', 'email' => 'gwynne.nacawili@company.com', 'role' => 'Applicant', 'position' => 'Applicant', 'department' => 'N/A', 'salary' => 13520],
            ['first_name' => 'Nathaniel', 'last_name' => 'Catindig', 'email' => 'nathaniel.catindig@company.com', 'role' => 'Applicant', 'position' => 'Applicant', 'department' => 'N/A', 'salary' => 13520],
        ];

        $this->createFixedUsers($users);
    }

    private function createFixedUsers(array $users): void
    {
        $employeeCounter = 1005; // Start from EM1005 (after DefaultAccountsSeeder uses EM1001-EM1003)
        foreach ($users as $u) {
            $roleId = Role::where('name', $u['role'])->value('id');

            $user = User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'first_name' => $u['first_name'],
                    'last_name' => $u['last_name'],
                    'password' => Hash::make('password123'),
                    'role_id' => $roleId,
                ]
            );

            // Only create employee profile for non-Applicants
            if ($u['role'] !== 'Applicant') {
                $profile = $user->employeeProfile()->updateOrCreate([], [
                    'employee_id' => 'EM' . $employeeCounter,
                    'first_name' => $u['first_name'],
                    'last_name' => $u['last_name'],
                    'email' => $u['email'],
                    'position' => $u['position'],
                    'department' => $u['department'],
                    'employment_status' => 'Full Time',
                    'hire_date' => now()->subDays(120)->toDateString(),
                    'salary' => $u['salary'] ?? 13520, // Use provided salary or default to 13520
                ]);
                $employeeCounter++;
            }
        }
    }
}




