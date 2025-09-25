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

            // Create evaluation form
            $evaluationForm = EvaluationForm::create([
                'hr_staff_id' => auth()->id(),
                'title' => $request->title,
                'description' => $request->description,
                'status' => $request->status,
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
            
            // Check if form has been used in evaluations
            if ($evaluationForm->evaluations()->exists()) {
                return response()->json([
                    'message' => 'Cannot delete evaluation form that has been used for evaluations.'
                ], 422);
            }

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