<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\EvaluationForm;
use App\Models\EvaluationQuestion;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use Carbon\Carbon;

class EvaluationResultsSeeder extends Seeder
{
    public function run(): void
    {
        // Use the preferred "Assessment 1" form if available; otherwise fallback to any Active, otherwise create
        $hrStaffId = User::whereHas('role', fn($q) => $q->where('name', 'HR Staff'))->value('id') ?? User::first()?->id;

        $form = EvaluationForm::whereIn('title', ['Assesstment 1', 'Assessment 1'])
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->first();
        if (!$form) {
            $form = EvaluationForm::where('status', 'Active')->latest()->first();
        }
        if (!$form) {
            $form = EvaluationForm::create([
                'hr_staff_id' => $hrStaffId,
                'title' => 'Assessment 1',
                'description' => 'Default performance evaluation form based on the company template.',
                'status' => 'Active',
            ]);
        }

        if ($form->questions()->count() === 0) {
            $questions = [
                ['category' => 'Punctuality & Attendance', 'question_text' => 'Pagpasok sa tamang oras at hindi pagliban (Punctuality & Attendance)', 'order' => 1],
                ['category' => 'Attitude towards co-workers', 'question_text' => 'Pag-uugali sa kapwa manggagawa (Attitude towards co-workers)', 'order' => 2],
                ['category' => 'Quality of work', 'question_text' => 'Kalidad ng trabaho (Quality of work)', 'order' => 3],
                ['category' => 'Initiative', 'question_text' => 'Pagkukusa (Initiative)', 'order' => 4],
                ['category' => 'Teamwork', 'question_text' => 'Pagtutulungan ng magkasama (Teamwork)', 'order' => 5],
            ];
            foreach ($questions as $q) {
                $form->questions()->create($q);
            }
        }

        // Pick 10 employees (non-applicants with profiles) and assign a manager when possible
        $employees = User::where('role_id', '!=', 5)
            ->whereHas('employeeProfile')
            ->inRandomOrder()
            ->take(10)
            ->get();

        $managerId = User::whereHas('role', fn($q) => $q->where('name', 'Manager'))->inRandomOrder()->value('id');

        foreach ($employees as $emp) {
            $submittedAt = Carbon::now()->subDays(rand(1, 30));
            $eval = Evaluation::create([
                'evaluation_form_id' => $form->id,
                'employee_id' => $emp->id,
                'manager_id' => $managerId ?? $emp->id,
                'status' => 'Submitted',
                'passing_threshold' => 75,
                'general_comments' => 'Auto-generated evaluation record.',
                'submitted_at' => $submittedAt,
                'due_date' => $submittedAt->copy()->addDays(7),
                'evaluation_period_start' => $submittedAt->copy()->subMonths(3)->startOfMonth()->toDateString(),
                'evaluation_period_end' => $submittedAt->copy()->endOfMonth()->toDateString(),
            ]);

            // Create responses for each question with random ratings 6-10
            $total = 0; $count = 0;
            foreach ($form->questions as $question) {
                $rating = rand(6, 10);
                EvaluationResponse::create([
                    'evaluation_id' => $eval->id,
                    'evaluation_question_id' => $question->id,
                    'rating' => $rating,
                    'manager_comment' => $rating >= 8 ? 'Great performance' : 'Needs improvement in this area',
                ]);
                $total += $rating; $count++;
            }

            $average = $count ? $total / $count : 0;
            $percentage = $average * 10; // if rating is 1-10
            $eval->update([
                'total_score' => $total,
                'average_score' => round($average, 2),
                'percentage_score' => round($percentage, 2),
                'is_passed' => $percentage >= 75,
                'next_evaluation_date' => $submittedAt->copy()->addMonths(3),
            ]);
        }
    }
}


