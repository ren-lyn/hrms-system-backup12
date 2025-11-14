<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\EmployeeProfile;
use App\Models\EvaluationForm;
use App\Models\EvaluationQuestion;

class TestEvaluationSeeder extends Seeder
{
    public function run()
    {
        // Check if test data already exists
        if (User::where('email', 'testmanager@company.com')->exists()) {
            echo "Test data already exists. Skipping seeding.\n";
            return;
        }

        // Create a manager
        $manager = User::create([
            'first_name' => 'John',
            'last_name' => 'Manager',
            'email' => 'testmanager@company.com',
            'role_id' => 3, // Manager role ID
            'password' => bcrypt('password123'),
        ]);

        // Create test employees
        $employees = [
            ['name' => 'Alice Employee', 'email' => 'alice@company.com', 'dept' => 'Engineering', 'position' => 'Software Developer', 'emp_id' => 'EMP001'],
            ['name' => 'Bob Worker', 'email' => 'bob@company.com', 'dept' => 'Marketing', 'position' => 'Marketing Specialist', 'emp_id' => 'EMP002'],
            ['name' => 'Carol Staff', 'email' => 'carol@company.com', 'dept' => 'Engineering', 'position' => 'Frontend Developer', 'emp_id' => 'EMP003'],
        ];

        foreach ($employees as $emp) {
            $nameParts = explode(' ', $emp['name']);
            $user = User::create([
                'first_name' => $nameParts[0],
                'last_name' => $nameParts[1] ?? '',
                'email' => $emp['email'],
                'role_id' => 4, // Employee role ID
                'password' => bcrypt('password123'),
            ]);

            // Create employee profile
            EmployeeProfile::create([
                'user_id' => $user->id,
                'employee_id' => $emp['emp_id'],
                'first_name' => $nameParts[0],
                'last_name' => $nameParts[1] ?? '',
                'email' => $emp['email'],
                'department' => $emp['dept'],
                'position' => $emp['position'],
            ]);
        }

        // Create an active evaluation form
        $form = EvaluationForm::create([
            'hr_staff_id' => 1, // Assuming HR Assistant with ID 1 exists
            'title' => 'Q4 2025 Performance Evaluation',
            'description' => 'Quarterly performance evaluation focusing on core competencies and achievements.',
            'status' => 'Active',
        ]);

        // Create evaluation questions
        $questions = [
            [
                'category' => 'Technical Skills',
                'question_text' => 'How would you rate the employee\'s technical competency and ability to solve complex problems?',
                'description' => 'Consider their problem-solving approach, technical knowledge, and ability to learn new technologies.',
                'order' => 1
            ],
            [
                'category' => 'Communication',
                'question_text' => 'How effectively does the employee communicate with team members and stakeholders?',
                'description' => 'Evaluate their verbal and written communication skills, clarity of expression, and active listening.',
                'order' => 2
            ],
            [
                'category' => 'Teamwork',
                'question_text' => 'How well does the employee collaborate and work within a team environment?',
                'description' => 'Consider their ability to share knowledge, support colleagues, and contribute to team goals.',
                'order' => 3
            ],
            [
                'category' => 'Initiative',
                'question_text' => 'How proactive is the employee in identifying opportunities and taking initiative?',
                'description' => 'Evaluate their self-motivation, ability to work independently, and drive for improvement.',
                'order' => 4
            ],
            [
                'category' => 'Quality of Work',
                'question_text' => 'How would you rate the overall quality and accuracy of the employee\'s work output?',
                'description' => 'Consider attention to detail, thoroughness, and consistency in delivering high-quality results.',
                'order' => 5
            ],
            [
                'category' => 'Adaptability',
                'question_text' => 'How well does the employee adapt to changes and handle new challenges?',
                'description' => 'Evaluate their flexibility, openness to change, and ability to learn from feedback.',
                'order' => 6
            ]
        ];

        foreach ($questions as $questionData) {
            EvaluationQuestion::create([
                'evaluation_form_id' => $form->id,
                'category' => $questionData['category'],
                'question_text' => $questionData['question_text'],
                'description' => $questionData['description'],
                'order' => $questionData['order'],
            ]);
        }

        echo "Test evaluation data created successfully!\n";
        echo "Manager: testmanager@company.com (password: password123)\n";
        echo "Employees: alice@company.com, bob@company.com, carol@company.com (password: password123)\n";
        echo "Active evaluation form: '{$form->title}' with {$form->questions->count()} questions\n";
    }
}
