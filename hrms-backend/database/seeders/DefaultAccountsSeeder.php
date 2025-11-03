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

        // HR Staff
        $hrStaff = User::firstOrCreate(
            ['email' => 'hrstaff@company.com'],
            [
                'first_name' => 'Crystal Anne',
                'last_name' => 'Barayang',
                'password' => Hash::make('password123'),
                'role_id' => $roles['HR Staff'] ?? 2,
            ]
        );
        $hrStaff->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1002',
            'first_name' => 'Crystal Anne',
            'last_name' => 'Barayang',
            'email' => 'hrstaff@company.com',
            'position' => 'HR Staff',
            'department' => 'HR Department',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subYears(1)->toDateString(),
        ]);

        // Manager
        $manager = User::firstOrCreate(
            ['email' => 'manager@company.com'],
            [
                'first_name' => 'Shariel',
                'last_name' => 'Osias',
                'password' => Hash::make('password123'),
                'role_id' => $roles['Manager'] ?? 3,
            ]
        );
        $manager->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1003',
            'first_name' => 'Shariel',
            'last_name' => 'Osias',
            'email' => 'manager@company.com',
            'position' => 'Manager',
            'department' => 'Operations',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subYears(2)->toDateString(),
        ]);

        // Employee
        $employee = User::firstOrCreate(
            ['email' => 'employee@company.com'],
            [
                'first_name' => 'Donna Mae',
                'last_name' => 'Cabuyao',
                'password' => Hash::make('password123'),
                'role_id' => $roles['Employee'] ?? 4,
            ]
        );
        $employee->employeeProfile()->updateOrCreate([], [
            'employee_id' => 'EM1004',
            'first_name' => 'Donna Mae',
            'last_name' => 'Cabuyao',
            'email' => 'employee@company.com',
            'position' => 'Staff',
            'department' => 'Operations',
            'employment_status' => 'Full Time',
            'salary' => 13520,
            'hire_date' => now()->subMonths(6)->toDateString(),
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
        $hrAssistant = User::where('email', 'hr@company.com')->first();
        
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
