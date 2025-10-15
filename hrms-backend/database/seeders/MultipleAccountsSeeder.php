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
            ['first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria.santos@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department'],
            ['first_name' => 'Jose', 'last_name' => 'Ramirez', 'email' => 'jose.ramirez@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department'],
            ['first_name' => 'Anna', 'last_name' => 'Gonzales', 'email' => 'anna.gonzales@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department'],
            ['first_name' => 'Paolo', 'last_name' => 'Reyes', 'email' => 'paolo.reyes@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department'],

            // Managers
            ['first_name' => 'Leonardo', 'last_name' => 'Cruz', 'email' => 'leonardo.cruz@company.com', 'role' => 'Manager', 'position' => 'Production Manager', 'department' => 'Production Department'],
            ['first_name' => 'Carla', 'last_name' => 'Valdez', 'email' => 'carla.valdez@company.com', 'role' => 'Manager', 'position' => 'Logistics Manager', 'department' => 'Logistics Department'],
            ['first_name' => 'Victor', 'last_name' => 'Lim', 'email' => 'victor.lim@company.com', 'role' => 'Manager', 'position' => 'Accounting Manager', 'department' => 'Accounting Department'],
            ['first_name' => 'Irene', 'last_name' => 'Chua', 'email' => 'irene.chua@company.com', 'role' => 'Manager', 'position' => 'HR Manager', 'department' => 'HR Department'],
            ['first_name' => 'Marco', 'last_name' => 'Santiago', 'email' => 'marco.santiago@company.com', 'role' => 'Manager', 'position' => 'Operations Manager', 'department' => 'Operations Department'],

            // Employees - Logistics
            ['first_name' => 'Ramon', 'last_name' => 'Dela Cruz', 'email' => 'ramon.delacruz@company.com', 'role' => 'Employee', 'position' => 'Driver', 'department' => 'Logistics Department'],
            ['first_name' => 'Tony', 'last_name' => 'Garcia', 'email' => 'tony.garcia@company.com', 'role' => 'Employee', 'position' => 'Helper', 'department' => 'Logistics Department'],
            ['first_name' => 'Luis', 'last_name' => 'Navarro', 'email' => 'luis.navarro@company.com', 'role' => 'Employee', 'position' => 'Driver', 'department' => 'Logistics Department'],
            ['first_name' => 'Erik', 'last_name' => 'Flores', 'email' => 'erik.flores@company.com', 'role' => 'Employee', 'position' => 'Helper', 'department' => 'Logistics Department'],

            // Employees - Accounting
            ['first_name' => 'Michelle', 'last_name' => 'Uy', 'email' => 'michelle.uy@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Accounting Department'],
            ['first_name' => 'Janelle', 'last_name' => 'Tan', 'email' => 'janelle.tan@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Accounting Department'],

            // Employees - Production
            ['first_name' => 'Rey', 'last_name' => 'Mendoza', 'email' => 'rey.mendoza@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department'],
            ['first_name' => 'Noel', 'last_name' => 'Serrano', 'email' => 'noel.serrano@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department'],
            ['first_name' => 'Kristine', 'last_name' => 'Lopez', 'email' => 'kristine.lopez@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department'],

            // Admins
            ['first_name' => 'Admin', 'last_name' => 'One', 'email' => 'admin.one@company.com', 'role' => 'Admin', 'position' => 'Admin', 'department' => 'IT Department'],
            ['first_name' => 'Admin', 'last_name' => 'Two', 'email' => 'admin.two@company.com', 'role' => 'Admin', 'position' => 'Admin', 'department' => 'IT Department'],

            // Applicants
            ['first_name' => 'Patrick', 'last_name' => 'Bautista', 'email' => 'patrick.bautista@company.com', 'role' => 'Applicant', 'position' => 'Applicant', 'department' => 'N/A'],
            ['first_name' => 'Jessa', 'last_name' => 'Roque', 'email' => 'jessa.roque@company.com', 'role' => 'Applicant', 'position' => 'Applicant', 'department' => 'N/A'],
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
                ]);
                $employeeCounter++;
            }
        }
    }
}




