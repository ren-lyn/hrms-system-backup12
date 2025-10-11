<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Applicant;
use App\Models\JobPosting;
use App\Models\Application;
use Illuminate\Support\Facades\Hash;

use Illuminate\Database\Seeder;

class ApplicantSeeder extends Seeder
{
    public function run(): void
    {
        $jobs = JobPosting::pluck('id');
        if ($jobs->count() === 0) {
            $this->command?->warn('No job postings found. Run JobPostingSeeder first.');
            return;
        }

        for ($i = 0; $i < 10; $i++) {
            $first = fake()->firstName();
            $last = fake()->lastName();
            $email = strtolower($first . '.' . $last . rand(100,999) . '@applicant.test');

            $user = User::create([
                'first_name' => $first,
                'last_name' => $last,
                'email' => $email,
                'password' => Hash::make('password123'),
                'role_id' => 5, // Applicant
            ]);

            $applicant = Applicant::create([
                'user_id' => $user->id,
                'first_name' => $first,
                'last_name' => $last,
                'email' => $email,
                'contact_number' => fake()->phoneNumber(),
                'resume_path' => null,
            ]);

            // Create linked application to a random existing Job Posting
            Application::create([
                'job_posting_id' => $jobs->random(),
                'applicant_id' => $applicant->id,
                'status' => 'Applied',
                'resume_path' => 'resumes/' . fake()->uuid() . '.pdf',
                'applied_at' => now(),
            ]);
        }
    }
}
