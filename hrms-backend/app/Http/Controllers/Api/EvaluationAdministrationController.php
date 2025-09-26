<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvaluationForm;
use App\Models\EvaluationQuestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EvaluationAdministrationController extends Controller
{
    // Get all evaluation forms with their questions
    public function index()
    {
        // Enforce single active form: keep the most recently updated/created Active, inactivate the rest
        try {
            $activeForms = EvaluationForm::where('status', 'Active')
                ->orderByDesc('updated_at')
                ->orderByDesc('created_at')
                ->get();

            // Prefer 'Assesstment 1' (typo-friendly) or 'Assessment 1' as the default active if present
            $preferred = EvaluationForm::whereIn('title', ['Assesstment 1', 'Assessment 1'])
                ->orderByDesc('updated_at')
                ->orderByDesc('created_at')
                ->first();

            if ($activeForms->count() > 1) {
                $keepId = $preferred ? $preferred->id : $activeForms->first()->id;
                EvaluationForm::where('status', 'Active')
                    ->where('id', '!=', $keepId)
                    ->update(['status' => 'Inactive']);
            } elseif ($activeForms->count() === 0 && $preferred) {
                // If no active form, promote preferred form to Active
                $preferred->update(['status' => 'Active']);
            }
        } catch (\Throwable $e) {
            // Do not fail index() if cleanup fails; proceed to list
        }

        // Ensure a default 'Assessment 1' form exists
        try {
            $existingDefault = EvaluationForm::whereIn('title', ['Assesstment 1', 'Assessment 1'])->first();
            if (!$existingDefault) {
                $activeExists = EvaluationForm::where('status', 'Active')->exists();
                $creatorId = optional(auth()->user())->id ?? (\App\Models\User::min('id') ?? 1);
                $defaultForm = EvaluationForm::create([
                    'hr_staff_id' => $creatorId,
                    'title' => 'Assessment 1',
                    'description' => 'Default performance evaluation form based on the company template.',
                    'status' => $activeExists ? 'Inactive' : 'Active',
                ]);

                $questions = [
                    [
                        'category' => 'Punctuality & Attendance',
                        'question_text' => 'Pagpasok sa tamang oras at hindi pagliban (Punctuality & Attendance)',
                        'description' => 'Ang empleyadong ito ay pumapasok sa tamang oras at hindi lumalampas sa oras ng pagpasok. Gayundin ang hindi pagliban o pag-absent sa araw at oras ng trabaho.',
                    ],
                    [
                        'category' => 'Attitude towards co-workers',
                        'question_text' => 'Pag-uugali sa kapwa manggagawa (Attitude towards co-workers)',
                        'description' => 'Nagpapakita ng tama at magandang asal sa mga katrabaho sa loob at labas ng kumpanya nakakataas man o kapwa nya manggagawa.',
                    ],
                    [
                        'category' => 'Quality of work',
                        'question_text' => 'Kalidad ng trabaho (Quality of work)',
                        'description' => 'Ang bawat gawaing inatas at may kinalaman sa trabaho ay may magandang resulta at pasok sa kalidad na kailangan ng kumpanya at kliyente.',
                    ],
                    [
                        'category' => 'Initiative',
                        'question_text' => 'Pagkukusa (Initiative)',
                        'description' => 'May sariling kusa sa gawain na kailangan sa trabaho at ng kumpanya na hindi kailangan utusan at subaybayan ng mga nakakataas.',
                    ],
                    [
                        'category' => 'Teamwork',
                        'question_text' => 'Pagtutulungan ng magkasama (Teamwork)',
                        'description' => 'Paggawa sa trabaho ng sama-sama at tulung-tulong na hindi nagsisisiilbing pabigat sa ibang kasamahan, at ito ay nagreresulta ng madami at magandang gawa at gawi na produkto.',
                    ],
                    [
                        'category' => 'Trustworthy and Reliable',
                        'question_text' => 'Mapagkakatiwalaan at Maaasahan (Trustworthy and Reliable)',
                        'description' => 'Ang empleyadong ito ay may tamang pag-uugali kahit hindi man ito binabantayan, may abilidad na iwanan at ihabilin ang mga gawain ng walang pagdududa.',
                    ],
                ];

                foreach ($questions as $index => $q) {
                    EvaluationQuestion::create([
                        'evaluation_form_id' => $defaultForm->id,
                        'category' => $q['category'],
                        'question_text' => $q['question_text'],
                        'description' => $q['description'],
                        'order' => $index + 1,
                    ]);
                }

                // Ensure default remains the preferred active if none existed
            }
        } catch (\Throwable $e) {
            // ignore creation failure and continue listing
        }

        return EvaluationForm::with(['questions', 'evaluations'])
            ->latest()
            ->get()
            ->map(function ($form) {
                return [
                    'id' => $form->id,
                    'title' => $form->title,
                    'description' => $form->description,
                    'status' => $form->status,
                    'questions_count' => $form->questions->count(),
                    'evaluations_count' => $form->evaluations->count(),
                    'created_at' => $form->created_at,
                    'updated_at' => $form->updated_at,
                    'questions' => $form->questions->map(function ($question) {
                        return [
                            'id' => $question->id,
                            'category' => $question->category,
                            'question_text' => $question->question_text,
                            'description' => $question->description,
                            'order' => $question->order,
                        ];
                    }),
                ];
            });
    }

    // Store new evaluation form
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive',
            'questions' => 'required|array|min:1',
            'questions.*.category' => 'required|string|max:255',
            'questions.*.question_text' => 'required|string',
            'questions.*.description' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            // Decide status: if an Active form already exists, force new form to be Inactive
            $statusToUse = $request->status;
            $hasActive = EvaluationForm::where('status', 'Active')->exists();
            if ($statusToUse === 'Active' && $hasActive) {
                $statusToUse = 'Inactive';
            }


            // Create evaluation form
            $evaluationForm = EvaluationForm::create([
                'hr_staff_id' => auth()->id(),
                'title' => $request->title,
                'description' => $request->description,
                'status' => $statusToUse,
            ]);

            // Create questions
            foreach ($request->questions as $index => $questionData) {
                EvaluationQuestion::create([
                    'evaluation_form_id' => $evaluationForm->id,
                    'category' => $questionData['category'],
                    'question_text' => $questionData['question_text'],
                    'description' => $questionData['description'] ?? '',
                    'order' => $index + 1,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Evaluation form created successfully.',
                'data' => $evaluationForm->load('questions')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create evaluation form.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Get specific evaluation form with questions
    public function show($id)
    {
        $evaluationForm = EvaluationForm::with('questions')->findOrFail($id);
        
        return response()->json([
            'id' => $evaluationForm->id,
            'title' => $evaluationForm->title,
            'description' => $evaluationForm->description,
            'status' => $evaluationForm->status,
            'created_at' => $evaluationForm->created_at,
            'questions' => $evaluationForm->questions->map(function ($question) {
                return [
                    'id' => $question->id,
                    'category' => $question->category,
                    'question_text' => $question->question_text,
                    'description' => $question->description,
                    'order' => $question->order,
                ];
            }),
        ]);
    }

    // Update evaluation form
    public function update(Request $request, $id)
    {
        $evaluationForm = EvaluationForm::findOrFail($id);

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:Active,Inactive',
            'questions' => 'required|array|min:1',
            'questions.*.id' => 'nullable|exists:evaluation_questions,id',
            'questions.*.category' => 'required|string|max:255',
            'questions.*.question_text' => 'required|string',
            'questions.*.description' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            // If setting this form Active, deactivate others first
            if ($request->status === 'Active') {
                EvaluationForm::where('id', '!=', $evaluationForm->id)
                    ->where('status', 'Active')
                    ->update(['status' => 'Inactive']);
            }

            // Update evaluation form
            $evaluationForm->update([
                'title' => $request->title,
                'description' => $request->description,
                'status' => $request->status,
            ]);

            // Get existing question IDs
            $existingQuestionIds = $evaluationForm->questions->pluck('id')->toArray();
            $updatedQuestionIds = [];

            // Update or create questions
            foreach ($request->questions as $index => $questionData) {
                if (isset($questionData['id']) && $questionData['id']) {
                    // Update existing question
                    $question = EvaluationQuestion::find($questionData['id']);
                    if ($question && $question->evaluation_form_id == $evaluationForm->id) {
                        $question->update([
                            'category' => $questionData['category'],
                            'question_text' => $questionData['question_text'],
                            'description' => $questionData['description'] ?? '',
                            'order' => $index + 1,
                        ]);
                        $updatedQuestionIds[] = $question->id;
                    }
                } else {
                    // Create new question
                    $newQuestion = EvaluationQuestion::create([
                        'evaluation_form_id' => $evaluationForm->id,
                        'category' => $questionData['category'],
                        'question_text' => $questionData['question_text'],
                        'description' => $questionData['description'] ?? '',
                        'order' => $index + 1,
                    ]);
                    $updatedQuestionIds[] = $newQuestion->id;
                }
            }

            // Delete questions that were removed
            $questionsToDelete = array_diff($existingQuestionIds, $updatedQuestionIds);
            if (!empty($questionsToDelete)) {
                EvaluationQuestion::whereIn('id', $questionsToDelete)->delete();
            }

            DB::commit();

            return response()->json([
                'message' => 'Evaluation form updated successfully.',
                'data' => $evaluationForm->load('questions')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update evaluation form.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Delete evaluation form
    public function destroy($id)
    {
        try {
            $evaluationForm = EvaluationForm::findOrFail($id);
            
            // Allow deleting even if used; evaluations will be preserved with null form reference

            $evaluationForm->delete();

            return response()->json([
                'message' => 'Evaluation form deleted successfully.'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete evaluation form.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Toggle evaluation form status (Active/Inactive)
    public function toggleStatus($id)
    {
        try {
            $evaluationForm = EvaluationForm::findOrFail($id);
            $newStatus = $evaluationForm->status === 'Active' ? 'Inactive' : 'Active';
            
            if ($newStatus === 'Active') {
                // Deactivate all other active forms
                EvaluationForm::where('id', '!=', $evaluationForm->id)
                    ->where('status', 'Active')
                    ->update(['status' => 'Inactive']);
            }

            $evaluationForm->update(['status' => $newStatus]);

            return response()->json([
                'message' => "Evaluation form {$newStatus} successfully.",
                'status' => $newStatus
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update evaluation form status.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Duplicate/Reuse evaluation form
    public function duplicate($id)
    {
        try {
            DB::beginTransaction();

            $originalForm = EvaluationForm::with('questions')->findOrFail($id);
            
            // Create new form with copied data
            $newForm = EvaluationForm::create([
                'hr_staff_id' => auth()->id(),
                'title' => $originalForm->title . ' (Copy)',
                'description' => $originalForm->description,
                'status' => 'Inactive', // Set as inactive by default
            ]);

            // Copy questions
            foreach ($originalForm->questions as $question) {
                EvaluationQuestion::create([
                    'evaluation_form_id' => $newForm->id,
                    'category' => $question->category,
                    'question_text' => $question->question_text,
                    'description' => $question->description,
                    'order' => $question->order,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Evaluation form duplicated successfully.',
                'data' => $newForm->load('questions')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to duplicate evaluation form.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Get active evaluation forms for managers
    public function getActiveForms()
    {
        return EvaluationForm::with('questions')
            ->where('status', 'Active')
            ->latest()
            ->get();
    }
}