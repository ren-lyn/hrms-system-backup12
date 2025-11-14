<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\EmployeeProfile;
use Illuminate\Support\Facades\Hash;

class MigrateUserEmails extends Command
{
    protected $signature = 'users:migrate-emails';
    protected $description = 'Migrate user emails from old company emails to new Google emails';

    public function handle()
    {
        $this->info('Starting email migration...');

        // Email mappings: old => new
        $emailMappings = [
            'hr@company.com' => [
                'new_email' => 'concinarenelyn86@gmail.com',
                'first_name' => 'Renelyn',
                'last_name' => 'Concina',
            ],
            'hrstaff@company.com' => [
                'new_email' => 'barayangcrystalanne16@gmail.com',
                'first_name' => 'Crystal Anne',
                'last_name' => 'Barayang',
            ],
            'manager@company.com' => [
                'new_email' => 'osiasshariel28@gmail.com',
                'first_name' => 'Shariel',
                'last_name' => 'Osias',
            ],
            'employee@company.com' => [
                'new_email' => 'cabuyaodonnamae87@gmail.com',
                'first_name' => 'Donna Mae',
                'last_name' => 'Cabuyao',
            ],
        ];

        $migrated = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($emailMappings as $oldEmail => $data) {
            $newEmail = $data['new_email'];
            $firstName = $data['first_name'];
            $lastName = $data['last_name'];

            // Find user by old email
            $user = User::where('email', $oldEmail)->first();

            // If not found by old email, try by name
            if (!$user) {
                $user = User::where('first_name', $firstName)
                    ->where('last_name', $lastName)
                    ->first();
            }

            if ($user) {
                // Check if new email is already taken by another user
                $existingUserWithNewEmail = User::where('email', $newEmail)
                    ->where('id', '!=', $user->id)
                    ->first();

                if ($existingUserWithNewEmail) {
                    $this->warn("Skipped: {$newEmail} is already in use by another user (ID: {$existingUserWithNewEmail->id})");
                    $skipped++;
                    continue;
                }

                // Migrate user
                $oldEmailValue = $user->email;
                $user->update([
                    'email' => $newEmail,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'password' => Hash::make('password123'),
                ]);

                // Update employee profile if exists
                if ($user->employeeProfile) {
                    $user->employeeProfile->update([
                        'email' => $newEmail,
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                    ]);
                }

                $this->info("✓ Migrated: {$oldEmailValue} → {$newEmail}");
                $migrated++;
            } else {
                // Check if user already exists with new email
                $existingUser = User::where('email', $newEmail)->first();
                if ($existingUser) {
                    // Ensure password is correct
                    if (!Hash::check('password123', $existingUser->password)) {
                        $existingUser->update(['password' => Hash::make('password123')]);
                        $this->info("✓ Updated password for existing user: {$newEmail}");
                        $migrated++;
                    } else {
                        $this->info("✓ User already exists with correct email: {$newEmail}");
                        $skipped++;
                    }
                } else {
                    $this->warn("User not found for: {$oldEmail} or name: {$firstName} {$lastName}");
                    $errors++;
                }
            }
        }

        $this->info("\nMigration complete!");
        $this->info("Migrated: {$migrated}");
        $this->info("Skipped: {$skipped}");
        if ($errors > 0) {
            $this->warn("Errors: {$errors}");
        }

        return 0;
    }
}

