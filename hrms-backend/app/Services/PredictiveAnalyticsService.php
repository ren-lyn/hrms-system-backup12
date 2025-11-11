<?php

namespace App\Services;

use App\Models\EmployeeProfile;
use App\Models\Attendance;
use App\Models\Evaluation;
use App\Models\EmployeeEvaluation;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PredictiveAnalyticsService
{
    /**
     * Calculate turnover risk for all employees
     */
    public function calculateTurnoverRisk($timeframe = '3months', $department = null, $startDate = null, $endDate = null)
    {
        $employees = EmployeeProfile::with(['user'])
            ->where(function($query) {
                $query->whereNull('status')
                      ->orWhere('status', 'active');
            })
            ->when($department && $department !== 'all', function($query) use ($department) {
                $query->where('department', $department);
            })
            ->get();

        $riskData = [];
        $dateRange = $this->getDateRange($timeframe, $startDate, $endDate);

        foreach ($employees as $employee) {
            $riskData[] = $this->calculateEmployeeRisk($employee, $dateRange);
        }

        // Sort by risk score (highest first)
        usort($riskData, function($a, $b) {
            return $b['riskScore'] <=> $a['riskScore'];
        });

        return [
            'employees' => $riskData,
            'dateRange' => $dateRange,
        ];
    }

    /**
     * Calculate risk score for a single employee
     */
    private function calculateEmployeeRisk(EmployeeProfile $employee, array $dateRange)
    {
        // Get attendance metrics
        $attendanceMetrics = $this->getAttendanceMetrics($employee, $dateRange);
        
        // Get evaluation metrics
        $evaluationMetrics = $this->getEvaluationMetrics($employee, $dateRange);
        
        // Calculate risk factors
        $riskFactors = $this->identifyRiskFactors($attendanceMetrics, $evaluationMetrics, $employee);
        
        // Calculate risk score (0-100)
        $riskCalculation = $this->calculateRiskScore($attendanceMetrics, $evaluationMetrics, $riskFactors);
        $riskScore = $riskCalculation['score'];
        
        // Determine risk level
        $riskLevel = $this->getRiskLevel($riskScore);
        
        // Generate recommended actions based on risk factors
        $recommendations = $this->generateRecommendations($attendanceMetrics, $evaluationMetrics, $riskFactors, $riskLevel);
        $riskInsights = $this->buildRiskInsights(
            $attendanceMetrics,
            $evaluationMetrics,
            $riskFactors,
            $riskCalculation,
            $riskLevel,
            $riskScore
        );

        $displayFactors = $riskFactors;
        $performanceComponent = $riskCalculation['components']['performance'] ?? null;
        if ($performanceComponent && ($performanceComponent['raw'] ?? 0) > 0.5) {
            $displayFactors[] = $this->summarizePerformanceRisk($performanceComponent, $evaluationMetrics);
        }

        return [
            'id' => $employee->user_id ?? $employee->id,
            'employeeId' => $employee->employee_id,
            'name' => trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? '')),
            'department' => $employee->department ?? 'N/A',
            'position' => $employee->position ?? 'N/A',
            'hireDate' => $employee->date_hired ? Carbon::parse($employee->date_hired)->format('Y-m-d') : ($employee->hire_date ? Carbon::parse($employee->hire_date)->format('Y-m-d') : null),
            'tenure' => $this->calculateTenure($employee->date_hired ?? $employee->hire_date),
            'riskScore' => round($riskScore),
            'riskLevel' => $riskLevel,
            'attendanceRate' => round($attendanceMetrics['attendanceRate'], 1),
            'performanceScore' => round($evaluationMetrics['averageScore'], 1),
            'lastEvaluation' => $evaluationMetrics['lastEvaluationDate'],
            'keyFactors' => $displayFactors,
            'riskInsights' => $riskInsights,
            'riskBreakdown' => $riskCalculation,
            'recommendations' => $recommendations,
            'attendanceMetrics' => $attendanceMetrics,
            'evaluationMetrics' => $evaluationMetrics,
        ];
    }

    /**
     * Get attendance metrics for an employee
     */
    private function getAttendanceMetrics(EmployeeProfile $employee, array $dateRange)
    {
        $attendances = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$dateRange['start'], $dateRange['end']])
            ->get();

        if ($attendances->isEmpty()) {
            return [
                'totalDays' => 0,
                'presentCount' => 0,
                'absentCount' => 0,
                'lateCount' => 0,
                'attendanceRate' => 100, // Default to 100 if no data
                'lateRate' => 0,
                'absentRate' => 0,
                'lateTrend' => 0,
                'absentTrend' => 0,
            ];
        }

        $totalDays = $attendances->count();
        
        // Present days: Explicitly count all statuses where employee was at work
        // This includes: Present, Late, Overtime, Late (Overtime), Late (Undertime), Undertime, Holiday (Worked)
        $presentStatuses = ['Present', 'Late', 'Overtime', 'Late (Overtime)', 'Late (Undertime)', 'Undertime', 'Holiday (Worked)'];
        $presentCount = $attendances->whereIn('status', $presentStatuses)->count();
        
        $absentCount = $attendances->where('status', 'Absent')->count();
        $onLeaveCount = $attendances->where('status', 'On Leave')->count();
        $holidayNoWorkCount = $attendances->where('status', 'Holiday (No Work)')->count();
        
        // Late count: Any status that includes "Late"
        $lateCount = $attendances->whereIn('status', ['Late', 'Late (Overtime)', 'Late (Undertime)'])->count();
        
        // Overtime count
        $overtimeCount = $attendances->whereIn('status', ['Overtime', 'Late (Overtime)'])->count();
        
        // Undertime count
        $undertimeCount = $attendances->whereIn('status', ['Undertime', 'Late (Undertime)'])->count();
        
        // Pure Present count (on-time, no issues)
        $purePresentCount = $attendances->where('status', 'Present')->count();

        // Calculate attendance rate: present days / (total days - on leave days)
        // On Leave is excused, so it shouldn't count against attendance rate
        $workingDays = $totalDays - $onLeaveCount;
        $attendanceRate = $workingDays > 0 ? ($presentCount / $workingDays) * 100 : 100;
        
        // Late and absent rates should be calculated based on working days too
        $lateRate = $workingDays > 0 ? ($lateCount / $workingDays) * 100 : 0;
        $absentRate = $workingDays > 0 ? ($absentCount / $workingDays) * 100 : 0;

        // Calculate trends (compare first half vs second half of period)
        $midPoint = Carbon::parse($dateRange['start'])->addDays(
            Carbon::parse($dateRange['start'])->diffInDays(Carbon::parse($dateRange['end'])) / 2
        );
        
        $firstHalf = $attendances->filter(function($att) use ($dateRange, $midPoint) {
            return $att->date >= $dateRange['start'] && $att->date < $midPoint;
        });
        
        $secondHalf = $attendances->filter(function($att) use ($midPoint, $dateRange) {
            return $att->date >= $midPoint && $att->date <= $dateRange['end'];
        });

        $firstHalfOnLeaveCount = $firstHalf->where('status', 'On Leave')->count();
        $secondHalfOnLeaveCount = $secondHalf->where('status', 'On Leave')->count();

        $firstHalfWorkingDays = $firstHalf->count() - $firstHalfOnLeaveCount;
        $secondHalfWorkingDays = $secondHalf->count() - $secondHalfOnLeaveCount;

        $firstHalfLateCount = $firstHalf->whereIn('status', ['Late', 'Late (Overtime)', 'Late (Undertime)'])->count();
        $secondHalfLateCount = $secondHalf->whereIn('status', ['Late', 'Late (Overtime)', 'Late (Undertime)'])->count();

        $firstHalfAbsentCount = $firstHalf->where('status', 'Absent')->count();
        $secondHalfAbsentCount = $secondHalf->where('status', 'Absent')->count();

        $firstHalfLateRate = $firstHalfWorkingDays > 0
            ? ($firstHalfLateCount / $firstHalfWorkingDays) * 100
            : 0;

        $secondHalfLateRate = $secondHalfWorkingDays > 0
            ? ($secondHalfLateCount / $secondHalfWorkingDays) * 100
            : 0;

        $firstHalfAbsentRate = $firstHalfWorkingDays > 0
            ? ($firstHalfAbsentCount / $firstHalfWorkingDays) * 100
            : 0;

        $secondHalfAbsentRate = $secondHalfWorkingDays > 0
            ? ($secondHalfAbsentCount / $secondHalfWorkingDays) * 100
            : 0;

        $lateTrend = $firstHalfLateRate > 0
            ? (($secondHalfLateRate - $firstHalfLateRate) / $firstHalfLateRate) * 100
            : ($secondHalfLateRate > 0 ? 100 : 0);

        $absentTrend = $firstHalfAbsentRate > 0
            ? (($secondHalfAbsentRate - $firstHalfAbsentRate) / $firstHalfAbsentRate) * 100
            : ($secondHalfAbsentRate > 0 ? 100 : 0);

        return [
            'totalDays' => $totalDays,
            'presentCount' => $presentCount,
            'purePresentCount' => $purePresentCount,
            'absentCount' => $absentCount,
            'onLeaveCount' => $onLeaveCount,
            'holidayNoWorkCount' => $holidayNoWorkCount,
            'lateCount' => $lateCount,
            'overtimeCount' => $overtimeCount,
            'undertimeCount' => $undertimeCount,
            'workingDays' => $workingDays,
            'attendanceRate' => $attendanceRate,
            'lateRate' => $lateRate,
            'absentRate' => $absentRate,
            'firstHalfWorkingDays' => $firstHalfWorkingDays,
            'secondHalfWorkingDays' => $secondHalfWorkingDays,
            'firstHalfLateCount' => $firstHalfLateCount,
            'secondHalfLateCount' => $secondHalfLateCount,
            'firstHalfAbsentCount' => $firstHalfAbsentCount,
            'secondHalfAbsentCount' => $secondHalfAbsentCount,
            'firstHalfLateRate' => round($firstHalfLateRate, 1),
            'secondHalfLateRate' => round($secondHalfLateRate, 1),
            'firstHalfAbsentRate' => round($firstHalfAbsentRate, 1),
            'secondHalfAbsentRate' => round($secondHalfAbsentRate, 1),
            'lateTrend' => round($lateTrend, 1),
            'absentTrend' => round($absentTrend, 1),
        ];
    }

    /**
     * Get evaluation metrics for an employee
     */
    private function getEvaluationMetrics(EmployeeProfile $employee, array $dateRange)
    {
        // Try to get from Evaluation model first (newer system)
        $evaluations = Evaluation::with(['responses.question'])
            ->where('employee_id', $employee->user_id ?? $employee->id)
            ->where('status', 'Submitted')
            ->whereBetween('submitted_at', [$dateRange['start'], $dateRange['end']])
            ->orderBy('submitted_at', 'desc')
            ->get();

        // If no evaluations, try EmployeeEvaluation model (older system)
        if ($evaluations->isEmpty()) {
            $evaluations = EmployeeEvaluation::where('user_id', $employee->user_id ?? $employee->id)
                ->whereBetween('evaluation_date', [$dateRange['start'], $dateRange['end']])
                ->orderBy('evaluation_date', 'desc')
                ->get();
        }

        if ($evaluations->isEmpty()) {
            // Get most recent evaluation regardless of date range
            $recentEvaluation = Evaluation::where('employee_id', $employee->user_id ?? $employee->id)
                ->where('status', 'Submitted')
                ->orderBy('submitted_at', 'desc')
                ->first();

            if (!$recentEvaluation) {
                $recentEvaluation = EmployeeEvaluation::where('user_id', $employee->user_id ?? $employee->id)
                    ->orderBy('evaluation_date', 'desc')
                    ->first();
            }

            if ($recentEvaluation) {
                $score = $recentEvaluation->average_score ?? $recentEvaluation->percentage_score 
                    ?? ($recentEvaluation->total_score ?? 0);
                $date = $recentEvaluation->submitted_at ?? $recentEvaluation->evaluation_date;
                
                return [
                    'averageScore' => $score,
                    'averageRating' => round($score / 10, 1),
                    'lastEvaluationDate' => $date ? Carbon::parse($date)->format('Y-m-d') : null,
                    'evaluationCount' => 0,
                    'performanceTrend' => 0,
                    'scoreHistory' => [],
                    'latestSummary' => $date ? [
                        'averageScore' => round($score, 1),
                        'percentageScore' => null,
                        'isPassed' => null,
                        'passingThreshold' => null,
                        'totalScore' => null,
                        'submittedAt' => Carbon::parse($date)->format('Y-m-d'),
                        'comments' => null,
                        'managerId' => null,
                    ] : null,
                    'categoryBreakdown' => [],
                    'strengthCategories' => [],
                    'focusCategories' => [],
                    'strengthHighlights' => [],
                    'attentionHighlights' => [],
                ];
            }

            return [
                'averageScore' => 75, // Default score if no evaluations
                'averageRating' => 7.5,
                'lastEvaluationDate' => null,
                'evaluationCount' => 0,
                'performanceTrend' => 0,
                'scoreHistory' => [],
                'latestSummary' => null,
                'categoryBreakdown' => [],
                'strengthCategories' => [],
                'focusCategories' => [],
                'strengthHighlights' => [],
                'attentionHighlights' => [],
            ];
        }

        $evaluationDetails = [];

        foreach ($evaluations as $eval) {
            $date = $eval->submitted_at ?? $eval->evaluation_date;
            $dateCarbon = $date ? Carbon::parse($date) : null;

            $normalizedScore = $eval->percentage_score ?? $eval->average_score ?? 0;
            $averageRating = $normalizedScore / 10;

            $passingThreshold = $eval->passing_threshold ?? 75;
            $isPassed = $eval->is_passed;
            if ($isPassed === null) {
                $isPassed = $normalizedScore >= $passingThreshold;
            }

            $responses = $eval->responses ?? collect();
            $categoryAverages = [];
            $strengthCategoriesForEval = [];
            $focusCategoriesForEval = [];
            $strengthItemsForEval = [];
            $attentionItemsForEval = [];

            if ($responses->isNotEmpty()) {
                $categoryGroups = $responses->groupBy(function($response) {
                    return $response->question->category ?? 'General';
                });

                foreach ($categoryGroups as $category => $group) {
                    $avgRating = $group->avg('rating');
                    $categoryAverages[$category] = round($avgRating, 2);
                }

                $categoryCollection = collect($categoryAverages);
                $strengthCategoriesForEval = $categoryCollection
                    ->filter(fn($avg) => $avg >= 8)
                    ->keys()
                    ->values()
                    ->all();
                $focusCategoriesForEval = $categoryCollection
                    ->filter(fn($avg) => $avg < 7)
                    ->keys()
                    ->values()
                    ->all();

                $strengthItemsForEval = $responses
                    ->filter(fn($resp) => $resp->classification === 'Strength')
                    ->sortByDesc('rating')
                    ->take(3)
                    ->map(function($resp) {
                        return [
                            'question' => $resp->question->question_text ?? 'Evaluation item',
                            'rating' => $resp->rating,
                        ];
                    })->values()->all();

                $attentionItemsForEval = $responses
                    ->filter(fn($resp) => $resp->classification === 'Weakness')
                    ->sortBy('rating')
                    ->take(3)
                    ->map(function($resp) {
                        return [
                            'question' => $resp->question->question_text ?? 'Evaluation item',
                            'rating' => $resp->rating,
                        ];
                    })->values()->all();
            }

            $evaluationDetails[] = [
                'evaluation' => $eval,
                'date' => $dateCarbon,
                'averageScore' => round($normalizedScore, 1),
                'averageRating' => round($averageRating, 2),
                'percentage' => round($normalizedScore, 1),
                'isPassed' => $isPassed,
                'categoryAverages' => $categoryAverages,
                'strengthCategories' => $strengthCategoriesForEval,
                'focusCategories' => $focusCategoriesForEval,
                'strengthHighlights' => $strengthItemsForEval,
                'attentionHighlights' => $attentionItemsForEval,
            ];
        }

        $detailCollection = collect($evaluationDetails);
        $averageScore = $detailCollection->avg('averageScore') ?? 75;

        $halfPoint = $detailCollection->count() / 2;
        $firstHalfScores = $detailCollection->take(ceil($halfPoint))->avg('averageScore');
        $secondHalfScores = $detailCollection->skip(floor($halfPoint))->avg('averageScore');
        $performanceTrend = $firstHalfScores > 0
            ? (($secondHalfScores - $firstHalfScores) / $firstHalfScores) * 100
            : 0;

        $currentDetails = $evaluationDetails[0] ?? null;
        $previousDetails = $evaluationDetails[1] ?? null;
        $oldestDetails = $evaluationDetails[count($evaluationDetails) - 1] ?? null;

        $lastEvaluationDate = $currentDetails && $currentDetails['date']
            ? $currentDetails['date']->format('Y-m-d')
            : null;

        $scoreHistory = $detailCollection->map(function($detail) {
            return [
                'date' => $detail['date'] ? $detail['date']->format('Y-m-d') : null,
                'score' => round($detail['averageRating'], 1),
                'percentage' => round($detail['averageScore'], 1),
                'isPassed' => (bool) $detail['isPassed'],
            ];
        })->filter(fn($entry) => !empty($entry['date']))->values()->all();

        $categoryBreakdown = [];
        $strengthCategories = [];
        $focusCategories = [];
        $strengthHighlights = [];
        $attentionHighlights = [];
        $latestSummary = null;

        if ($currentDetails) {
            foreach ($currentDetails['categoryAverages'] as $category => $avgRating) {
                $categoryBreakdown[] = [
                    'category' => $category,
                    'averageRating' => round($avgRating, 1),
                    'percentage' => round(($avgRating / 10) * 100, 1),
                    'questionCount' => null,
                ];
            }

            $strengthCategories = $currentDetails['strengthCategories'];
            $focusCategories = $currentDetails['focusCategories'];
            $strengthHighlights = $currentDetails['strengthHighlights'];
            $attentionHighlights = $currentDetails['attentionHighlights'];

            $currentEvaluation = $currentDetails['evaluation'];
            $currentDate = $currentDetails['date'];
            $latestSummary = [
                'averageScore' => round($currentDetails['averageScore'], 1),
                'averageRating' => round($currentDetails['averageRating'], 1),
                'percentageScore' => $currentDetails['percentage'],
                'isPassed' => (bool) $currentDetails['isPassed'],
                'passingThreshold' => $currentEvaluation->passing_threshold ?? null,
                'totalScore' => $currentEvaluation->total_score ?? null,
                'submittedAt' => $currentDate ? $currentDate->format('Y-m-d') : null,
                'comments' => $currentEvaluation->general_comments,
                'managerId' => $currentEvaluation->manager_id,
            ];
        }

        $categoryComparisons = [];
        $improvedCategories = [];
        $declinedCategories = [];

        if ($currentDetails && $previousDetails) {
            $allCategories = collect(array_keys($currentDetails['categoryAverages']))
                ->merge(array_keys($previousDetails['categoryAverages']))
                ->unique()
                ->values();

            foreach ($allCategories as $category) {
                $currentValue = $currentDetails['categoryAverages'][$category] ?? null;
                $previousValue = $previousDetails['categoryAverages'][$category] ?? null;
                $change = null;

                if ($currentValue !== null && $previousValue !== null) {
                    $change = $currentValue - $previousValue;

                    if ($change >= 0.5) {
                        $improvedCategories[] = [
                            'category' => $category,
                            'change' => round($change, 1),
                        ];
                    } elseif ($change <= -0.5) {
                        $declinedCategories[] = [
                            'category' => $category,
                            'change' => round($change, 1),
                        ];
                    }
                }

                $categoryComparisons[] = [
                    'category' => $category,
                    'currentRating' => $currentValue !== null ? round($currentValue, 1) : null,
                    'previousRating' => $previousValue !== null ? round($previousValue, 1) : null,
                    'change' => $change !== null ? round($change, 1) : null,
                ];
            }

            $improvedCategories = collect($improvedCategories)
                ->sortByDesc('change')
                ->values()
                ->all();

            $declinedCategories = collect($declinedCategories)
                ->sortBy('change')
                ->values()
                ->all();
        }

        $performanceInsights = [];
        $addInsight = function (string $tone, string $title, string $description) use (&$performanceInsights) {
            $performanceInsights[] = [
                'tone' => $tone,
                'title' => $title,
                'description' => $description,
            ];
        };

        if ($currentDetails && $previousDetails) {
            $previousAverage = $previousDetails['averageScore'] / 10;
            $currentAverage = $currentDetails['averageScore'] / 10;
            $avgChange = $currentAverage - $previousAverage;

            if ($avgChange >= 0.1) {
                $addInsight(
                    'positive',
                    'Average rating improved',
                    sprintf(
                        'Average rating is now %.1f, up by %.1f points from the previous review.',
                        $currentAverage,
                        round($avgChange, 1)
                    )
                );
            } elseif ($avgChange <= -0.1) {
                $addInsight(
                    'negative',
                    'Average rating declined',
                    sprintf(
                        'Average rating fell to %.1f, down by %.1f points since the previous review.',
                        $currentAverage,
                        round(abs($avgChange), 1)
                    )
                );
            }
        } elseif ($currentDetails) {
            $addInsight(
                'warning',
                'Only one evaluation on file',
                'There is only one performance evaluation recorded, so no trend comparison is available.'
            );
        }

        if ($currentDetails && $currentDetails['isPassed'] === false && $latestSummary) {
            $thresholdText = $latestSummary['passingThreshold'] !== null
                ? sprintf('the %d%% threshold', (int) $latestSummary['passingThreshold'])
                : 'the expected target';

            $scoreText = $latestSummary['percentageScore'] !== null
                ? sprintf('%.1f%%', $latestSummary['percentageScore'])
                : sprintf('%.1f / 10', $latestSummary['averageScore']);

            $addInsight(
                'negative',
                'Latest evaluation below target',
                sprintf('The latest review scored %s, which is below %s.', $scoreText, $thresholdText)
            );
        }

        if (!empty($improvedCategories)) {
            $topImprovements = collect($improvedCategories)
                ->take(3)
                ->map(fn($item) => sprintf('%s (+%.1f)', $item['category'], $item['change']))
                ->implode(', ');

            $addInsight(
                'positive',
                'Categories showing progress',
                sprintf('Recent reviews show improvements in %s.', $topImprovements)
            );
        }

        if (!empty($declinedCategories)) {
            $topDeclines = collect($declinedCategories)
                ->take(3)
                ->map(fn($item) => sprintf('%s (%.1f)', $item['category'], $item['change']))
                ->implode(', ');

            $addInsight(
                'warning',
                'Categories losing ground',
                sprintf('Scores dropped in %s. Plan coaching before the next cycle.', $topDeclines)
            );
        }

        if ($currentDetails && $oldestDetails && $currentDetails !== $oldestDetails) {
            $overallChange = ($currentDetails['averageScore'] - $oldestDetails['averageScore']) / 10;
            if (abs($overallChange) >= 0.1) {
                $direction = $overallChange >= 0 ? 'improved' : 'declined';
                $addInsight(
                    $overallChange >= 0 ? 'positive' : 'negative',
                    'Year-to-date comparison',
                    sprintf(
                        'Average rating %s by %.1f points (from %.1f to %.1f) compared with the earliest review on record.',
                        $direction,
                        round(abs($overallChange), 1),
                        $oldestDetails['averageScore'] / 10,
                        $currentDetails['averageScore'] / 10
                    )
                );
            }
        }

        if (empty($performanceInsights) && $currentDetails) {
            $addInsight(
                'success',
                'Performance stable',
                sprintf('Average rating remains at %.1f with no major swings between reviews.', $currentDetails['averageScore'])
            );
        }

        return [
            'averageScore' => $averageScore,
            'averageRating' => round($averageScore / 10, 1),
            'lastEvaluationDate' => $lastEvaluationDate,
            'evaluationCount' => $detailCollection->count(),
            'performanceTrend' => round($performanceTrend, 1),
            'scoreHistory' => $scoreHistory,
            'latestSummary' => $latestSummary,
            'categoryBreakdown' => $categoryBreakdown,
            'strengthCategories' => $strengthCategories,
            'focusCategories' => $focusCategories,
            'strengthHighlights' => $strengthHighlights,
            'attentionHighlights' => $attentionHighlights,
            'categoryComparisons' => $categoryComparisons,
            'improvedCategories' => $improvedCategories,
            'declinedCategories' => $declinedCategories,
            'performanceInsights' => $performanceInsights,
        ];
    }

    /**
     * Identify risk factors
     */
    private function identifyRiskFactors(array $attendanceMetrics, array $evaluationMetrics, EmployeeProfile $employee)
    {
        $factors = [];

        // Attendance risk factors
        if ($attendanceMetrics['attendanceRate'] < 85) {
            $factors[] = 'Low attendance rate (' . round($attendanceMetrics['attendanceRate'], 1) . '%)';
        }

        if ($attendanceMetrics['lateTrend'] > 30) {
            $increase = round($attendanceMetrics['lateTrend']);
            $factors[] = "Late arrivals increased by {$increase}%";
        }

        if ($attendanceMetrics['absentTrend'] > 30) {
            $increase = round($attendanceMetrics['absentTrend']);
            $factors[] = "Absences increased by {$increase}%";
        }

        if ($attendanceMetrics['lateRate'] > 20) {
            $factors[] = 'High frequency of late arrivals';
        }

        // Performance risk factors
        if ($evaluationMetrics['averageScore'] < 60) {
            $factors[] = 'Low performance score';
        } elseif ($evaluationMetrics['averageScore'] < 80) {
            $factors[] = 'Performance below 80% target (' . round($evaluationMetrics['averageScore'], 1) . '%)';
        }

        if ($evaluationMetrics['performanceTrend'] < -10) {
            $decrease = abs(round($evaluationMetrics['performanceTrend']));
            $factors[] = "Declining performance trend ({$decrease}% decrease)";
        } elseif ($evaluationMetrics['performanceTrend'] < 0) {
            $decrease = abs(round($evaluationMetrics['performanceTrend']));
            if ($decrease >= 1) {
                $factors[] = "Performance trending down ({$decrease}% drop)";
            }
        }

        if (!$evaluationMetrics['lastEvaluationDate']) {
            $factors[] = 'No recent evaluation';
        } else {
            $daysSinceEvaluation = Carbon::parse($evaluationMetrics['lastEvaluationDate'])->diffInDays(Carbon::now());
            if ($daysSinceEvaluation > 180) {
                $factors[] = 'No evaluation in the last 6 months';
            }
        }

        return $factors;
    }

    private function summarizePerformanceRisk(array $performanceComponent, array $evaluationMetrics): string
    {
        $raw = $performanceComponent['raw'] ?? 0;
        $weighted = $performanceComponent['weighted'] ?? 0;
        $averageScore = $evaluationMetrics['averageScore'] ?? null;
        $trend = $evaluationMetrics['performanceTrend'] ?? null;

        if ($raw <= 0.5 && $weighted <= 0.2) {
            return 'Performance adds minimal risk (penalty negligible)';
        }

        $severity = 'low';
        if ($raw >= 40) {
            $severity = 'high';
        } elseif ($raw >= 20) {
            $severity = 'moderate';
        }

        $parts = [];
        $parts[] = sprintf('Performance %s risk', $severity);

        if ($averageScore !== null) {
            $parts[] = sprintf('average %.1f%%', round($averageScore, 1));
        }

        if ($trend !== null && $trend < 0) {
            $parts[] = sprintf('%s%% decline', round(abs($trend), 1));
        }

        $message = implode(' • ', $parts);
        $message .= sprintf(' (%.1f raw pts)', round($raw, 1));

        return $message;
    }

    /**
     * Calculate overall risk score (0-100)
     */
    private function calculateRiskScore(array $attendanceMetrics, array $evaluationMetrics, array $riskFactors)
    {
        $attendanceWeight = 0.4;
        $performanceWeight = 0.4;
        $factorWeight = 0.2;

        // Attendance penalties
        $attendanceItems = [];
        if (isset($attendanceMetrics['attendanceRate'])) {
            $gap = max(0, 100 - $attendanceMetrics['attendanceRate']);
            $penalty = $gap * 0.3;
            $attendanceItems[] = [
                'label' => 'Attendance rate gap',
                'detail' => sprintf('(100 − %.1f) × 0.3', $attendanceMetrics['attendanceRate']),
                'value' => $penalty,
            ];
        }

        if (isset($attendanceMetrics['lateRate'])) {
            $penalty = min($attendanceMetrics['lateRate'] * 2, 30);
            $attendanceItems[] = [
                'label' => 'Late arrival frequency',
                'detail' => sprintf('min(%.1f × 2, 30)', $attendanceMetrics['lateRate']),
                'value' => $penalty,
            ];
        }

        if (isset($attendanceMetrics['absentRate'])) {
            $penalty = min($attendanceMetrics['absentRate'] * 3, 30);
            $attendanceItems[] = [
                'label' => 'Absence frequency',
                'detail' => sprintf('min(%.1f × 3, 30)', $attendanceMetrics['absentRate']),
                'value' => $penalty,
            ];
        }

        if (isset($attendanceMetrics['lateTrend']) && $attendanceMetrics['lateTrend'] > 0) {
            $penalty = min($attendanceMetrics['lateTrend'] * 0.5, 10);
            $attendanceItems[] = [
                'label' => 'Late arrival trend',
                'detail' => sprintf('max(%.1f, 0) × 0.5 (capped 10)', $attendanceMetrics['lateTrend']),
                'value' => $penalty,
            ];
        }

        if (isset($attendanceMetrics['absentTrend']) && $attendanceMetrics['absentTrend'] > 0) {
            $penalty = min($attendanceMetrics['absentTrend'] * 0.5, 10);
            $attendanceItems[] = [
                'label' => 'Absence trend',
                'detail' => sprintf('max(%.1f, 0) × 0.5 (capped 10)', $attendanceMetrics['absentTrend']),
                'value' => $penalty,
            ];
        }

        $attendanceTotalRaw = array_sum(array_column($attendanceItems, 'value'));
        $attendanceCapFactor = $attendanceTotalRaw > 0 ? min(1, 100 / $attendanceTotalRaw) : 0;
        $attendanceItems = array_map(function ($item) use ($attendanceCapFactor, $attendanceWeight) {
            $raw = $item['value'] * $attendanceCapFactor;
            return [
                'label' => $item['label'],
                'detail' => $item['detail'],
                'raw' => round($raw, 2),
                'weighted' => round($raw * $attendanceWeight, 2),
            ];
        }, $attendanceItems);
        $attendanceRaw = round(min($attendanceTotalRaw, 100), 2);
        $attendanceWeighted = round($attendanceRaw * $attendanceWeight, 2);

        // Performance penalties
        $performanceItems = [];
        $averageScore = $evaluationMetrics['averageScore'] ?? 75;
        $performanceItems[] = [
            'label' => 'Performance score gap',
            'detail' => sprintf('max(100 − %.1f, 0)', $averageScore),
            'value' => max(0, 100 - $averageScore),
        ];

        if (isset($evaluationMetrics['performanceTrend']) && $evaluationMetrics['performanceTrend'] < 0) {
            $penalty = min(abs($evaluationMetrics['performanceTrend']) * 2, 20);
            $performanceItems[] = [
                'label' => 'Performance trend decline',
                'detail' => sprintf('max(-%.1f, 0) × 2 (capped 20)', $evaluationMetrics['performanceTrend']),
                'value' => $penalty,
            ];
        }

        if (!$evaluationMetrics['lastEvaluationDate']) {
            $performanceItems[] = [
                'label' => 'No recent evaluation',
                'detail' => 'No submitted evaluation on record (penalty 15)',
                'value' => 15,
            ];
        } else {
            $daysSince = Carbon::parse($evaluationMetrics['lastEvaluationDate'])->diffInDays(Carbon::now());
            if ($daysSince > 180) {
                $performanceItems[] = [
                    'label' => 'Evaluation is outdated',
                    'detail' => sprintf('%d days since last evaluation (> 180) → +10', $daysSince),
                    'value' => 10,
                ];
            }
        }

        $performanceTotalRaw = array_sum(array_column($performanceItems, 'value'));
        $performanceCapFactor = $performanceTotalRaw > 0 ? min(1, 100 / $performanceTotalRaw) : 0;
        $performanceItems = array_map(function ($item) use ($performanceCapFactor, $performanceWeight) {
            $raw = $item['value'] * $performanceCapFactor;
            return [
                'label' => $item['label'],
                'detail' => $item['detail'],
                'raw' => round($raw, 2),
                'weighted' => round($raw * $performanceWeight, 2),
            ];
        }, $performanceItems);
        $performanceRaw = round(min($performanceTotalRaw, 100), 2);
        $performanceWeighted = round($performanceRaw * $performanceWeight, 2);

        // Risk factor penalties
        $factorCount = count($riskFactors);
        $factorRaw = round(min($factorCount * 5, 100), 2);
        $factorWeighted = round($factorRaw * $factorWeight, 2);
        $factorItems = [[
            'label' => 'Risk flags',
            'detail' => sprintf('%d factor(s) × 5 (capped 100)', $factorCount),
            'raw' => $factorRaw,
            'weighted' => $factorWeighted,
        ]];

        $score = round(min($attendanceWeighted + $performanceWeighted + $factorWeighted, 100), 2);

        return [
            'score' => $score,
            'components' => [
                'attendance' => [
                    'label' => 'Attendance',
                    'weight' => $attendanceWeight,
                    'raw' => $attendanceRaw,
                    'weighted' => $attendanceWeighted,
                    'items' => $attendanceItems,
                ],
                'performance' => [
                    'label' => 'Performance',
                    'weight' => $performanceWeight,
                    'raw' => $performanceRaw,
                    'weighted' => $performanceWeighted,
                    'items' => $performanceItems,
                ],
                'factors' => [
                    'label' => 'Risk factors',
                    'weight' => $factorWeight,
                    'raw' => $factorRaw,
                    'weighted' => $factorWeighted,
                    'items' => $factorItems,
                ],
            ],
        ];
    }

    /**
     * Get risk level based on score
     */
    private function getRiskLevel($score)
    {
        if ($score >= 70) {
            return 'high';
        } elseif ($score >= 40) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Calculate tenure in months
     */
    private function calculateTenure($hireDate)
    {
        if (!$hireDate) {
            return 0;
        }

        try {
            return Carbon::parse($hireDate)->diffInMonths(Carbon::now());
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Generate recommended actions based on risk factors
     */
    private function generateRecommendations(array $attendanceMetrics, array $evaluationMetrics, array $riskFactors, string $riskLevel)
    {
        $recommendations = [];

        // Attendance-based recommendations
        if ($attendanceMetrics['attendanceRate'] < 85) {
            $recommendations[] = [
                'category' => 'Attendance',
                'priority' => 'high',
                'action' => 'Schedule one-on-one meeting to address attendance concerns',
                'description' => 'Low attendance rate indicates potential engagement or personal issues that need immediate attention.'
            ];
        }

        if ($attendanceMetrics['lateTrend'] > 30) {
            $recommendations[] = [
                'category' => 'Attendance',
                'priority' => 'high',
                'action' => 'Review work schedule and discuss punctuality expectations',
                'description' => 'Increasing late arrivals suggest declining commitment or external factors affecting work-life balance.'
            ];
        }

        if ($attendanceMetrics['absentTrend'] > 30) {
            $recommendations[] = [
                'category' => 'Attendance',
                'priority' => 'high',
                'action' => 'Investigate root causes of increased absences (health, family, burnout)',
                'description' => 'Rising absences may indicate health issues, family problems, or job dissatisfaction.'
            ];
        }

        // Performance-based recommendations
        if ($evaluationMetrics['averageScore'] < 60) {
            $recommendations[] = [
                'category' => 'Performance',
                'priority' => 'high',
                'action' => 'Create performance improvement plan with clear goals and timelines',
                'description' => 'Low performance scores require structured intervention to prevent further decline.'
            ];
        }

        if ($evaluationMetrics['performanceTrend'] < -10) {
            $recommendations[] = [
                'category' => 'Performance',
                'priority' => 'medium',
                'action' => 'Provide additional training and support resources',
                'description' => 'Declining performance may indicate skill gaps or lack of resources/support.'
            ];
        }

        if (!$evaluationMetrics['lastEvaluationDate'] || 
            (Carbon::parse($evaluationMetrics['lastEvaluationDate'])->diffInDays(Carbon::now()) > 180)) {
            $recommendations[] = [
                'category' => 'Performance',
                'priority' => 'medium',
                'action' => 'Schedule immediate performance evaluation',
                'description' => 'Lack of recent evaluation prevents proper feedback and goal setting.'
            ];
        }

        // General recommendations based on risk level
        if ($riskLevel === 'high') {
            $recommendations[] = [
                'category' => 'Retention',
                'priority' => 'high',
                'action' => 'Schedule exit interview preparation and retention discussion',
                'description' => 'High risk employees need immediate intervention to prevent turnover.'
            ];

            $recommendations[] = [
                'category' => 'Retention',
                'priority' => 'high',
                'action' => 'Consider career development opportunities or role adjustments',
                'description' => 'Providing growth opportunities can improve engagement and reduce turnover risk.'
            ];
        } elseif ($riskLevel === 'medium') {
            $recommendations[] = [
                'category' => 'Retention',
                'priority' => 'medium',
                'action' => 'Increase check-ins and provide recognition for improvements',
                'description' => 'Regular feedback and recognition can help prevent further decline.'
            ];
        }

        // If multiple risk factors exist
        if (count($riskFactors) >= 3) {
            $recommendations[] = [
                'category' => 'Retention',
                'priority' => 'high',
                'action' => 'Assign mentor or coach for personalized support',
                'description' => 'Multiple risk factors suggest comprehensive support is needed.'
            ];
        }

        return $recommendations;
    }

    /**
     * Build richer risk insights for the UI
     */
    private function buildRiskInsights(
        array $attendanceMetrics,
        array $evaluationMetrics,
        array $riskFactors,
        array $riskBreakdown,
        string $riskLevel,
        float $riskScore
    ): array
    {
        $insights = [];

        $add = function (string $tone, string $title, string $description) use (&$insights) {
            $insights[] = [
                'tone' => $tone,
                'title' => $title,
                'description' => $description,
            ];
        };

        $severityLabel = function (float $value): string {
            if ($value >= 66) {
                return 'high';
            }
            if ($value >= 33) {
                return 'medium';
            }
            return 'low';
        };

        $components = $riskBreakdown['components'] ?? [];
        $attendanceComponent = $components['attendance'] ?? ['raw' => 0, 'weighted' => 0, 'weight' => 0];
        $performanceComponent = $components['performance'] ?? ['raw' => 0, 'weighted' => 0, 'weight' => 0];
        $factorComponent = $components['factors'] ?? ['raw' => 0, 'weighted' => 0, 'weight' => 0];

        $attendanceRaw = $attendanceComponent['raw'] ?? 0;
        $attendanceWeighted = $attendanceComponent['weighted'] ?? 0;
        $performanceRaw = $performanceComponent['raw'] ?? 0;
        $performanceWeighted = $performanceComponent['weighted'] ?? 0;
        $factorRaw = $factorComponent['raw'] ?? 0;
        $factorWeighted = $factorComponent['weighted'] ?? 0;

        $summaryTone = match ($riskLevel) {
            'high' => 'negative',
            'medium' => 'warning',
            default => 'positive',
        };

        $add(
            $summaryTone,
            'Risk score breakdown',
            sprintf(
                'Overall risk sits at %.1f%% (%s). Attendance is %s (raw %.1f/100, contributes %.1f pts), performance is %s (raw %.1f/100, contributes %.1f pts), and cumulative risk factors are %s (raw %.1f/100, contributes %.1f pts).',
                $riskScore,
                $riskLevel,
                $severityLabel($attendanceRaw),
                $attendanceRaw,
                $attendanceWeighted,
                $severityLabel($performanceRaw),
                $performanceRaw,
                $performanceWeighted,
                $severityLabel($factorRaw),
                $factorRaw,
                $factorWeighted
            )
        );

        $attendanceRate = $attendanceMetrics['attendanceRate'] ?? null;
        if ($attendanceRate !== null) {
            if ($attendanceRate < 85) {
                $add(
                    'negative',
                    'Attendance reliability is a risk',
                    sprintf('Attendance rate is %.1f%%, which is below the 85%% retention threshold. Escalate a retention conversation.', $attendanceRate)
                );
            } elseif ($attendanceRate < 92) {
                $add(
                    'warning',
                    'Attendance slipping below target',
                    sprintf('Attendance rate is %.1f%%. Track schedules closely to prevent further decline.', $attendanceRate)
                );
            } else {
                $add(
                    'positive',
                    'Attendance remains dependable',
                    sprintf('Attendance rate sits at %.1f%%. Keep reinforcing the same habits.', $attendanceRate)
                );
            }
        }

        $lateRate = $attendanceMetrics['lateRate'] ?? null;
        if ($lateRate !== null) {
            if ($lateRate > 25) {
                $add(
                    'negative',
                    'Late arrivals are driving risk',
                    sprintf('Late rate reached %.1f%%—more than one in four shifts starts late. Agree on punctuality actions immediately.', $lateRate)
                );
            } elseif ($lateRate > 12) {
                $add(
                    'warning',
                    'Late arrivals need coaching',
                    sprintf('Late rate is %.1f%%, above the 12%% comfort zone. Revisit time-in expectations with the employee.', $lateRate)
                );
            }
        }

        $absentRate = $attendanceMetrics['absentRate'] ?? null;
        if ($absentRate !== null) {
            if ($absentRate > 12) {
                $add(
                    'negative',
                    'Absence level is critical',
                    sprintf('Absence rate sits at %.1f%%. Investigate availability barriers and arrange support.', $absentRate)
                );
            } elseif ($absentRate > 6) {
                $add(
                    'warning',
                    'Absences trending higher',
                    sprintf('Absence rate is %.1f%%. Schedule check-ins before it reaches high-risk range.', $absentRate)
                );
            }
        }

        $lateTrend = $attendanceMetrics['lateTrend'] ?? null;
        if ($lateTrend !== null) {
            if ($lateTrend > 20) {
                $add(
                    'warning',
                    'Late arrivals trending upward',
                    sprintf('Late arrivals grew by %.1f%% versus the previous period. Act before the pattern settles in.', $lateTrend)
                );
            } elseif ($lateTrend < -10) {
                $add(
                    'positive',
                    'Late arrivals trending down',
                    sprintf('Late arrivals dropped by %.1f%% versus the previous period. Keep reinforcing this improvement.', abs($lateTrend))
                );
            }
        }

        $absentTrend = $attendanceMetrics['absentTrend'] ?? null;
        if ($absentTrend !== null) {
            if ($absentTrend > 20) {
                $add(
                    'warning',
                    'Absences increasing',
                    sprintf('Absences rose by %.1f%% compared with the previous period. Dig into root causes quickly.', $absentTrend)
                );
            } elseif ($absentTrend < -10) {
                $add(
                    'positive',
                    'Absences improving',
                    sprintf('Absences fell by %.1f%% compared with the previous period. Maintain the same support plan.', abs($absentTrend))
                );
            }
        }

        $latestSummary = $evaluationMetrics['latestSummary'] ?? null;
        if ($latestSummary) {
            $latestRating = $latestSummary['averageRating'] ?? ($latestSummary['averageScore'] ?? 0) / 10;
            if (($latestSummary['isPassed'] ?? true) === false) {
                $threshold = $latestSummary['passingThreshold'] ?? 75;
                $add(
                    'negative',
                    'Latest evaluation fell below expectations',
                    sprintf('The recent review scored %.1f/10 which is below the %d%% target. Start a coaching follow-up.', $latestRating, $threshold)
                );
            } else {
                $add(
                    'positive',
                    'Latest evaluation on track',
                    sprintf('The recent evaluation cleared expectations with a %.1f/10 rating.', $latestRating)
                );
            }
        }

        $performanceTrend = $evaluationMetrics['performanceTrend'] ?? 0;
        if ($performanceTrend <= -5) {
            $add(
                'warning',
                'Performance slipping',
                sprintf('Average rating declined by %.1f%% versus earlier evaluations. Pair with a structured improvement plan.', abs($performanceTrend))
            );
        } elseif ($performanceTrend >= 5) {
            $add(
                'positive',
                'Performance trending upward',
                sprintf('Average rating improved by %.1f%% against earlier reviews. Continue recognising progress.', $performanceTrend)
            );
        }

        $declinedCategories = $evaluationMetrics['declinedCategories'] ?? [];
        if (!empty($declinedCategories)) {
            $topDecline = collect($declinedCategories)
                ->take(3)
                ->map(fn($item) => sprintf('%s (%.1f)', $item['category'], $item['change']))
                ->implode(', ');
            $add(
                'warning',
                'Evaluation categories losing ground',
                sprintf('Recent reviews show lower scores in %s. Focus development efforts there.', $topDecline)
            );
        }

        if (count($riskFactors) >= 3) {
            $add(
                'warning',
                'Several risk flags active',
                'Multiple risk drivers are active (attendance, performance, or tenure). Coordinate HR and line management follow-up.'
            );
        }

        if (empty($insights)) {
            $add(
                'positive',
                'No immediate risk signals',
                'Attendance, performance, and evaluation trends stay within healthy ranges for this employee.'
            );
        }

        return $insights;
    }

    /**
     * Get date range based on timeframe
     */
    private function getDateRange($timeframe, $startDate = null, $endDate = null)
    {
        if ($timeframe === 'custom' && $startDate && $endDate) {
            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->endOfDay();

            if ($start->greaterThan($end)) {
                [$start, $end] = [$end, $start];
            }

            return [
                'start' => $start->format('Y-m-d'),
                'end' => $end->format('Y-m-d'),
            ];
        }

        $end = Carbon::now();
        
        switch ($timeframe) {
            case '1month':
                $start = $end->copy()->subMonth();
                break;
            case '3months':
                $start = $end->copy()->subMonths(3);
                break;
            case '6months':
                $start = $end->copy()->subMonths(6);
                break;
            case '1year':
                $start = $end->copy()->subYear();
                break;
            default:
                $start = $end->copy()->subMonths(3);
        }

        return [
            'start' => $start->format('Y-m-d'),
            'end' => $end->format('Y-m-d'),
        ];
    }
}
