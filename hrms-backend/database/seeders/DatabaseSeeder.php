<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            AdminAccountSeeder::class,
            UserSeeder::class,
            DefaultAccountsSeeder::class,
            MultipleAccountsSeeder::class,
            MultipleAccountsLeaveSeeder::class,
            DisciplinaryCategorySeeder::class,
            // EmployeeProfileSeeder::class,
            // JobPostingSeeder::class,
            // ApplicantSeeder::class,
            MultipleAccountsLeaveSeeder::class,
            EvaluationResultsSeeder::class,
            CashAdvanceSeeder::class,
            // ApplicationSeeder::class,
            // AttendanceSeeder::class,
            // PayrollSeeder::class,
            // LeaveRequestSeeder::class,
            // EvaluationSeeder::class,
            DisciplinaryActionSeeder::class,
            PayrollDataSeeder::class,
            EmployeeShiftSeeder::class,
            // OnboardingTaskSeeder::class,
            // ResignationFlagSeeder::class,
            SecuritySettingsSeeder::class,
            Holiday2025To2050Seeder::class,
        ]);
    }
}
