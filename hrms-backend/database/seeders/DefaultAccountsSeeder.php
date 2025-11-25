<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\EmployeeProfile;
use App\Models\Applicant;
use App\Models\EvaluationForm;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use Carbon\Carbon;

class DefaultAccountsSeeder extends Seeder
{
    public function run(): void
    {
        // Resolve role IDs by name to avoid relying on order
        $roles = Role::pluck('id', 'name');

        // HR Staff - Migrate from old email if exists
        $oldHrStaffEmail = 'hrstaff@company.com';
        $newHrStaffEmail = 'barayangcrystalanne16@gmail.com';
        
        // First, try to find user by old email
        $existingHrStaff = User::where('email', $oldHrStaffEmail)->first();
        
        // If not found by old email, try to find by name
        if (!$existingHrStaff) {
            $existingHrStaff = User::where('first_name', 'Crystal Anne')
                ->where('last_name', 'Barayang')
                ->first();
        }
        
        if ($existingHrStaff) {
            $userWithNewEmail = User::where('email', $newHrStaffEmail)->where('id', '!=', $existingHrStaff->id)->first();
            if ($userWithNewEmail) {
                $this->command->warn("Cannot migrate HR Staff: {$newHrStaffEmail} is already in use by another user.");
            } else {
                // Store old email before updating
                $oldEmailValue = $existingHrStaff->email;
                // Update email and ensure password is correct
                $existingHrStaff->update([
                    'email' => $newHrStaffEmail,
                    'first_name' => 'Crystal Anne',
                    'last_name' => 'Barayang',
                    'password' => Hash::make('password123'),
                    'role_id' => $roles['HR Staff'] ?? 2,
                ]);
                $this->command->info("Migrated HR Staff from {$oldEmailValue} to {$newHrStaffEmail}.");
            }
        }
        
        $hrStaff = User::firstOrCreate(
            ['email' => $newHrStaffEmail],
            [
                'first_name' => 'Crystal Anne',
                'last_name' => 'Barayang',
                'password' => Hash::make('password123'),
                'role_id' => $roles['HR Staff'] ?? 2,
            ]
        );
        
        // Ensure password is correct even if user already existed
        if ($hrStaff->email === $newHrStaffEmail && !Hash::check('password123', $hrStaff->password)) {
            $hrStaff->update(['password' => Hash::make('password123')]);
            $this->command->info("Updated password for HR Staff with email {$newHrStaffEmail}.");
        }
        $hrStaff->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1003',
            'first_name' => 'Crystal Anne',
            'last_name' => 'Barayang',
            'gender' => 'Female',
            'email' => $newHrStaffEmail,
            'position' => 'HR Staff',
            'department' => 'HR Department',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subYears(1)->toDateString(),
            'status' => 'active', // Explicitly set status to active
            'sss' => '12-3456789-1',
            'philhealth' => 'PH-123456789',
            'pagibig' => 'PG-234567890',
            'tin_no' => '123-456-789-001',

        ]);

        // Manager - Migrate from old email if exists
        $oldManagerEmail = 'manager@company.com';
        $newManagerEmail = 'osiasshariel28@gmail.com';
        
        // First, try to find user by old email
        $existingManager = User::where('email', $oldManagerEmail)->first();
        
        // If not found by old email, try to find by name
        if (!$existingManager) {
            $existingManager = User::where('first_name', 'Shariel')
                ->where('last_name', 'Osias')
                ->first();
        }
        
        if ($existingManager) {
            $userWithNewEmail = User::where('email', $newManagerEmail)->where('id', '!=', $existingManager->id)->first();
            if ($userWithNewEmail) {
                $this->command->warn("Cannot migrate Manager: {$newManagerEmail} is already in use by another user.");
            } else {
                // Store old email before updating
                $oldEmailValue = $existingManager->email;
                // Update email and ensure password is correct
                $existingManager->update([
                    'email' => $newManagerEmail,
                    'first_name' => 'Shariel',
                    'last_name' => 'Osias',
                    'password' => Hash::make('password123'),
                    'role_id' => $roles['Manager'] ?? 3,
                ]);
                $this->command->info("Migrated Manager from {$oldEmailValue} to {$newManagerEmail}.");
            }
        }
        
        $manager = User::firstOrCreate(
            ['email' => $newManagerEmail],
            [
                'first_name' => 'Shariel',
                'last_name' => 'Osias',
                'password' => Hash::make('password123'),
                'role_id' => $roles['Manager'] ?? 3,
            ]
        );
        
        // Ensure password is correct even if user already existed
        if ($manager->email === $newManagerEmail && !Hash::check('password123', $manager->password)) {
            $manager->update(['password' => Hash::make('password123')]);
            $this->command->info("Updated password for Manager with email {$newManagerEmail}.");
        }
        $manager->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1004',
            'first_name' => 'Shariel',
            'last_name' => 'Osias',
            'gender' => 'Female',
            'email' => $newManagerEmail,
            'position' => 'Manager',
            'department' => 'Operations',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subYears(2)->toDateString(),
            'status' => 'active', // Explicitly set status to active
            'sss' => '12-3456789-2',
            'philhealth' => 'PH-234567890',
            'pagibig' => 'PG-345678901',
            'tin_no' => '123-456-789-002',
        ]);

        // Employee - Migrate from old email if exists
        $oldEmployeeEmail = 'employee@company.com';
        $newEmployeeEmail = 'cabuyaodonnamae87@gmail.com';
        
        // First, try to find user by old email
        $existingEmployee = User::where('email', $oldEmployeeEmail)->first();
        
        // If not found by old email, try to find by name
        if (!$existingEmployee) {
            $existingEmployee = User::where('first_name', 'Donna Mae')
                ->where('last_name', 'Cabuyao')
                ->first();
        }
        
        if ($existingEmployee) {
            $userWithNewEmail = User::where('email', $newEmployeeEmail)->where('id', '!=', $existingEmployee->id)->first();
            if ($userWithNewEmail) {
                $this->command->warn("Cannot migrate Employee: {$newEmployeeEmail} is already in use by another user.");
            } else {
                // Store old email before updating
                $oldEmailValue = $existingEmployee->email;
                // Update email and ensure password is correct
                $existingEmployee->update([
                    'email' => $newEmployeeEmail,
                    'first_name' => 'Donna Mae',
                    'last_name' => 'Cabuyao',
                    'password' => Hash::make('password123'),
                    'role_id' => $roles['Employee'] ?? 4,
                ]);
                $this->command->info("Migrated Employee from {$oldEmailValue} to {$newEmployeeEmail}.");
            }
        }
        
        $employee = User::firstOrCreate(
            ['email' => $newEmployeeEmail],
            [
                'first_name' => 'Donna Mae',
                'last_name' => 'Cabuyao',
                'password' => Hash::make('password123'),
                'role_id' => $roles['Employee'] ?? 4,
            ]
        );
        
        // Ensure password is correct even if user already existed
        if ($employee->email === $newEmployeeEmail && !Hash::check('password123', $employee->password)) {
            $employee->update(['password' => Hash::make('password123')]);
            $this->command->info("Updated password for Employee with email {$newEmployeeEmail}.");
        }
        $employee->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1005',
            'first_name' => 'Donna Mae',
            'last_name' => 'Cabuyao',
            'email' => $newEmployeeEmail,
            'position' => 'Staff',
            'gender' => 'Female',
            'department' => 'Operations',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => '2023-01-15', // Same hire date as HR Assistant (Renelyn Concina)
            'status' => 'active', // Explicitly set status to active
             'sss' => '12-3456789-3',
            'philhealth' => 'PH-345678901',
            'pagibig' => 'PG-456789012',
            'tin_no' => '123-456-789-003',
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
        
        // Get the HR Assistant from UserSeeder as well
        $hrAssistant = User::where('email', 'concinarenelyn86@gmail.com')->first();
        
        // Create evaluation results for employees (filter out nulls in case hrAssistant doesn't exist)
        $this->createEvaluationResults(array_filter([$hrStaff, $manager, $employee, $hrAssistant]));
    }
    
    private function createEvaluationResults(array $users): void
    {
        // Get or create evaluation form
        $form = $this->getOrCreateEvaluationForm();
        
        // Get a manager for evaluations (use the manager from default accounts)
        $managerId = User::whereHas('role', fn($q) => $q->where('name', 'Manager'))->first()?->id;
        
        if (!$form || !$managerId) {
            return;
        }
        
        // Get current year start
        $currentYear = Carbon::now()->year;
        
        // Define the evaluation months (March, June, September)
        $evaluationMonths = [3, 6, 9]; // March, June, September
        
            // Create evaluations for each user for each evaluation month
            foreach ($users as $userIndex => $user) {
                // Skip if user doesn't have an employee profile
                if (!$user->employeeProfile) {
                    continue;
                }

                // Create evaluations for each evaluation month
                foreach ($evaluationMonths as $month) {
                    $evaluationDate = Carbon::create($currentYear, $month, 1);

                    // Calculate evaluation period
                    $periodStart = $evaluationDate->copy()->startOfMonth();
                    $periodEnd = $evaluationDate->copy()->endOfMonth();
                    
                    // Determine employee performance pattern based on their index
                    // First employee: consistently good, Second: good->good->fail, Third: good->fail->good
                    $total = 0;
                    $ratings = [];
                    $questionCount = 0;
                    
                    $shouldPass = true;
                    if ($userIndex === 1 && $month === 9) {
                        // Second employee fails in September
                        $shouldPass = false;
                    } elseif ($userIndex === 2 && $month === 6) {
                        // Third employee fails in June
                        $shouldPass = false;
                    }
                    
                    foreach ($form->questions as $question) {
                        if ($shouldPass) {
                            // Employee will pass - give good ratings (7-10)
                            $rating = rand(7, 10);
                        } else {
                            // Employee will fail - give low ratings (1-5)
                            $rating = rand(1, 5);
                        }
                        $ratings[$question->id] = $rating;
                        $total += $rating;
                        $questionCount++;
                    }
                
                $average = $questionCount ? $total / $questionCount : 0;
                $percentage = $average * 10; // if rating is 1-10
                $maxPossibleScore = $questionCount * 10;
                $passingScore = round($maxPossibleScore * 0.70); // 70% threshold
                
                // Check if evaluation already exists for this period
                $eval = Evaluation::where('evaluation_form_id', $form->id)
                    ->where('employee_id', $user->id)
                    ->where('manager_id', $managerId)
                    ->where('evaluation_period_start', $periodStart->toDateString())
                    ->where('evaluation_period_end', $periodEnd->toDateString())
                    ->first();
                
                if (!$eval) {
                    $eval = Evaluation::create([
                        'evaluation_form_id' => $form->id,
                        'employee_id' => $user->id,
                        'manager_id' => $managerId,
                        'evaluation_period_start' => $periodStart->toDateString(),
                        'evaluation_period_end' => $periodEnd->toDateString(),
                        'status' => 'Submitted',
                        'total_score' => $total,
                        'average_score' => round($average, 2),
                        'percentage_score' => round($percentage, 2),
                        'passing_threshold' => $passingScore,
                        'is_passed' => $total >= $passingScore,
                        'general_comments' => 'Quarterly performance evaluation.',
                        'submitted_at' => $evaluationDate,
                        'due_date' => $evaluationDate->copy()->addDays(7),
                        'next_evaluation_date' => $evaluationDate->copy()->addMonths(3),
                    ]);
                    
                    // Create responses for each question only if evaluation was created
                    foreach ($ratings as $questionId => $rating) {
                        $comment = '';
                        if ($rating >= 9) {
                            $comment = 'Outstanding performance in this area.';
                        } elseif ($rating >= 7) {
                            $comment = 'Good performance with consistent results.';
                        } elseif ($rating >= 5) {
                            $comment = 'Adequate performance. Improvement needed.';
                        } elseif ($rating >= 3) {
                            $comment = 'Below expectations. Significant improvement required.';
                        } else {
                            $comment = 'Poor performance. Immediate action required.';
                        }
                        
                        EvaluationResponse::create([
                            'evaluation_id' => $eval->id,
                            'evaluation_question_id' => $questionId,
                            'rating' => $rating,
                            'manager_comment' => $comment,
                        ]);
                    }
                }
            }
        }
    }
    
    private function getOrCreateEvaluationForm()
    {
        // Try to get existing "Assessment 1" form
        $form = EvaluationForm::whereIn('title', ['Assessment 1', 'Assesstment 1'])
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->first();
            
        if (!$form) {
            // Try to get any Active form
            $form = EvaluationForm::where('status', 'Active')->latest()->first();
        }
        
        if (!$form) {
            // Create a new form if none exists
            $hrStaffId = User::whereHas('role', fn($q) => $q->where('name', 'HR Staff'))->value('id') ?? User::first()?->id;
            
            $form = EvaluationForm::create([
                'hr_staff_id' => $hrStaffId,
                'title' => 'Assessment 1',
                'description' => 'Default performance evaluation form.',
                'status' => 'Active',
            ]);
            
            // Add questions if form is newly created
            $questions = [
                ['category' => 'Punctuality & Attendance', 'question_text' => 'Pagpasok sa tamang oras at hindi pagliban (Punctuality & Attendance)', 'order' => 1],
                ['category' => 'Attitude towards co-workers', 'question_text' => 'Pag-uugali sa kapwa manggagawa (Attitude towards co-workers)', 'order' => 2],
                ['category' => 'Quality of work', 'question_text' => 'Kalidad ng trabaho (Quality of work)', 'order' => 3],
                ['category' => 'Initiative', 'question_text' => 'Pagkukusa (Initiative)', 'order' => 4],
                ['category' => 'Teamwork', 'question_text' => 'Pagtutulungan ng magkasama (Teamwork)', 'order' => 5],
                ['category' => 'Trustworthy and Reliable', 'question_text' => 'Mapagkakatiwalaan at Maaasahan (Trustworthy and Reliable)', 'order' => 6],
            ];
            
            foreach ($questions as $q) {
                $form->questions()->create($q);
            }
        }
        
        return $form;
    }
}
