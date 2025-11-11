<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\EvaluationForm;
use App\Models\EvaluationQuestion;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use Carbon\Carbon;
use Illuminate\Support\Arr;

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
                ['category' => 'Trustworthy and Reliable', 'question_text' => 'Mapagkakatiwalaan at Maaasahan (Trustworthy and Reliable)', 'order' => 6],
            ];
            foreach ($questions as $q) {
                $form->questions()->create($q);
            }
        }

        if ($form->questions()->count() === 0) {
            $this->command->warn('No evaluation questions available. Aborting evaluation seeding.');
            return;
        }

        EvaluationResponse::query()->delete();
        Evaluation::query()->delete();

        // Fetch all active employees with profiles and assign a manager when possible
        $employees = User::whereHas('employeeProfile', function($query) {
                $query->where(function($q) {
                    $q->whereNull('status')
                      ->orWhere('status', 'active');
                });
            })
            ->orderBy('id')
            ->get();

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found for performance evaluations.');
            return;
        }

        $managers = User::whereHas('role', fn($q) => $q->where('name', 'Manager'))
            ->with('employeeProfile')
            ->get();

        $positiveStrengthComments = [
            'Great consistency and attention to detail.',
            'Shows strong ownership of deliverables.',
            'Maintains positive collaboration with peers.',
            'Demonstrates excellent customer focus.',
            'Steps up proactively when the team needs help.'
        ];

        $coachingComments = [
            'Schedule a quick coaching talk for this item.',
            'Needs guidance on how to handle this scenario.',
            'Recommend pairing with a senior teammate for next sprint.',
            'Needs a reminder on the agreed quality standards.',
            'Follow up with additional feedback after the next task.'
        ];

        $neutralComments = [
            'Meeting expectations for this item.',
            'Solid contribution—maintain current approach.',
            'On track compared with department benchmarks.',
            'Handled assigned work with minimal oversight.',
        ];

        $overallComments = [
            'Showing steady progress across key behaviours.',
            'Overall contribution remains reliable across the evaluation period.',
            'Recommend continued coaching on priority areas over the next quarter.',
            'Performance trending positively; recognise recent wins during one-on-one.',
            'Keep reinforcing punctuality and cross-team updates.'
        ];

        $highRiskTarget = 2;
        $mediumRiskTarget = 5;

        foreach ($employees as $index => $emp) {
            $riskProfile = 'low';
            if ($index < $highRiskTarget) {
                $riskProfile = 'high';
            } elseif ($index < ($highRiskTarget + $mediumRiskTarget)) {
                $riskProfile = 'medium';
            }

            $profile = $emp->employeeProfile;
            $department = $profile?->department;
            $assignedManager = $managers->firstWhere('employeeProfile.department', $department)
                ?? ($managers->isNotEmpty() ? $managers->random() : $emp);

            $reviewCount = 3;
            $baseline = match ($riskProfile) {
                'high' => rand(55, 65) / 10,    // 5.5 - 6.5
                'medium' => rand(72, 84) / 10,  // 7.2 - 8.4
                default => rand(90, 96) / 10,   // 9.0 - 9.6
            };
            $trend = match ($riskProfile) {
                'high' => 'declining',
                'medium' => Arr::random(['stable', 'declining', 'improving'], 1, false)[0],
                default => Arr::random(['improving', 'stable'], 1, false)[0],
            };

            for ($reviewIndex = 0; $reviewIndex < $reviewCount; $reviewIndex++) {
                $monthsAgo = max(0, ($reviewCount - $reviewIndex - 1) * 2 + rand(0, 1));
                $submittedAt = Carbon::now()
                    ->copy()
                    ->subMonths($monthsAgo)
                    ->subDays(rand(0, 6));

                $progressFactor = match ($trend) {
                    'improving' => $reviewIndex * 0.35,
                    'declining' => -$reviewIndex * 0.35,
                    'stable' => 0,
                    default => 0,
                };

                if ($trend === 'stable') {
                    $progressFactor = (rand(-10, 10) / 100);
                }

                $averageRating = $baseline + $progressFactor + (rand(-15, 15) / 100);

                if ($riskProfile === 'high') {
                    if ($reviewIndex === 0) { // oldest review
                        $averageRating = rand(65, 75) / 10; // 6.5 - 7.5
                    } elseif ($reviewIndex === $reviewCount - 1) { // latest review
                        $averageRating = rand(30, 45) / 10; // 3.0 - 4.5
                    }
                } elseif ($riskProfile === 'medium') {
                    if ($reviewIndex === $reviewCount - 1) {
                        $averageRating = $trend === 'improving'
                            ? rand(78, 87) / 10  // 7.8 - 8.7
                            : rand(60, 74) / 10; // 6.0 - 7.4
                    }
                } else { // low risk
                    if ($reviewIndex === $reviewCount - 1) {
                        $averageRating = rand(95, 99) / 10; // 9.5 - 9.9
                    }
                }

                $averageRating = max(1.5, min(9.8, $averageRating));

                $questionRatings = [];
                $totalScore = 0;
                $questionsCount = $form->questions()->count();

                foreach ($form->questions as $question) {
                    $questionScore = $averageRating + (rand(-18, 18) / 10);
                    $questionScore = max(1, min(10, round($questionScore)));
                    $questionRatings[$question->id] = $questionScore;
                    $totalScore += $questionScore;
                }

                $average = $questionsCount > 0 ? $totalScore / $questionsCount : 0;
                $averageNormalized = round($averageRating * 10, 1); // 0-100 scale
                $passingThreshold = 75;
                $isPassed = $averageNormalized >= $passingThreshold;

                $generalCommentPool = $overallComments;
                if ($trend === 'declining') {
                    $generalCommentPool[] = 'Address recurring performance gaps in the upcoming coaching cycle.';
                    $generalCommentPool[] = 'Performance dipped this period—align on a recovery plan.';
                } elseif ($trend === 'improving') {
                    $generalCommentPool[] = 'Momentum is improving; continue recognition and targeted support.';
                }

                $generalCommentPoolToUse = $generalCommentPool ?: ['Performance feedback recorded for this period.'];

                $evaluation = Evaluation::create([
                    'evaluation_form_id' => $form->id,
                    'employee_id' => $emp->id,
                    'manager_id' => $assignedManager->id,
                    'status' => 'Submitted',
                    'total_score' => $totalScore,
                    'average_score' => $averageNormalized,
                    'percentage_score' => $averageNormalized,
                    'passing_threshold' => $passingThreshold,
                    'is_passed' => $isPassed,
                    'general_comments' => Arr::random($generalCommentPoolToUse),
                    'submitted_at' => $submittedAt,
                    'due_date' => $submittedAt->copy()->addDays(7),
                    'evaluation_period_start' => $submittedAt->copy()->subMonths(3)->startOfMonth()->toDateString(),
                    'evaluation_period_end' => $submittedAt->copy()->endOfMonth()->toDateString(),
                    'next_evaluation_date' => $submittedAt->copy()->addMonths(3),
                ]);

                foreach ($form->questions as $question) {
                    $rating = $questionRatings[$question->id] ?? rand(6, 9);
                    $managerComment = $rating >= 8
                        ? Arr::random($positiveStrengthComments)
                        : ($rating <= 6
                            ? Arr::random($coachingComments)
                            : Arr::random($neutralComments));

                    EvaluationResponse::create([
                        'evaluation_id' => $evaluation->id,
                        'evaluation_question_id' => $question->id,
                        'rating' => $rating,
                        'manager_comment' => $managerComment,
                    ]);
                }
            }
        }
    }
}


