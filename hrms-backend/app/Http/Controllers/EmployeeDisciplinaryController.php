<?php

namespace App\Http\Controllers;

use App\Models\DisciplinaryAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EmployeeDisciplinaryController extends Controller
{
    // Middleware is applied in routes/api.php
    // No constructor needed as middleware is handled at route level
    
    // Get disciplinary actions for the current employee
    public function getMyActions(Request $request)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $query = DisciplinaryAction::with([
            'disciplinaryReport.disciplinaryCategory',
            'disciplinaryReport.reporter',
            'disciplinaryReport.employee',
            'investigator',
            'issuedBy'
        ])->where('employee_id', $currentEmployee->id);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        $actions = $query->orderBy('created_at', 'desc')->get();
        
        // Append repeated violation data for each action
        $actions->each(function ($action) {
            $action->append([
                'previous_violations', 
                'violation_count', 
                'is_repeat_violation',
                'violation_ordinal',
                'violation_warning_message'
            ]);
        });
        
        return response()->json([
            'success' => true,
            'data' => $actions
        ]);
    }
    
    // Get single disciplinary action details
    public function getAction($id)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $action = DisciplinaryAction::with([
            'disciplinaryReport.disciplinaryCategory',
            'disciplinaryReport.reporter',
            'disciplinaryReport.employee',
            'investigator',
            'issuedBy'
        ])->where('employee_id', $currentEmployee->id)
          ->findOrFail($id);
        
        // Append repeated violation data
        $action->append([
            'previous_violations', 
            'violation_count', 
            'is_repeat_violation',
            'violation_ordinal',
            'violation_warning_message'
        ]);
        
        return response()->json([
            'success' => true,
            'data' => $action
        ]);
    }
    
    // Submit explanation for disciplinary action
    public function submitExplanation(Request $request, $id)
    {
        try {
            $currentEmployee = Auth::user()->employeeProfile;
            
            if (!$currentEmployee) {
                \Log::error('Employee profile not found', ['user_id' => Auth::id()]);
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found'
                ], 400);
            }
            
            $action = DisciplinaryAction::where('employee_id', $currentEmployee->id)
                        ->findOrFail($id);
            
            \Log::info('Attempting explanation submission', [
                'action_id' => $action->id,
                'employee_id' => $currentEmployee->id,
                'current_status' => $action->status,
                'has_explanation' => !empty($action->employee_explanation),
                'can_submit' => $action->canSubmitExplanation()
            ]);
            
            if (!$action->canSubmitExplanation()) {
                $reason = $this->getExplanationBlockReason($action);
                \Log::warning('Explanation submission blocked', [
                    'action_id' => $action->id,
                    'reason' => $reason,
                    'status' => $action->status,
                    'has_explanation' => !empty($action->employee_explanation)
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot submit explanation: ' . $reason
                ], 400);
            }
            
            $request->validate([
                'explanation' => 'required|string|min:10'
            ]);
            
            // Use database transaction for atomic operations
            \DB::beginTransaction();
            
            $action->submitExplanation($request->explanation);
            
            // Note: The disciplinary report's overall_status is computed dynamically
            // based on the action status, so we don't need to update it manually
            
            \DB::commit();
            
            \Log::info('Explanation submitted successfully', [
                'action_id' => $action->id,
                'employee_id' => $currentEmployee->id
            ]);
            
            // Notify HR and investigator that explanation has been submitted
            // You can add notifications here
            
            return response()->json([
                'success' => true,
                'message' => 'Explanation submitted successfully',
                'data' => $action->fresh()->load(['disciplinaryReport', 'investigator'])
            ]);
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            \DB::rollBack();
            \Log::warning('Explanation validation failed', [
                'action_id' => $id,
                'errors' => $e->errors()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Explanation submission failed', [
                'action_id' => $id,
                'employee_id' => $currentEmployee->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit explanation: ' . $e->getMessage()
            ], 500);
        }
    }
    
    // Get dashboard statistics for employee
    public function getDashboardStats()
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $stats = [
            'pending_explanations' => DisciplinaryAction::where('employee_id', $currentEmployee->id)
                ->where('status', 'explanation_requested')
                ->whereNull('employee_explanation')->count(),
            'under_investigation' => DisciplinaryAction::where('employee_id', $currentEmployee->id)
                ->where('status', 'under_investigation')->count(),
            'completed_actions' => DisciplinaryAction::where('employee_id', $currentEmployee->id)
                ->where('status', 'completed')->count(),
            'overdue_explanations' => DisciplinaryAction::where('employee_id', $currentEmployee->id)
                ->where('status', 'explanation_requested')
                ->where('due_date', '<', now())
                ->whereNull('employee_explanation')->count()
        ];
        
        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
    
    /**
     * Get reason why explanation submission is blocked
     */
    private function getExplanationBlockReason($action)
    {
        if ($action->employee_explanation) {
            return 'Explanation has already been submitted';
        }
        
        switch ($action->status) {
            case 'completed':
                return 'Action has already been completed';
            case 'awaiting_verdict':
                return 'Case is awaiting HR verdict';
            default:
                return 'Action status (' . $action->status . ') does not allow explanation submission';
        }
    }
}
