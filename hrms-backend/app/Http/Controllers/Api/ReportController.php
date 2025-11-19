<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Evaluation;
use App\Models\Payroll;
use App\Models\EmployeeProfile;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportController extends Controller
{
    /**
     * Get departments list for filtering
     */
    public function getDepartments(): JsonResponse
    {
        try {
            $departments = EmployeeProfile::select('department')
                ->whereNotNull('department')
                ->distinct()
                ->orderBy('department')
                ->pluck('department');

            return response()->json([
                'success' => true,
                'data' => $departments
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch departments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get positions list for filtering
     */
    public function getPositions(): JsonResponse
    {
        try {
            $positions = EmployeeProfile::select('position')
                ->whereNotNull('position')
                ->distinct()
                ->orderBy('position')
                ->pluck('position');

            return response()->json([
                'success' => true,
                'data' => $positions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch positions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get performance report preview data
     */
    public function getPerformanceReport(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'department' => 'nullable|string',
                'position' => 'nullable|string',
                'status' => 'nullable|in:passed,failed,all',
                'format' => 'nullable|in:json,pdf,excel'
            ]);

            $query = Evaluation::with([
                'employee.employeeProfile',
                'manager.employeeProfile',
                'evaluationForm',
                'responses'
            ])
            ->where('status', 'Submitted')
            ->whereBetween('evaluation_period_start', [
                $validated['start_date'],
                $validated['end_date']
            ]);

            // Apply filters
            if (!empty($validated['department'])) {
                $query->whereHas('employee.employeeProfile', function($q) use ($validated) {
                    $q->where('department', $validated['department']);
                });
            }

            if (!empty($validated['position'])) {
                $query->whereHas('employee.employeeProfile', function($q) use ($validated) {
                    $q->where('position', $validated['position']);
                });
            }

            if (isset($validated['status']) && $validated['status'] !== 'all') {
                $isPassed = $validated['status'] === 'passed';
                $query->where('is_passed', $isPassed);
            }

            $evaluations = $query->orderBy('evaluation_period_start', 'desc')
                ->get()
                ->map(function($evaluation) {
                    $employee = $evaluation->employee;
                    $profile = $employee->employeeProfile;
                    $manager = $evaluation->manager;
                    $managerProfile = $manager->employeeProfile;

                    return [
                        'id' => $evaluation->id,
                        'employee_id' => $employee->id,
                        'employee_name' => ($profile && $profile->first_name && $profile->last_name)
                            ? trim($profile->first_name . ' ' . $profile->last_name)
                            : $employee->name,
                        'employee_id_number' => $profile->employee_id ?? 'N/A',
                        'department' => $profile->department ?? 'N/A',
                        'position' => $profile->position ?? 'N/A',
                        'manager_name' => ($managerProfile && $managerProfile->first_name && $managerProfile->last_name)
                            ? trim($managerProfile->first_name . ' ' . $managerProfile->last_name)
                            : $manager->name,
                        'evaluation_period_start' => $evaluation->evaluation_period_start,
                        'evaluation_period_end' => $evaluation->evaluation_period_end,
                        'submitted_at' => $evaluation->submitted_at,
                        'total_score' => $evaluation->total_score,
                        'average_score' => $evaluation->average_score,
                        'percentage_score' => $evaluation->percentage_score,
                        'passing_threshold' => $evaluation->passing_threshold,
                        'is_passed' => $evaluation->is_passed,
                        'form_title' => optional($evaluation->evaluationForm)->title,
                        'general_comments' => $evaluation->general_comments,
                    ];
                });

            // Calculate statistics
            $totalEvaluations = $evaluations->count();
            $passedCount = $evaluations->where('is_passed', true)->count();
            $failedCount = $evaluations->where('is_passed', false)->count();
            $averagePercentage = $totalEvaluations > 0 
                ? round($evaluations->avg('percentage_score'), 2) 
                : 0;

            // Calculate analytics by department
            $byDepartment = $evaluations->groupBy('department')->map(function($deptEvals, $dept) {
                $deptTotal = $deptEvals->count();
                $deptPassed = $deptEvals->where('is_passed', true)->count();
                $deptAverage = $deptTotal > 0 ? round($deptEvals->avg('percentage_score'), 2) : 0;
                return [
                    'department' => $dept,
                    'total' => $deptTotal,
                    'passed' => $deptPassed,
                    'failed' => $deptTotal - $deptPassed,
                    'average_score' => $deptAverage,
                    'pass_rate' => $deptTotal > 0 ? round(($deptPassed / $deptTotal) * 100, 2) : 0,
                ];
            })->values();

            // Calculate analytics by position
            $byPosition = $evaluations->groupBy('position')->map(function($posEvals, $pos) {
                $posTotal = $posEvals->count();
                $posPassed = $posEvals->where('is_passed', true)->count();
                $posAverage = $posTotal > 0 ? round($posEvals->avg('percentage_score'), 2) : 0;
                return [
                    'position' => $pos,
                    'total' => $posTotal,
                    'passed' => $posPassed,
                    'failed' => $posTotal - $posPassed,
                    'average_score' => $posAverage,
                    'pass_rate' => $posTotal > 0 ? round(($posPassed / $posTotal) * 100, 2) : 0,
                ];
            })->values();

            // Calculate performance trends over time
            $byMonth = $evaluations->groupBy(function($eval) {
                return date('Y-m', strtotime($eval['evaluation_period_start']));
            })->map(function($monthEvals, $month) {
                $monthTotal = $monthEvals->count();
                $monthPassed = $monthEvals->where('is_passed', true)->count();
                $monthAverage = $monthTotal > 0 ? round($monthEvals->avg('percentage_score'), 2) : 0;
                return [
                    'month' => $month,
                    'total' => $monthTotal,
                    'passed' => $monthPassed,
                    'failed' => $monthTotal - $monthPassed,
                    'average_score' => $monthAverage,
                    'pass_rate' => $monthTotal > 0 ? round(($monthPassed / $monthTotal) * 100, 2) : 0,
                ];
            })->values()->sortBy('month');

            // Identify top and bottom performers
            $sortedEvals = $evaluations->sortByDesc('percentage_score');
            $topPerformers = $sortedEvals->take(5)->values();
            $bottomPerformers = $sortedEvals->take(-5)->reverse()->values();

            // Generate insights
            $insights = $this->generateInsights([
                'total' => $totalEvaluations,
                'passed' => $passedCount,
                'failed' => $failedCount,
                'average' => $averagePercentage,
                'pass_rate' => $totalEvaluations > 0 ? round(($passedCount / $totalEvaluations) * 100, 2) : 0,
                'by_department' => $byDepartment,
                'by_position' => $byPosition,
                'by_month' => $byMonth,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'evaluations' => $evaluations,
                    'statistics' => [
                        'total_evaluations' => $totalEvaluations,
                        'passed_count' => $passedCount,
                        'failed_count' => $failedCount,
                        'average_percentage' => $averagePercentage,
                        'pass_rate' => $totalEvaluations > 0 
                            ? round(($passedCount / $totalEvaluations) * 100, 2) 
                            : 0,
                    ],
                    'analytics' => [
                        'by_department' => $byDepartment,
                        'by_position' => $byPosition,
                        'by_month' => $byMonth,
                        'top_performers' => $topPerformers,
                        'bottom_performers' => $bottomPerformers,
                    ],
                    'insights' => $insights,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate performance report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get detailed performance data for a specific employee
     */
    public function getEmployeePerformanceDetails(Request $request, int $employeeId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
            ]);

            $evaluations = Evaluation::with([
                    'employee.employeeProfile',
                    'manager.employeeProfile',
                    'responses.question'
                ])
                ->where('status', 'Submitted')
                ->where('employee_id', $employeeId)
                ->whereBetween('evaluation_period_start', [
                    $validated['start_date'],
                    $validated['end_date']
                ])
                ->orderBy('evaluation_period_start', 'desc')
                ->get();

            $employeeProfileRecord = EmployeeProfile::where('user_id', $employeeId)->first();
            $employeeName = $employeeProfileRecord
                ? trim(($employeeProfileRecord->first_name ?? '') . ' ' . ($employeeProfileRecord->last_name ?? ''))
                : null;

            if ($evaluations->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'employee' => [
                            'id' => $employeeId,
                            'name' => $employeeName ?? 'Employee',
                            'employee_id_number' => optional($employeeProfileRecord)->employee_id,
                            'department' => optional($employeeProfileRecord)->department,
                            'position' => optional($employeeProfileRecord)->position,
                        ],
                        'summary' => [
                            'evaluation_count' => 0,
                            'average_percentage' => 0,
                            'category_summary' => [],
                        ],
                        'evaluations' => [],
                    ],
                ]);
            }

            $categoryAggregate = [];

            $evaluationDetails = $evaluations->map(function ($evaluation) use (&$categoryAggregate) {
                $responses = $evaluation->responses;
                $formTitle = optional($evaluation->evaluationForm)->title;

                $categoryData = $responses->groupBy(function ($response) {
                    return $response->question->category ?? 'General';
                })->map(function ($group, $category) use (&$categoryAggregate) {
                    $totalRating = $group->sum('rating');
                    $totalMax = $group->sum(function ($response) {
                        return $response->question->max_score ?? 10;
                    });
                    $questionCount = $group->count();

                    if (!isset($categoryAggregate[$category])) {
                        $categoryAggregate[$category] = [
                            'total_rating' => 0,
                            'total_max' => 0,
                            'question_count' => 0,
                        ];
                    }

                    $categoryAggregate[$category]['total_rating'] += $totalRating;
                    $categoryAggregate[$category]['total_max'] += $totalMax;
                    $categoryAggregate[$category]['question_count'] += $questionCount;

                    return [
                        'category' => $category,
                        'question_count' => $questionCount,
                        'average_rating' => $questionCount > 0 ? round($group->avg('rating'), 2) : 0,
                        'percentage' => $totalMax > 0 ? round(($totalRating / $totalMax) * 100, 1) : 0,
                    ];
                })->values();

                $questionData = $responses->map(function ($response) {
                    $question = $response->question;
                    $maxScore = $question->max_score ?? 10;
                    $percentage = $maxScore > 0 ? ($response->rating / $maxScore) * 100 : null;

                    return [
                        'question_id' => $response->question_id,
                        'question' => $question->question_text ?? 'Question',
                        'category' => $question->category ?? 'General',
                        'rating' => round($response->rating, 2),
                        'max_rating' => $maxScore,
                        'percentage' => $percentage !== null ? round($percentage, 1) : null,
                    ];
                })->values();

                return [
                    'id' => $evaluation->id,
                    'form_title' => $formTitle,
                    'submitted_at' => $evaluation->submitted_at,
                    'evaluation_period_start' => $evaluation->evaluation_period_start,
                    'evaluation_period_end' => $evaluation->evaluation_period_end,
                    'percentage_score' => round($evaluation->percentage_score ?? 0, 2),
                    'total_score' => round($evaluation->total_score ?? 0, 2),
                    'average_score' => round($evaluation->average_score ?? 0, 2),
                    'categories' => $categoryData,
                    'questions' => $questionData,
                ];
            })->values();

            $categorySummary = collect($categoryAggregate)->map(function ($data, $category) {
                $percentage = $data['total_max'] > 0 ? ($data['total_rating'] / $data['total_max']) * 100 : 0;
                $averageRating = $data['question_count'] > 0
                    ? $data['total_rating'] / $data['question_count']
                    : 0;

                return [
                    'category' => $category,
                    'question_count' => $data['question_count'],
                    'average_rating' => round($averageRating, 2),
                    'average_percentage' => round($percentage, 1),
                ];
            })->values();

            $employee = $evaluations->first()->employee;
            $employeeProfile = $employee->employeeProfile;

            return response()->json([
                'success' => true,
                'data' => [
                    'employee' => [
                        'id' => $employee->id,
                        'name' => $employeeProfile
                            ? trim(($employeeProfile->first_name ?? '') . ' ' . ($employeeProfile->last_name ?? ''))
                            : $employee->name,
                        'employee_id_number' => $employeeProfile->employee_id ?? 'N/A',
                        'department' => $employeeProfile->department ?? 'N/A',
                        'position' => $employeeProfile->position ?? 'N/A',
                    ],
                    'summary' => [
                        'evaluation_count' => $evaluationDetails->count(),
                        'average_percentage' => $evaluationDetails->count() > 0
                            ? round($evaluationDetails->avg('percentage_score'), 2)
                            : 0,
                        'category_summary' => $categorySummary,
                    ],
                    'evaluations' => $evaluationDetails,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch employee performance details',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get payroll report preview data with analytics
     */
    public function getPayrollReport(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'department' => 'nullable|string',
                'position' => 'nullable|string',
            ]);

            $query = Payroll::with(['employee', 'employee.user'])
                ->whereBetween('period_start', [$validated['start_date'], $validated['end_date']])
                ->whereBetween('period_end', [$validated['start_date'], $validated['end_date']]);

            if (!empty($validated['department'])) {
                $query->whereHas('employee', function ($q) use ($validated) {
                    $q->where('department', $validated['department']);
                });
            }

            if (!empty($validated['position'])) {
                $query->whereHas('employee', function ($q) use ($validated) {
                    $q->where('position', $validated['position']);
                });
            }

            $payrolls = $query->get()->map(function ($payroll) {
                $profile = $payroll->employee;
                $user = $profile?->user;
                $name = $profile && ($profile->first_name || $profile->last_name)
                    ? trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? ''))
                    : ($user?->name ?? 'Employee');
                return [
                    'id' => $payroll->id,
                    'employee_id' => $payroll->employee_id,
                    'employee_name' => $name,
                    'employee_id_number' => $profile->employee_id ?? 'N/A',
                    'department' => $profile->department ?? 'N/A',
                    'position' => $profile->position ?? 'N/A',
                    'period_start' => $payroll->period_start,
                    'period_end' => $payroll->period_end,
                    'basic_salary' => (float) $payroll->basic_salary,
                    'overtime_pay' => (float) $payroll->overtime_pay,
                    'allowances' => (float) $payroll->allowances,
                    'total_deductions' => (float) $payroll->total_deductions,
                    'net_pay' => (float) $payroll->net_pay,
                    'gross_pay' => (float) $payroll->gross_pay,
                    'sss_deduction' => (float) $payroll->sss_deduction,
                    'philhealth_deduction' => (float) $payroll->philhealth_deduction,
                    'pagibig_deduction' => (float) $payroll->pagibig_deduction,
                    'tax_deduction' => (float) $payroll->tax_deduction,
                    'late_deduction' => (float) $payroll->late_deduction,
                    'undertime_deduction' => (float) $payroll->undertime_deduction,
                    'cash_advance_deduction' => (float) $payroll->cash_advance_deduction,
                    'other_deductions' => (float) $payroll->other_deductions,
                    'status' => $payroll->status ?? 'Pending',
                ];
            });

            $totalGross = $payrolls->sum('gross_pay');
            $totalNet = $payrolls->sum('net_pay');
            $totalDeductions = $payrolls->sum('total_deductions');
            $averageNet = $payrolls->count() > 0 ? $totalNet / $payrolls->count() : 0;

            $deductionsBreakdown = [
                'sss' => $payrolls->sum('sss_deduction'),
                'philhealth' => $payrolls->sum('philhealth_deduction'),
                'pagibig' => $payrolls->sum('pagibig_deduction'),
                'tax' => $payrolls->sum('tax_deduction'),
                'late' => $payrolls->sum('late_deduction'),
                'undertime' => $payrolls->sum('undertime_deduction'),
                'cash_advance' => $payrolls->sum('cash_advance_deduction'),
                'other' => $payrolls->sum('other_deductions'),
            ];

            $topEarners = $payrolls->sortByDesc('net_pay')->take(5)->values();
            $lowestEarners = $payrolls->sortBy('net_pay')->take(5)->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'payrolls' => $payrolls,
                    'analytics' => [
                        'total_gross' => round($totalGross, 2),
                        'total_net' => round($totalNet, 2),
                        'total_deductions' => round($totalDeductions, 2),
                        'average_net_pay' => round($averageNet, 2),
                        'deductions_breakdown' => array_map(fn($value) => round($value, 2), $deductionsBreakdown),
                        'top_earners' => $topEarners,
                        'lowest_earners' => $lowestEarners,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate payroll report',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate and download performance report PDF
     */
    public function downloadPerformanceReportPDF(Request $request)
    {
        try {
            $validated = $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'department' => 'nullable|string',
                'position' => 'nullable|string',
                'status' => 'nullable|in:passed,failed,all'
            ]);

            $query = Evaluation::with([
                'employee.employeeProfile',
                'manager.employeeProfile',
                'evaluationForm',
                'responses.question'
            ])
            ->where('status', 'Submitted')
            ->whereBetween('evaluation_period_start', [
                $validated['start_date'],
                $validated['end_date']
            ]);

            // Apply filters
            if (!empty($validated['department'])) {
                $query->whereHas('employee.employeeProfile', function($q) use ($validated) {
                    $q->where('department', $validated['department']);
                });
            }

            if (!empty($validated['position'])) {
                $query->whereHas('employee.employeeProfile', function($q) use ($validated) {
                    $q->where('position', $validated['position']);
                });
            }

            if (isset($validated['status']) && $validated['status'] !== 'all') {
                $isPassed = $validated['status'] === 'passed';
                $query->where('is_passed', $isPassed);
            }

            $evaluations = $query->orderBy('evaluation_period_start', 'desc')
                ->orderBy('employee_id')
                ->get()
                ->map(function($evaluation) {
                    $employee = $evaluation->employee;
                    $profile = $employee->employeeProfile;
                    $manager = $evaluation->manager;
                    $managerProfile = $manager->employeeProfile;

                    return [
                        'id' => $evaluation->id,
                        'employee_id' => $employee->id,
                        'employee_name' => ($profile && $profile->first_name && $profile->last_name)
                            ? trim($profile->first_name . ' ' . $profile->last_name)
                            : $employee->name,
                        'employee_id_number' => $profile->employee_id ?? 'N/A',
                        'department' => $profile->department ?? 'N/A',
                        'position' => $profile->position ?? 'N/A',
                        'manager_name' => ($managerProfile && $managerProfile->first_name && $managerProfile->last_name)
                            ? trim($managerProfile->first_name . ' ' . $managerProfile->last_name)
                            : $manager->name,
                        'evaluation_period_start' => $evaluation->evaluation_period_start,
                        'evaluation_period_end' => $evaluation->evaluation_period_end,
                        'submitted_at' => $evaluation->submitted_at,
                        'total_score' => $evaluation->total_score,
                        'average_score' => $evaluation->average_score,
                        'percentage_score' => $evaluation->percentage_score,
                        'passing_threshold' => $evaluation->passing_threshold,
                        'is_passed' => $evaluation->is_passed,
                        'form_title' => optional($evaluation->evaluationForm)->title,
                        'general_comments' => $evaluation->general_comments,
                    ];
                });

            // Calculate statistics
            $totalEvaluations = $evaluations->count();
            $passedCount = $evaluations->where('is_passed', true)->count();
            $failedCount = $evaluations->where('is_passed', false)->count();
            $averagePercentage = $totalEvaluations > 0 
                ? round($evaluations->avg('percentage_score'), 2) 
                : 0;

            // Calculate analytics
            $byDepartment = $evaluations->groupBy('department')->map(function($deptEvals, $dept) {
                $deptTotal = $deptEvals->count();
                $deptPassed = $deptEvals->where('is_passed', true)->count();
                $deptAverage = $deptTotal > 0 ? round($deptEvals->avg('percentage_score'), 2) : 0;
                return [
                    'department' => $dept,
                    'total' => $deptTotal,
                    'passed' => $deptPassed,
                    'failed' => $deptTotal - $deptPassed,
                    'average_score' => $deptAverage,
                    'pass_rate' => $deptTotal > 0 ? round(($deptPassed / $deptTotal) * 100, 2) : 0,
                ];
            })->values();

            $byPosition = $evaluations->groupBy('position')->map(function($posEvals, $pos) {
                $posTotal = $posEvals->count();
                $posPassed = $posEvals->where('is_passed', true)->count();
                $posAverage = $posTotal > 0 ? round($posEvals->avg('percentage_score'), 2) : 0;
                return [
                    'position' => $pos,
                    'total' => $posTotal,
                    'passed' => $posPassed,
                    'failed' => $posTotal - $posPassed,
                    'average_score' => $posAverage,
                    'pass_rate' => $posTotal > 0 ? round(($posPassed / $posTotal) * 100, 2) : 0,
                ];
            })->values();

            $byMonth = $evaluations->groupBy(function($eval) {
                return date('Y-m', strtotime($eval['evaluation_period_start']));
            })->map(function($monthEvals, $month) {
                $monthTotal = $monthEvals->count();
                $monthPassed = $monthEvals->where('is_passed', true)->count();
                $monthAverage = $monthTotal > 0 ? round($monthEvals->avg('percentage_score'), 2) : 0;
                return [
                    'month' => $month,
                    'total' => $monthTotal,
                    'passed' => $monthPassed,
                    'failed' => $monthTotal - $monthPassed,
                    'average_score' => $monthAverage,
                    'pass_rate' => $monthTotal > 0 ? round(($monthPassed / $monthTotal) * 100, 2) : 0,
                ];
            })->values()->sortBy('month');

            $sortedEvals = $evaluations->sortByDesc('percentage_score');
            $topPerformers = $sortedEvals->take(5)->values();
            $bottomPerformers = $sortedEvals->take(-5)->reverse()->values();

            // Generate insights
            $insights = $this->generateInsights([
                'total' => $totalEvaluations,
                'passed' => $passedCount,
                'failed' => $failedCount,
                'average' => $averagePercentage,
                'pass_rate' => $totalEvaluations > 0 ? round(($passedCount / $totalEvaluations) * 100, 2) : 0,
                'by_department' => $byDepartment,
                'by_position' => $byPosition,
                'by_month' => $byMonth,
            ]);

            $data = [
                'evaluations' => $evaluations,
                'filters' => $validated,
                'statistics' => [
                    'total_evaluations' => $totalEvaluations,
                    'passed_count' => $passedCount,
                    'failed_count' => $failedCount,
                    'average_percentage' => $averagePercentage,
                    'pass_rate' => $totalEvaluations > 0 
                        ? round(($passedCount / $totalEvaluations) * 100, 2) 
                        : 0,
                ],
                'analytics' => [
                    'by_department' => $byDepartment,
                    'by_position' => $byPosition,
                    'by_month' => $byMonth,
                    'top_performers' => $topPerformers,
                    'bottom_performers' => $bottomPerformers,
                ],
                'insights' => $insights,
                'generated_at' => Carbon::now(),
            ];

            $pdf = Pdf::loadView('reports.performance', $data)->setPaper('a4', 'landscape');
            
            $filename = 'Performance_Report_' . 
                $validated['start_date'] . '_to_' . 
                $validated['end_date'] . '.pdf';
            
            return $pdf->download($filename);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate PDF report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate insights and interpretations from analytics data
     */
    private function generateInsights(array $data): array
    {
        $insights = [];

        // Overall performance insight
        if ($data['total'] > 0) {
            $passRate = $data['pass_rate'];
            if ($passRate >= 90) {
                $insights[] = [
                    'type' => 'success',
                    'title' => 'Excellent Overall Performance',
                    'description' => "With a {$passRate}% pass rate, your organization demonstrates exceptional workforce performance. This indicates strong management practices and high employee competency.",
                    'recommendation' => 'Continue current practices and consider establishing this as a benchmark for future periods.'
                ];
            } elseif ($passRate >= 70) {
                $insights[] = [
                    'type' => 'success',
                    'title' => 'Good Overall Performance',
                    'description' => "A {$passRate}% pass rate shows that most employees are meeting performance expectations. The organization is in a healthy state.",
                    'recommendation' => 'Focus on supporting employees in the failing range to bring them up to standard.'
                ];
            } elseif ($passRate >= 50) {
                $insights[] = [
                    'type' => 'warning',
                    'title' => 'Moderate Performance Concerns',
                    'description' => "With a {$passRate}% pass rate, there are significant performance gaps that need attention. Nearly half of the workforce requires improvement.",
                    'recommendation' => 'Implement targeted training programs and performance improvement plans for underperforming employees.'
                ];
            } else {
                $insights[] = [
                    'type' => 'danger',
                    'title' => 'Critical Performance Issues',
                    'description' => "A {$passRate}% pass rate indicates serious organizational performance problems. Immediate intervention is required.",
                    'recommendation' => 'Conduct comprehensive review of training programs, management practices, and organizational support systems.'
                ];
            }
        }

        // Department insights
        if (!empty($data['by_department']) && count($data['by_department']) > 1) {
            $deptPerformers = collect($data['by_department'])->sortByDesc('average_score');
            $topDept = $deptPerformers->first();
            $bottomDept = $deptPerformers->last();
            
            if ($topDept['average_score'] > $bottomDept['average_score'] + 10) {
                $insights[] = [
                    'type' => 'info',
                    'title' => 'Department Performance Gap',
                    'description' => "{$topDept['department']} leads with {$topDept['average_score']}% average score, while {$bottomDept['department']} trails at {$bottomDept['average_score']}%.",
                    'recommendation' => "Consider sharing best practices from {$topDept['department']} with {$bottomDept['department']} to improve overall organizational performance."
                ];
            }
        }

        // Position insights
        if (!empty($data['by_position']) && count($data['by_position']) > 1) {
            $posPerformers = collect($data['by_position'])->sortByDesc('average_score');
            $topPos = $posPerformers->first();
            
            if ($topPos['average_score'] >= 80) {
                $insights[] = [
                    'type' => 'success',
                    'title' => 'Strong Position Performance',
                    'description' => "{$topPos['position']} roles consistently show high performance with {$topPos['average_score']}% average and {$topPos['pass_rate']}% pass rate.",
                    'recommendation' => 'Recognize and replicate the success factors contributing to this position\'s performance.'
                ];
            }
        }

        // Trend insights
        if (!empty($data['by_month']) && count($data['by_month']) > 1) {
            $months = collect($data['by_month']);
            $firstMonth = $months->first();
            $lastMonth = $months->last();
            
            if ($lastMonth['average_score'] > $firstMonth['average_score'] + 5) {
                $insights[] = [
                    'type' => 'success',
                    'title' => 'Improving Trend',
                    'description' => "Performance has improved from {$firstMonth['average_score']}% in {$firstMonth['month']} to {$lastMonth['average_score']}% in {$lastMonth['month']}.",
                    'recommendation' => 'Continue the current improvement strategy and identify specific factors contributing to this positive trend.'
                ];
            } elseif ($lastMonth['average_score'] < $firstMonth['average_score'] - 5) {
                $insights[] = [
                    'type' => 'warning',
                    'title' => 'Declining Trend',
                    'description' => "Performance has declined from {$firstMonth['average_score']}% in {$firstMonth['month']} to {$lastMonth['average_score']}% in {$lastMonth['month']}.",
                    'recommendation' => 'Investigate root causes of the decline and implement corrective measures promptly.'
                ];
            }
        }

        // Add recommendation count
        if (empty($insights)) {
            $insights[] = [
                'type' => 'info',
                'title' => 'Limited Data Available',
                'description' => 'Not enough data points to generate meaningful insights.',
                'recommendation' => 'Collect more evaluation data over time to enable comprehensive performance analysis.'
            ];
        }

        return $insights;
    }
}
