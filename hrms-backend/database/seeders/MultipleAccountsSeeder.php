<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\EmployeeProfile;
use App\Models\EvaluationForm;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use Carbon\Carbon;

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
            ['first_name' => 'Princes', 'last_name' => 'Duran', 'gender' => 'Female', 'email' => 'princes.duran@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'Lanz', 'last_name' => 'Ardenio', 'gender' => 'Male', 'email' => 'lanz.ardenio@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'Abigail', 'last_name' => 'Manalo', 'gender' => 'Female', 'email' => 'abigail.manalo@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'Allen Jasper', 'last_name' => 'Ararao', 'gender' => 'Male', 'email' => 'allen.ararao@company.com', 'role' => 'HR Staff', 'position' => 'HR Staff', 'department' => 'HR Department', 'salary' => 13520],

            // Managers
            ['first_name' => 'Elwin', 'last_name' => 'Madraga', 'gender' => 'Male', 'email' => 'elwin.madraga@company.com', 'role' => 'Manager', 'position' => 'Production Manager', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Regie Shane', 'last_name' => 'Asi', 'gender' => 'Male', 'email' => 'regie.asi@company.com', 'role' => 'Manager', 'position' => 'Logistics Manager', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' => 'Aeron', 'last_name' => 'Bagunu', 'gender' => 'Male', 'email' => 'aeron.bagunu@company.com', 'role' => 'Manager', 'position' => 'Accounting Manager', 'department' => 'Accounting Department', 'salary' => 13520],
            ['first_name' => 'Shielwyn', 'last_name' => 'Kipte', 'gender' => 'Female', 'email' => 'shielwyn.kipte@company.com', 'role' => 'Manager', 'position' => 'HR Manager', 'department' => 'HR Department', 'salary' => 13520],
            ['first_name' => 'John Marvin', 'last_name' => 'Cero', 'gender' => 'Male', 'email' => 'johnmarvin.cero@company.com', 'role' => 'Manager', 'position' => 'Operations Manager', 'department' => 'Operations Department', 'salary' => 13520],

            // Employees - Logistics
            ['first_name' => 'Joshua', 'last_name' => 'Bolilan', 'gender' => 'Male', 'email' => 'joshua.bolilan@company.com', 'role' => 'Employee', 'position' => 'Driver', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' => 'Dominic', 'last_name' => 'Acla', 'gender' => 'Male', 'email' => 'dominic.acla@company.com', 'role' => 'Employee', 'position' => 'Helper', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' =>  'Kyo', 'last_name' => 'Abaquita', 'gender' => 'Male', 'email' => 'kyo.abaquita@company.com', 'role' => 'Employee', 'position' => 'Driver', 'department' => 'Logistics Department', 'salary' => 13520],
            ['first_name' => 'John Carlo', 'last_name' => 'Pitogo', 'gender' => 'Male', 'email' => 'johncarlo.pitogo@company.com', 'role' => 'Employee', 'position' => 'Helper', 'department' => 'Logistics Department', 'salary' => 13520],

            // Employees - Accounting
            ['first_name' => 'John Chester', 'last_name' => 'Yalong', 'gender' => 'Male', 'email' => 'johnchester.yalong@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Accounting Department', 'salary' => 13520],
            ['first_name' => 'Aaron', 'last_name' => 'Sagan', 'gender' => 'Male', 'email' => 'aaron.sagan@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Accounting Department', 'salary' => 13520],

            // Employees - Production   
            ['first_name' => 'Arthur', 'last_name' => 'Regondola', 'gender' => 'Male', 'email' => 'arthur.regondola@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Hans Axle', 'last_name' => 'Consuelo', 'gender' => 'Male', 'email' => 'hans.consuelo@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Mark Vincent', 'last_name' => 'Aguado', 'gender' => 'Male', 'email' => 'mark.aguado@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Francisco', 'last_name' => 'Carbonell', 'gender' => 'Male', 'email' => 'kiko.carbonell@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],
            ['first_name' => 'Luisa Joy', 'last_name' => 'Catindig', 'gender' => 'Female', 'email' => 'luisajoy.catindig@company.com', 'role' => 'Employee', 'position' => 'Staff', 'department' => 'Production Department', 'salary' => 13520],

            // Admins
            ['first_name' => 'Admin', 'last_name' => 'One', 'gender' => 'Male', 'email' => 'admin.one@company.com', 'role' => 'Admin', 'position' => 'Admin', 'department' => 'IT Department', 'salary' => 13520],
            ['first_name' => 'Admin', 'last_name' => 'Two', 'gender' => 'Male', 'email' => 'admin.two@company.com', 'role' => 'Admin', 'position' => 'Admin', 'department' => 'IT Department', 'salary' => 13520],

            // Applicants
            ['first_name' => 'Gwynne', 'last_name' => 'Nacawili', 'gender' => 'Female', 'email' => 'gwynne.nacawili@company.com', 'role' => 'Applicant', 'position' => 'Applicant', 'department' => 'N/A', 'salary' => 13520],
            ['first_name' => 'Nathaniel', 'last_name' => 'Catindig', 'gender' => 'Male', 'email' => 'nathaniel.catindig@company.com', 'role' => 'Applicant', 'position' => 'Applicant', 'department' => 'N/A', 'salary' => 13520],
        ];

        $createdUsers = $this->createFixedUsers($users);
        
        // Create evaluation results for employees
        $this->createEvaluationResults($createdUsers);
    }

    private function createFixedUsers(array $users): array
    {
        $employeeCounter = 1006; // Start from EM1006 (after DefaultAccountsSeeder uses EM1001-EM1005)
        $createdUsers = [];
        
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

            // Only create employee profile for non-Applicants and non-Admins
            if ($u['role'] !== 'Applicant' && $u['role'] !== 'Admin') {
                // Generate unique government ID numbers in proper Philippine formats
                $sssNumber = sprintf('%02d-%07d-%d', rand(10, 99), rand(1000000, 9999999), rand(0, 9));
                $philhealthNumber = 'PH-' . sprintf('%09d', rand(100000000, 999999999));
                $pagibigNumber = 'PG-' . sprintf('%09d', rand(100000000, 999999999));
                $tinNumber = sprintf('%03d-%03d-%03d-%03d', rand(100, 999), rand(100, 999), rand(100, 999), rand(100, 999));
                
                // Set hire date to 1 year ago for Luisa Joy Catindig, otherwise 120 days ago
                $hireDate = ($u['first_name'] === 'Luisa Joy' && $u['last_name'] === 'Catindig') 
                    ? now()->subYear()->toDateString() 
                    : now()->subDays(120)->toDateString();
                
                $profile = $user->employeeProfile()->updateOrCreate([], [
                    'employee_id' => 'EM' . $employeeCounter,
                    'first_name' => $u['first_name'],
                    'last_name' => $u['last_name'],
                    'email' => $u['email'],
                    'position' => $u['position'],
                    'department' => $u['department'],
                    'employment_status' => 'Full Time',
                    'hire_date' => $hireDate,
                    'salary' => $u['salary'] ?? 13520, // Use provided salary or default to 13520
                    'status' => 'active', // Explicitly set status to active
                    'gender' => $u['gender'] ?? null, // Add gender if provided
                    'sss' => $sssNumber,
                    'philhealth' => $philhealthNumber,
                    'pagibig' => $pagibigNumber,
                    'tin_no' => $tinNumber,
                ]);
                $createdUsers[] = $user;
                $employeeCounter++;
            }
        }
        
        return $createdUsers;
    }
    
    private function createEvaluationResults(array $users): void
    {
        // Get or create evaluation form
        $form = $this->getOrCreateEvaluationForm();
        
        // Get a manager for evaluations
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
                    
                    // Determine employee performance pattern
                    // Mix: Some employees consistently good, some fail in June, some fail in September
                    $total = 0;
                    $ratings = [];
                    $questionCount = 0;
                    
                    $shouldPass = true;
                    // Approximately 15% (about 5) fail in June (indices 2, 8, 14, 20, 26)
                    if ($month === 6 && $userIndex % 6 === 2) {
                        $shouldPass = false;
                    }
                    // Approximately 10% (about 3-4) fail in September (indices 3, 10, 17, 24)
                    elseif ($month === 9 && $userIndex % 7 === 3) {
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




