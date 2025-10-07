<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationForm;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\User;
use App\Models\EmployeeProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Notifications\EvaluationCompleted;

class ManagerEvaluationController extends Controller
{
    /**
     * Get active evaluation form for managers
     */
    public function getActiveForm()
    {
        try {
            $activeForm = EvaluationForm::with('questions')
                ->where('status', 'Active')
                ->latest()
                ->first();

            if (!$activeForm) {
                return response()->json([
                    'message' => 'No active evaluation form found.',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'message' => 'Active evaluation form retrieved successfully.',
                'data' => [
                    'id' => $activeForm->id,
                    'title' => $activeForm->title,
                    'description' => $activeForm->description,
                    'questions' => $activeForm->questions->map(function ($question) {
                        return [
                            'id' => $question->id,
                            'category' => $question->category,
                            'question_text' => $question->question_text,
                            'description' => $question->description,
                            'order' => $question->order,
                        ];
                    }),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve active evaluation form.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employees that can be evaluated by the manager
     */
    public function getEmployees()
    {
        try {
            $managerId = Auth::id();
            
            // Get all users (excluding the current manager and applicants) with their profiles and latest evaluation info
            $employees = User::with(['employeeProfile', 'role'])
                ->where('id', '!=', $managerId)
                ->whereHas('role', function($query) {
                    $query->whereIn('name', ['HR Assistant', 'HR Staff', 'Manager', 'Employee']);
                })
                ->get()
                ->map(function ($employee) use ($managerId) {
                    // Get the latest evaluation for this employee by this manager
                    $latestEvaluation = Evaluation::where('employee_id', $employee->id)
                        ->where('manager_id', $managerId)
                        ->where('status', 'Submitted')
                        ->latest('submitted_at')
                        ->first();

                    // Check if employee can be evaluated (3-month rule)
                    $canEvaluate = true;
                    $nextEvaluationDate = null;
                    $evaluationStatus = 'Not Evaluated';

                    if ($latestEvaluation) {
                        $nextEvaluationDate = Carbon::parse($latestEvaluation->submitted_at)->addMonths(3);
                        $canEvaluate = Carbon::now()->gte($nextEvaluationDate);
                        $evaluationStatus = $canEvaluate ? 'Ready for Evaluation' : 'Recently Evaluated';
                    }

                    $profile = $employee->employeeProfile;
                    $fullNameFromProfile = $profile ? trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? '')) : null;
                    $displayName = $fullNameFromProfile && strlen(trim($fullNameFromProfile)) > 0 ? $fullNameFromProfile : $employee->name;

                    return [
                        'id' => $employee->id,
                        'name' => $displayName,
                        'email' => $employee->email,
                        'department' => $profile->department ?? 'N/A',
                        'position' => $profile->position ?? 'N/A',
                        'employee_id' => $profile->employee_id ?? 'N/A',
                        'can_evaluate' => $canEvaluate,
                        'evaluation_status' => $evaluationStatus,
                        'next_evaluation_date' => $nextEvaluationDate,
                        'last_evaluation' => $latestEvaluation ? [
                            'id' => $latestEvaluation->id,
                            'total_score' => $latestEvaluation->total_score,
                            'average_score' => $latestEvaluation->average_score,
                            'submitted_at' => $latestEvaluation->submitted_at,
                        ] : null,
                    ];
                });

            return response()->json([
                'message' => 'Employees retrieved successfully.',
                'data' => $employees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve employees.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Start evaluation for a specific employee
     */
    public function startEvaluation(Request $request, $employeeId)
    {
        try {
            $managerId = Auth::id();
            
            // Check if employee exists
            $employee = User::with('employeeProfile')->findOrFail($employeeId);
            
            // Get active evaluation form
            $activeForm = EvaluationForm::with('questions')
                ->where('status', 'Active')
                ->latest()
                ->first();

            if (!$activeForm) {
                return response()->json([
                    'message' => 'No active evaluation form found.'
                ], 404);
            }

            // Check if employee can be evaluated (3-month rule)
            $latestEvaluation = Evaluation::where('employee_id', $employeeId)
                ->where('manager_id', $managerId)
                ->where('status', 'Submitted')
                ->latest('submitted_at')
                ->first();

            if ($latestEvaluation) {
                $nextEvaluationDate = Carbon::parse($latestEvaluation->submitted_at)->addMonths(3);
                if (Carbon::now()->lt($nextEvaluationDate)) {
                    return response()->json([
                        'message' => 'Employee was recently evaluated. Next evaluation available on: ' . $nextEvaluationDate->format('M d, Y'),
                        'next_evaluation_date' => $nextEvaluationDate
                    ], 422);
                }
            }

            // Check if there's already a draft evaluation
            $draftEvaluation = Evaluation::where('evaluation_form_id', $activeForm->id)
                ->where('employee_id', $employeeId)
                ->where('manager_id', $managerId)
                ->where('status', 'Draft')
                ->first();

            if ($draftEvaluation) {
                // Return existing draft with questions and responses
                $draftEvaluation->load(['responses.question']);
                
                return response()->json([
                    'message' => 'Draft evaluation found.',
                    'data' => [
                        'evaluation' => $draftEvaluation,
                        'form' => $activeForm,
                        'employee' => $employee,
                        'responses' => $draftEvaluation->responses->keyBy('evaluation_question_id')
                    ]
                ]);
            }

            // Create new evaluation
            $evaluation = Evaluation::create([
                'evaluation_form_id' => $activeForm->id,
                'employee_id' => $employeeId,
                'manager_id' => $managerId,
                'status' => 'Draft',
                'due_date' => Carbon::now()->addWeeks(2), // 2 weeks to complete
            ]);

            return response()->json([
                'message' => 'Evaluation started successfully.',
                'data' => [
                    'evaluation' => $evaluation,
                    'form' => $activeForm,
                    'employee' => $employee,
                    'responses' => []
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to start evaluation.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit evaluation with ratings and comments
     */
    public function submitEvaluation(Request $request, $evaluationId)
    {
        $request->validate([
            'responses' => 'required|array',
            'responses.*.question_id' => 'required|exists:evaluation_questions,id',
            'responses.*.rating' => 'required|integer|min:1|max:10',
            'responses.*.comment' => 'nullable|string|max:1000',
            'general_comments' => 'nullable|string|max:2000'
        ]);

        try {
            DB::beginTransaction();

            $evaluation = Evaluation::where('id', $evaluationId)
                ->where('manager_id', Auth::id())
                ->where('status', 'Draft')
                ->firstOrFail();

            // Delete existing responses (in case of resubmission)
            $evaluation->responses()->delete();

            $totalScore = 0;
            $responseCount = 0;

            // Save responses
            foreach ($request->responses as $responseData) {
                $rating = intval($responseData['rating']);
                $totalScore += $rating;
                $responseCount++;

                // Determine classification based on rating
                $classification = 'Neutral';
                if ($rating >= 8) {
                    $classification = 'Strength';
                } elseif ($rating <= 6) {
                    $classification = 'Weakness';
                }

                EvaluationResponse::create([
                    'evaluation_id' => $evaluation->id,
                    'evaluation_question_id' => $responseData['question_id'],
                    'rating' => $rating,
                    'classification' => $classification,
                    'manager_comment' => $responseData['comment'] ?? null,
                ]);
            }

            // Calculate scores and percentages
            $averageScore = $responseCount > 0 ? round($totalScore / $responseCount, 2) : 0;
            $percentage = ($totalScore / ($responseCount * 10)) * 100; // Percentage based on max possible score
            $passingScore = 42; // As specified
            $isPassed = $totalScore >= $passingScore;

            // Set evaluation period
            $submittedAt = Carbon::now();
            $nextEvaluationDate = $submittedAt->copy()->addMonths(3);

            // Update evaluation
            $evaluation->update([
                'total_score' => $totalScore,
                'average_score' => $averageScore,
                'percentage_score' => round($percentage, 2),
                'is_passed' => $isPassed,
                'passing_threshold' => $passingScore,
                'status' => 'Submitted',
                'general_comments' => $request->general_comments,
                'submitted_at' => $submittedAt,
                'next_evaluation_date' => $nextEvaluationDate,
                'evaluation_period_start' => $submittedAt->startOfMonth(),
                'evaluation_period_end' => $submittedAt->endOfMonth(),
                'employee_notified' => false,
            ]);

            DB::commit();

            // Send notification to employee about completed evaluation
            try {
                $evaluation->load(['employee', 'manager.employeeProfile', 'evaluationForm']);
                $evaluation->employee->notify(new EvaluationCompleted($evaluation));
                
                // Update evaluation to mark employee as notified
                $evaluation->update([
                    'employee_notified' => true,
                    'notified_at' => Carbon::now()
                ]);
            } catch (\Exception $notificationError) {
                // Log the error but don't fail the evaluation submission
                \Log::error('Failed to send evaluation notification', [
                    'evaluation_id' => $evaluation->id,
                    'employee_id' => $evaluation->employee_id,
                    'error' => $notificationError->getMessage()
                ]);
            }

            // Send notification to HR Staff only (Evaluations are HR Staff's responsibility)
            try {
                $hrStaff = \App\Models\User::whereHas('role', function($query) {
                    $query->where('name', 'HR Staff');
                })->get();

                foreach ($hrStaff as $hr) {
                    $hr->notify(new \App\Notifications\EvaluationSubmitted($evaluation));
                }

                \Log::info('Evaluation submission notifications sent to HR', [
                    'evaluation_id' => $evaluation->id,
                    'employee_id' => $evaluation->employee_id,
                    'hr_staff_notified' => $hrStaff->count()
                ]);
            } catch (\Exception $hrNotificationError) {
                \Log::error('Failed to send evaluation notification to HR', [
                    'evaluation_id' => $evaluation->id,
                    'error' => $hrNotificationError->getMessage()
                ]);
            }

            // Load the evaluation with all related data for response
            $evaluation->load(['employee.employeeProfile', 'manager', 'evaluationForm', 'responses.question']);

            return response()->json([
                'message' => 'Evaluation submitted successfully.',
                'data' => [
                    'evaluation' => $evaluation,
                    'scores' => [
                        'total_score' => $totalScore,
                        'average_score' => $averageScore,
                        'percentage' => round($percentage, 2),
                        'passing_score' => $passingScore,
                        'is_passed' => $isPassed,
                        'question_count' => $responseCount
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to submit evaluation.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get evaluation result for viewing/downloading
     */
    public function getEvaluationResult($evaluationId)
    {
        try {
            $evaluation = Evaluation::with([
                'employee.employeeProfile',
                'manager.employeeProfile',
                'evaluationForm',
                'responses.question'
            ])
            ->where('id', $evaluationId)
            ->where('status', 'Submitted')
            ->firstOrFail();

            // Calculate additional metrics
            $responses = $evaluation->responses;
            $totalQuestions = $responses->count();
            $percentage = ($evaluation->total_score / ($totalQuestions * 10)) * 100;
            $passingScore = 42;
            $isPassed = $evaluation->total_score >= $passingScore;

            $strengths = $responses->where('classification', 'Strength')->values();
            $weaknesses = $responses->where('classification', 'Weakness')->values();

            return response()->json([
                'message' => 'Evaluation result retrieved successfully.',
                'data' => [
                    'evaluation' => $evaluation,
                    'scores' => [
                        'total_score' => $evaluation->total_score,
                        'average_score' => $evaluation->average_score,
                        'percentage' => round($percentage, 2),
                        'passing_score' => $passingScore,
                        'is_passed' => $isPassed,
                        'total_questions' => $totalQuestions
                    ],
                    'analysis' => [
                        'strengths' => $strengths,
                        'weaknesses' => $weaknesses,
                        'strengths_count' => $strengths->count(),
                        'weaknesses_count' => $weaknesses->count(),
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve evaluation result.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * List evaluations for a specific employee (visible to HR, manager, and the employee themself)
     */
    public function getEmployeeResults($employeeId)
    {
        try {
            $evaluations = Evaluation::with(['manager.employeeProfile', 'evaluationForm'])
                ->where('employee_id', $employeeId)
                ->where('status', 'Submitted')
                ->latest('submitted_at')
                ->get()
                ->map(function ($evaluation) {
                    return [
                        'id' => $evaluation->id,
                        'submitted_at' => $evaluation->submitted_at,
                        'total_score' => $evaluation->total_score,
                        'average_score' => $evaluation->average_score,
                        'percentage' => $evaluation->percentage_score,
                        'is_passed' => $evaluation->is_passed,
                        'passing_score' => $evaluation->passing_threshold,
                        'form_title' => optional($evaluation->evaluationForm)->title,
                        'manager' => [
                            'name' => optional($evaluation->manager->employeeProfile)->first_name && optional($evaluation->manager->employeeProfile)->last_name
                                ? trim($evaluation->manager->employeeProfile->first_name . ' ' . $evaluation->manager->employeeProfile->last_name)
                                : $evaluation->manager->name,
                            'email' => $evaluation->manager->email,
                            'id' => $evaluation->manager->id,
                        ]
                    ];
                });

            return response()->json([
                'message' => 'Employee evaluations retrieved successfully.',
                'data' => $evaluations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve employee evaluations.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download evaluation result as PDF
     */
    public function downloadPdf($evaluationId)
    {
        try {
            \Log::info('PDF download requested', ['evaluation_id' => $evaluationId, 'user_id' => Auth::id()]);
            
            $evaluation = Evaluation::with([
                'employee.employeeProfile',
                'manager.employeeProfile',
                'evaluationForm',
                'responses.question'
            ])->where('id', $evaluationId)
            ->where('status', 'Submitted')
            ->firstOrFail();
            
            \Log::info('Evaluation found', ['evaluation' => $evaluation->id, 'employee' => $evaluation->employee_id]);

            $responses = $evaluation->responses;
            $totalQuestions = $responses->count();
            $percentage = ($totalQuestions > 0) ? ($evaluation->total_score / ($totalQuestions * 10)) * 100 : 0;
            $passingScore = 42;
            $isPassed = $evaluation->total_score >= $passingScore;

            $strengths = $responses->where('classification', 'Strength')->values();
            $weaknesses = $responses->where('classification', 'Weakness')->values();

            $data = [
                'evaluation' => $evaluation,
                'scores' => [
                    'total_score' => $evaluation->total_score,
                    'average_score' => $evaluation->average_score,
                    'percentage' => round($percentage, 2),
                    'passing_score' => $passingScore,
                    'is_passed' => $isPassed,
                    'total_questions' => $totalQuestions
                ],
                'analysis' => [
                    'strengths' => $strengths,
                    'weaknesses' => $weaknesses,
                    'strengths_count' => $strengths->count(),
                    'weaknesses_count' => $weaknesses->count(),
                ]
            ];
            
            \Log::info('About to generate PDF');
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('evaluations.result', $data)->setPaper('a4');
            
            $employeeName = optional($evaluation->employee->employeeProfile)->first_name && optional($evaluation->employee->employeeProfile)->last_name
                ? trim($evaluation->employee->employeeProfile->first_name . ' ' . $evaluation->employee->employeeProfile->last_name)
                : $evaluation->employee->name;
            $fileName = 'Evaluation_Result_' . preg_replace('/[^A-Za-z0-9_\-]/', '_', $employeeName) . '_' . $evaluation->id . '.pdf';
            
            \Log::info('PDF generated successfully', ['filename' => $fileName]);
            return $pdf->download($fileName);
        } catch (\Exception $e) {
            \Log::error('PDF generation failed', [
                'evaluation_id' => $evaluationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to generate PDF.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all evaluations conducted by the manager
     */
    public function getMyEvaluations()
    {
        try {
            $evaluations = Evaluation::with([
                'employee.employeeProfile',
                'evaluationForm'
            ])
            ->where('manager_id', Auth::id())
            ->where('status', 'Submitted')
            ->latest('submitted_at')
            ->get()
            ->map(function ($evaluation) {
                return [
                    'id' => $evaluation->id,
                    'employee_name' => $evaluation->employee->name,
                    'employee_id' => $evaluation->employee->employeeProfile->employee_id ?? 'N/A',
                    'department' => $evaluation->employee->employeeProfile->department ?? 'N/A',
                    'position' => $evaluation->employee->employeeProfile->position ?? 'N/A',
                    'form_title' => $evaluation->evaluationForm->title,
                    'total_score' => $evaluation->total_score,
                    'average_score' => $evaluation->average_score,
                    'submitted_at' => $evaluation->submitted_at,
                    'next_evaluation_date' => $evaluation->next_evaluation_date,
                ];
            });

            return response()->json([
                'message' => 'Evaluations retrieved successfully.',
                'data' => $evaluations
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve evaluations.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employee's own evaluation results (for employee view)
     */
    public function getMyEvaluationResults()
    {
        try {
            $evaluations = Evaluation::with([
                'manager.employeeProfile',
                'evaluationForm'
            ])
            ->where('employee_id', Auth::id())
            ->where('status', 'Submitted')
            ->latest('submitted_at')
            ->get()
            ->map(function ($evaluation) {
                return [
                    'id' => $evaluation->id,
                    'submitted_at' => $evaluation->submitted_at,
                    'total_score' => $evaluation->total_score,
                    'average_score' => $evaluation->average_score,
                    'percentage' => $evaluation->percentage_score,
                    'is_passed' => $evaluation->is_passed,
                    'passing_score' => $evaluation->passing_threshold,
                    'form_title' => optional($evaluation->evaluationForm)->title,
                    'manager' => [
                        'name' => optional($evaluation->manager->employeeProfile)->first_name && optional($evaluation->manager->employeeProfile)->last_name
                            ? trim($evaluation->manager->employeeProfile->first_name . ' ' . $evaluation->manager->employeeProfile->last_name)
                            : $evaluation->manager->name,
                        'email' => $evaluation->manager->email,
                        'id' => $evaluation->manager->id,
                    ],
                    'next_evaluation_date' => $evaluation->next_evaluation_date,
                ];
            });

            return response()->json([
                'message' => 'Your evaluations retrieved successfully.',
                'data' => $evaluations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve your evaluations.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific evaluation result for employee view
     */
    public function getEvaluationResultForEmployee($evaluationId)
    {
        try {
            $evaluation = Evaluation::with([
                'manager.employeeProfile',
                'evaluationForm',
                'responses.question'
            ])
            ->where('id', $evaluationId)
            ->where('employee_id', Auth::id()) // Ensure employee can only view their own evaluation
            ->where('status', 'Submitted')
            ->firstOrFail();

            // Calculate additional metrics
            $responses = $evaluation->responses;
            $totalQuestions = $responses->count();
            $percentage = ($evaluation->total_score / ($totalQuestions * 10)) * 100;
            $passingScore = 42;
            $isPassed = $evaluation->total_score >= $passingScore;

            $strengths = $responses->where('classification', 'Strength')->values();
            $weaknesses = $responses->where('classification', 'Weakness')->values();

            return response()->json([
                'message' => 'Your evaluation result retrieved successfully.',
                'data' => [
                    'evaluation' => $evaluation,
                    'scores' => [
                        'total_score' => $evaluation->total_score,
                        'average_score' => $evaluation->average_score,
                        'percentage' => round($percentage, 2),
                        'passing_score' => $passingScore,
                        'is_passed' => $isPassed,
                        'total_questions' => $totalQuestions
                    ],
                    'analysis' => [
                        'strengths' => $strengths,
                        'weaknesses' => $weaknesses,
                        'strengths_count' => $strengths->count(),
                        'weaknesses_count' => $weaknesses->count(),
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve your evaluation result.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download evaluation result as PDF (employee version)
     */
    public function downloadPdfForEmployee($evaluationId)
    {
        try {
            \Log::info('Employee PDF download requested', ['evaluation_id' => $evaluationId, 'user_id' => Auth::id()]);
            
            $evaluation = Evaluation::with([
                'employee.employeeProfile',
                'manager.employeeProfile',
                'evaluationForm',
                'responses.question'
            ])
            ->where('id', $evaluationId)
            ->where('employee_id', Auth::id()) // Ensure employee can only download their own evaluation
            ->where('status', 'Submitted')
            ->firstOrFail();
            
            \Log::info('Employee evaluation found', ['evaluation' => $evaluation->id, 'employee' => $evaluation->employee_id]);

            $responses = $evaluation->responses;
            $totalQuestions = $responses->count();
            $percentage = ($totalQuestions > 0) ? ($evaluation->total_score / ($totalQuestions * 10)) * 100 : 0;
            $passingScore = 42;
            $isPassed = $evaluation->total_score >= $passingScore;

            $strengths = $responses->where('classification', 'Strength')->values();
            $weaknesses = $responses->where('classification', 'Weakness')->values();

            $data = [
                'evaluation' => $evaluation,
                'scores' => [
                    'total_score' => $evaluation->total_score,
                    'average_score' => $evaluation->average_score,
                    'percentage' => round($percentage, 2),
                    'passing_score' => $passingScore,
                    'is_passed' => $isPassed,
                    'total_questions' => $totalQuestions
                ],
                'analysis' => [
                    'strengths' => $strengths,
                    'weaknesses' => $weaknesses,
                    'strengths_count' => $strengths->count(),
                    'weaknesses_count' => $weaknesses->count(),
                ]
            ];
            
            \Log::info('About to generate employee PDF');
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('evaluations.result', $data)->setPaper('a4');
            
            $employeeName = optional($evaluation->employee->employeeProfile)->first_name && optional($evaluation->employee->employeeProfile)->last_name
                ? trim($evaluation->employee->employeeProfile->first_name . ' ' . $evaluation->employee->employeeProfile->last_name)
                : $evaluation->employee->name;
            $fileName = 'My_Evaluation_Result_' . preg_replace('/[^A-Za-z0-9_\-]/', '_', $employeeName) . '_' . $evaluation->id . '.pdf';
            
            \Log::info('Employee PDF generated successfully', ['filename' => $fileName]);
            return $pdf->download($fileName);
        } catch (\Exception $e) {
            \Log::error('Employee PDF generation failed', [
                'evaluation_id' => $evaluationId,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to generate PDF.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
