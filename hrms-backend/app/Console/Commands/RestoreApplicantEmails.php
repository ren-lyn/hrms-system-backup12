<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RestoreApplicantEmails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'applicants:restore-emails {--dry-run : Show what would be changed without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Restore original applicant emails that were changed to @company.com format';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        if ($dryRun) {
            $this->info('DRY RUN MODE - No changes will be made');
        }

        $this->info('Starting email restoration process...');

        // Find Applicant role ID
        $applicantRoleId = DB::table('roles')->where('name', 'Applicant')->value('id');
        
        if (!$applicantRoleId) {
            $this->error('Applicant role not found!');
            return 1;
        }

        // Find users with Applicant role that have @company.com emails
        $usersWithCompanyEmails = DB::table('users')
            ->where('role_id', $applicantRoleId)
            ->where('email', 'LIKE', '%@company.com')
            ->get();

        $this->info("Found {$usersWithCompanyEmails->count()} users with @company.com emails");

        $restored = 0;
        $skipped = 0;

        foreach ($usersWithCompanyEmails as $user) {
            // Try to find original email from applicant record
            $applicant = DB::table('applicants')
                ->where('user_id', $user->id)
                ->first();

            if ($applicant && $applicant->email && !str_contains($applicant->email, '@company.com')) {
                if ($dryRun) {
                    $this->line("Would restore user {$user->id} email from '{$user->email}' to '{$applicant->email}'");
                } else {
                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['email' => $applicant->email]);
                    
                    $this->info("✓ Restored email for user {$user->id}: {$applicant->email}");
                    $restored++;
                }
            } else {
                $this->warn("⚠ Could not find original email for user {$user->id} (current: {$user->email})");
                $skipped++;
            }
        }

        // Also check applicants table
        $applicantsWithCompanyEmails = DB::table('applicants')
            ->where('email', 'LIKE', '%@company.com')
            ->get();

        $this->info("Found {$applicantsWithCompanyEmails->count()} applicant records with @company.com emails");

        foreach ($applicantsWithCompanyEmails as $applicant) {
            if ($applicant->user_id) {
                $user = DB::table('users')->where('id', $applicant->user_id)->first();
                
                if ($user && $user->email && !str_contains($user->email, '@company.com')) {
                    if ($dryRun) {
                        $this->line("Would restore applicant {$applicant->id} email from '{$applicant->email}' to '{$user->email}'");
                    } else {
                        DB::table('applicants')
                            ->where('id', $applicant->id)
                            ->update(['email' => $user->email]);
                        
                        $this->info("✓ Restored applicant email for applicant {$applicant->id}: {$user->email}");
                        $restored++;
                    }
                }
            }
        }

        if ($dryRun) {
            $this->info("\nDRY RUN COMPLETE - No changes were made");
        } else {
            $this->info("\n✓ Restoration complete!");
            $this->info("  - Restored: {$restored} emails");
            $this->info("  - Skipped: {$skipped} (manual review needed)");
        }

        return 0;
    }
}

