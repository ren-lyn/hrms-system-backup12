<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Ensure clean state for Profile Creation related tables before seeding
        // This is a safety measure to prevent old data from appearing after migration
        $this->ensureCleanProfileCreationState();

        $this->call([
            RoleSeeder::class,
            AdminAccountSeeder::class,
            UserSeeder::class,
            DefaultAccountsSeeder::class,
            MultipleAccountsSeeder::class,
            MultipleAccountsLeaveSeeder::class,
            DisciplinaryCategorySeeder::class,
            //EmployeeProfileSeeder::class,
            //JobPostingSeeder::class,
            //ApplicantSeeder::class,
            MultipleAccountsLeaveSeeder::class,
            //EvaluationResultsSeeder::class, // Disabled - evaluations created in DefaultAccountsSeeder and MultipleAccountsSeeder
            CashAdvanceSeeder::class,
            //ApplicationSeeder::class,
            AttendanceRecordSeeder::class,
            //PayrollSeeder::class,
            //LeaveRequestSeeder::class,
            //EvaluationSeeder::class,
            DisciplinaryActionSeeder::class,
            PayrollDataSeeder::class,
            EmployeeShiftSeeder::class,
            //OnboardingTaskSeeder::class,
            //ResignationFlagSeeder::class,
            SecuritySettingsSeeder::class,
            Holiday2025To2050Seeder::class,
            ApprovedLeaveRequestSeeder::class,
            ApprovedOvertimeRequestSeeder::class,
            //EmployeeProfileSeeder::class,
        ]);

        // Run cleanup again AFTER seeding to catch any data that might have been created during seeding
        // This is a safety measure to ensure Profile Creation tab remains empty
        $this->ensureCleanProfileCreationState();
    }

    /**
     * Ensure that Profile Creation related tables are clean before seeding.
     * This prevents old records from appearing in the Profile Creation tab.
     */
    private function ensureCleanProfileCreationState(): void
    {
        try {
            // Disable foreign key checks temporarily to allow deletion
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            }

            // IMPORTANT: Query benefits_enrollments BEFORE truncating it!
            // Delete ALL applications that could appear in Profile Creation tab
            // This ensures Profile Creation tab is completely empty after migration
            if (Schema::hasTable('applications')) {
                // Delete ALL applications - we want a completely clean slate
                // This is the most aggressive approach to ensure no old data persists
                $totalApplications = DB::table('applications')->count();
                
                if ($totalApplications > 0) {
                    // Delete all applications
                    DB::table('applications')->delete();
                    $this->command->info("Cleared ALL {$totalApplications} application(s) to ensure clean Profile Creation state.");
                }
            }
            
            // Also ensure benefits_enrollments is completely empty
            if (Schema::hasTable('benefits_enrollments')) {
                DB::table('benefits_enrollments')->truncate();
                $this->command->info('Cleared benefits_enrollments table.');
            }

            // Truncate onboarding_records if it exists
            if (Schema::hasTable('onboarding_records')) {
                DB::table('onboarding_records')->truncate();
                $this->command->info('Cleared onboarding_records table.');
            }


            // Re-enable foreign key checks
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }
        } catch (\Exception $e) {
            $this->command->warn('Warning: Could not ensure clean Profile Creation state: ' . $e->getMessage());
        }
    }
}
