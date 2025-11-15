<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RestoreOriginalApplicantEmails extends Migration
{
    /**
     * Run the migrations.
     * 
     * This migration restores original applicant emails that were changed to company.com format.
     * It finds applicants whose emails were changed to @company.com format and attempts to restore
     * their original registration emails from the users table or applicant records.
     */
    public function up()
    {
        Log::info('Starting migration to restore original applicant emails...');

        // Find all users with Applicant role that have @company.com emails
        $applicantRoleId = DB::table('roles')->where('name', 'Applicant')->value('id');
        
        if (!$applicantRoleId) {
            Log::warning('Applicant role not found. Skipping email restoration.');
            return;
        }

        $usersWithCompanyEmails = DB::table('users')
            ->where('role_id', $applicantRoleId)
            ->where('email', 'LIKE', '%@company.com')
            ->get();

        Log::info("Found {$usersWithCompanyEmails->count()} users with @company.com emails to check.");

        foreach ($usersWithCompanyEmails as $user) {
            // Try to find original email from applicant record
            $applicant = DB::table('applicants')
                ->where('user_id', $user->id)
                ->first();

            if ($applicant && $applicant->email && !str_contains($applicant->email, '@company.com')) {
                // Restore original email from applicant record
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['email' => $applicant->email]);
                
                Log::info("Restored email for user {$user->id}: {$applicant->email}");
            } else {
                // Check if there's a backup or log entry
                // For now, we'll log it for manual review
                Log::warning("Could not find original email for user {$user->id} (current: {$user->email}). Manual review needed.");
            }
        }

        // Also check applicants table for @company.com emails
        $applicantsWithCompanyEmails = DB::table('applicants')
            ->where('email', 'LIKE', '%@company.com')
            ->get();

        Log::info("Found {$applicantsWithCompanyEmails->count()} applicant records with @company.com emails to check.");

        foreach ($applicantsWithCompanyEmails as $applicant) {
            if ($applicant->user_id) {
                $user = DB::table('users')->where('id', $applicant->user_id)->first();
                
                if ($user && $user->email && !str_contains($user->email, '@company.com')) {
                    // Restore original email from user record
                    DB::table('applicants')
                        ->where('id', $applicant->id)
                        ->update(['email' => $user->email]);
                    
                    Log::info("Restored applicant email for applicant {$applicant->id}: {$user->email}");
                }
            }
        }

        Log::info('Migration to restore original applicant emails completed.');
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        // This migration should not be reversed as it restores original data
        Log::info('Reverse migration skipped - this migration restores original data and should not be reversed.');
    }
}

