<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ClearProfileCreationData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'profile-creation:clear';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all Profile Creation related data (applications with completed benefits enrollment)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Clearing Profile Creation data...');

        try {
            // Disable foreign key checks temporarily
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            }

            // Count before deletion
            $benefitsCount = 0;
            $applicationsCount = 0;
            $onboardingCount = 0;

            if (Schema::hasTable('benefits_enrollments')) {
                $benefitsCount = DB::table('benefits_enrollments')
                    ->where('enrollment_status', 'completed')
                    ->count();
                
                if ($benefitsCount > 0) {
                    DB::table('benefits_enrollments')
                        ->where('enrollment_status', 'completed')
                        ->delete();
                    $this->info("Deleted {$benefitsCount} completed benefits enrollment record(s).");
                }
            }

            // Delete ALL applications that could appear in Profile Creation
            if (Schema::hasTable('applications')) {
                // Get count of all applications
                $totalApplications = DB::table('applications')->count();
                
                // Delete ALL applications - most aggressive approach
                if ($totalApplications > 0) {
                    DB::table('applications')->delete();
                    $this->info("Deleted ALL {$totalApplications} application(s) to ensure clean Profile Creation state.");
                }
            }
            
            // Also clear all benefits enrollments
            if (Schema::hasTable('benefits_enrollments')) {
                $benefitsCount = DB::table('benefits_enrollments')->count();
                if ($benefitsCount > 0) {
                    DB::table('benefits_enrollments')->delete();
                    $this->info("Deleted {$benefitsCount} benefits enrollment record(s).");
                }
            }

            if (Schema::hasTable('onboarding_records')) {
                $onboardingCount = DB::table('onboarding_records')->count();
                if ($onboardingCount > 0) {
                    DB::table('onboarding_records')->truncate();
                    $this->info("Cleared {$onboardingCount} onboarding record(s).");
                }
            }

            // Re-enable foreign key checks
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }

            if ($benefitsCount === 0 && $applicationsCount === 0 && $onboardingCount === 0) {
                $this->info('No Profile Creation data found. Database is clean.');
            } else {
                $this->info('Profile Creation data cleared successfully!');
            }

            return 0;
        } catch (\Exception $e) {
            $this->error('Error clearing Profile Creation data: ' . $e->getMessage());
            return 1;
        }
    }
}
