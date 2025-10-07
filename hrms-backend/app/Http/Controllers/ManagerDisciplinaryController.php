<?php

namespace App\Http\Controllers;

use App\Models\DisciplinaryCategory;
use App\Models\DisciplinaryReport;
use App\Models\DisciplinaryAction;
use App\Models\EmployeeProfile;
use App\Notifications\DisciplinaryReportSubmitted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ManagerDisciplinaryController extends Controller
{
    // Middleware is applied in routes/api.php
    // No constructor needed as middleware is handled at route level
    
    // Disciplinary Categories Management
    public function getCategories()
    {
        $categories = DisciplinaryCategory::where('is_active', true)
                                          ->orderBy('name')
                                          ->get();
        
        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }
    
    public function createCategory(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:disciplinary_categories',
            'description' => 'nullable|string',
            'severity_level' => 'required|in:minor,major,severe',
            'suggested_actions' => 'nullable|array'
        ]);
        
        $category = DisciplinaryCategory::create($request->all());
        
        return response()->json([
            'success' => true,
            'message' => 'Disciplinary category created successfully',
            'data' => $category
        ], 201);
    }
    
    public function updateCategory(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:disciplinary_categories,name,' . $id,
            'description' => 'nullable|string',
            'severity_level' => 'required|in:minor,major,severe',
            'suggested_actions' => 'nullable|array',
            'is_active' => 'boolean'
        ]);
        
        $category = DisciplinaryCategory::findOrFail($id);
        $category->update($request->all());
        
        return response()->json([
            'success' => true,
            'message' => 'Disciplinary category updated successfully',
            'data' => $category
        ]);
    }
    
    public function deleteCategory($id)
    {
        $category = DisciplinaryCategory::findOrFail($id);
        
        // Check if category is being used
        if ($category->disciplinaryReports()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category that is being used in reports'
            ], 400);
        }
        
        $category->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Disciplinary category deleted successfully'
        ]);
    }
    
    // Disciplinary Reports Management
    public function getReports(Request $request)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $query = DisciplinaryReport::with([
            'employee', 
            'disciplinaryCategory', 
            'reviewedBy', 
            'disciplinaryActions' // Load actions to compute overall status
        ])->where('reporter_id', $currentEmployee->id);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->priority) {
            $query->where('priority', $request->priority);
        }
        
        $reports = $query->orderBy('created_at', 'desc')->paginate(15);
        
        // Append repeated violation data for each report
        $reports->getCollection()->each(function ($report) {
            $report->append([
                'previous_violations', 
                'violation_count', 
                'is_repeat_violation',
                'violation_ordinal'
            ]);
        });
        
        return response()->json([
            'success' => true,
            'data' => $reports
        ]);
    }
    
    public function createReport(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employee_profiles,id',
            'disciplinary_category_id' => 'required|exists:disciplinary_categories,id',
            'incident_date' => 'required|date|before_or_equal:today',
            'incident_description' => 'required|string',
            'evidence' => 'nullable|string',
            'witnesses' => 'nullable|array',
            'witnesses.*.name' => 'string',
            'witnesses.*.contact' => 'nullable|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'location' => 'nullable|string|max:255',
            'immediate_action_taken' => 'nullable|string|max:500'
        ]);
        
        $currentEmployee = Auth::user()->employeeProfile;
        
        $report = DisciplinaryReport::create([
            'reporter_id' => $currentEmployee->id,
            'employee_id' => $request->employee_id,
            'disciplinary_category_id' => $request->disciplinary_category_id,
            'incident_date' => $request->incident_date,
            'incident_description' => $request->incident_description,
            'evidence' => $request->evidence,
            'witnesses' => $request->witnesses,
            'priority' => $request->priority,
            'location' => $request->location,
            'immediate_action_taken' => $request->immediate_action_taken,
            'status' => 'reported'
        ]);
        
        // Load relationships for notification
        $report->load(['employee', 'disciplinaryCategory']);
        
        // Notify HR Staff only (Disciplinary Actions are HR Staff's responsibility)
        $hrStaff = EmployeeProfile::whereHas('user.role', function($query) {
            $query->where('name', 'HR Staff');
        })->get();
        
        foreach ($hrStaff as $staff) {
            $staff->user->notify(new DisciplinaryReportSubmitted($report));
        }

        // Notify managers in the same department
        try {
            $department = $report->employee->department ?? 'Not Specified';
            
            $managers = \App\Models\User::whereHas('role', function($query) {
                $query->where('name', 'Manager');
            })->whereHas('employeeProfile', function($query) use ($department) {
                $query->where('department', $department);
            })->get();

            // If no managers in same department, get all managers
            if ($managers->isEmpty()) {
                $managers = \App\Models\User::whereHas('role', function($query) {
                    $query->where('name', 'Manager');
                })->get();
            }

            foreach ($managers as $manager) {
                $manager->notify(new \App\Notifications\DisciplinaryReportSubmittedToManager($report));
            }

            \Log::info('Disciplinary report submission notifications sent to managers', [
                'report_id' => $report->id,
                'employee_id' => $report->employee_id,
                'department' => $department,
                'managers_notified' => $managers->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to send disciplinary report notifications to managers', [
                'report_id' => $report->id,
                'error' => $e->getMessage()
            ]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Disciplinary report submitted successfully',
            'data' => $report->load(['employee', 'disciplinaryCategory'])
        ], 201);
    }
    
    public function getReport($id)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $report = DisciplinaryReport::with([
            'employee', 'disciplinaryCategory', 'reviewedBy', 
            'disciplinaryActions.investigator', 'disciplinaryActions.issuedBy'
        ])->where('reporter_id', $currentEmployee->id)
          ->findOrFail($id);
        
        // Append repeated violation data
        $report->append([
            'previous_violations', 
            'violation_count', 
            'is_repeat_violation',
            'violation_ordinal'
        ]);
        
        return response()->json([
            'success' => true,
            'data' => $report
        ]);
    }
    
    public function updateReport(Request $request, $id)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $report = DisciplinaryReport::where('reporter_id', $currentEmployee->id)
                    ->findOrFail($id);
        
        if (!$report->canBeEdited()) {
            return response()->json([
                'success' => false,
                'message' => 'This report cannot be edited in its current status'
            ], 400);
        }
        
        $request->validate([
            'incident_date' => 'sometimes|date|before_or_equal:today',
            'incident_description' => 'sometimes|string',
            'evidence' => 'nullable|string',
            'witnesses' => 'nullable|array',
            'priority' => 'sometimes|in:low,medium,high,urgent'
        ]);
        
        $report->update($request->only([
            'incident_date', 'incident_description', 'evidence', 'witnesses', 'priority'
        ]));
        
        return response()->json([
            'success' => true,
            'message' => 'Report updated successfully',
            'data' => $report->load(['employee', 'disciplinaryCategory'])
        ]);
    }
    
    // Investigation Management
    public function getAssignedInvestigations(Request $request)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $query = DisciplinaryAction::with([
            'employee', 
            'disciplinaryReport.disciplinaryCategory', 
            'disciplinaryReport.employee',
            'issuedBy'
        ])->where('investigator_id', $currentEmployee->id);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        $investigations = $query->orderBy('created_at', 'desc')->paginate(15);
        
        // Append repeated violation data for each investigation
        $investigations->getCollection()->each(function ($investigation) {
            $investigation->append([
                'previous_violations', 
                'violation_count', 
                'is_repeat_violation',
                'violation_ordinal',
                'violation_warning_message'
            ]);
        });
        
        return response()->json([
            'success' => true,
            'data' => $investigations
        ]);
    }
    
    public function getInvestigation($id)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $investigation = DisciplinaryAction::with([
            'employee', 
            'disciplinaryReport.disciplinaryCategory', 
            'disciplinaryReport.employee',
            'issuedBy'
        ])->where('investigator_id', $currentEmployee->id)
          ->findOrFail($id);
        
        // Append repeated violation data
        $investigation->append([
            'previous_violations', 
            'violation_count', 
            'is_repeat_violation',
            'violation_ordinal',
            'violation_warning_message'
        ]);
        
        return response()->json([
            'success' => true,
            'data' => $investigation
        ]);
    }
    
    public function submitInvestigation(Request $request, $id)
    {
        $currentEmployee = Auth::user()->employeeProfile;
        
        $action = DisciplinaryAction::where('investigator_id', $currentEmployee->id)
                    ->findOrFail($id);
        
        if (!$action->canInvestigate()) {
            return response()->json([
                'success' => false,
                'message' => 'Investigation cannot be submitted for this action'
            ], 400);
        }
        
        $request->validate([
            'investigation_notes' => 'required|string',
            'findings' => 'required|string',
            'recommendation' => 'nullable|string|max:1000'
        ]);
        
        try {
            \DB::beginTransaction();
            
            $action->completeInvestigation(
                $request->investigation_notes, 
                $request->investigation_findings ?? $request->findings, 
                $request->recommendation
            );
            
            // Note: The disciplinary report's overall_status is computed dynamically
            // based on the action status, so we don't need to update it manually
            
            \DB::commit();
            
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Investigation submission failed', [
                'action_id' => $action->id,
                'investigator_id' => $currentEmployee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit investigation. Error: ' . $e->getMessage()
            ], 500);
        }
        
        // Notify HR staff that investigation is complete
        $hrStaff = EmployeeProfile::whereHas('user.role', function($query) {
            $query->whereIn('name', ['HR Assistant', 'HR Staff']);
        })->get();
        
        foreach ($hrStaff as $staff) {
            // You can create an InvestigationCompleted notification here
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Investigation completed successfully',
            'data' => $action->load(['employee', 'disciplinaryReport'])
        ]);
    }
    
    // Get employees for reporting
    public function getEmployees(Request $request)
    {
        $query = EmployeeProfile::with('user')
            ->whereHas('user.role', function($q) {
                $q->where('name', 'employee');
            });
        
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('employee_id', 'like', "%{$search}%");
            });
        }
        
        $employees = $query->orderBy('first_name')->get();
        
        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }
    
    // Check for previous violations for an employee and category
    public function checkPreviousViolations(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employee_profiles,id',
            'disciplinary_category_id' => 'required|exists:disciplinary_categories,id'
        ]);
        
        $previousViolations = DisciplinaryReport::with([
            'disciplinaryCategory', 
            'disciplinaryActions'
        ])
        ->where('employee_id', $request->employee_id)
        ->where('disciplinary_category_id', $request->disciplinary_category_id)
        ->where('status', '!=', 'dismissed')
        ->orderBy('created_at', 'desc')
        ->get();
        
        $violationCount = $previousViolations->count();
        $ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
        $nextOrdinal = $ordinals[$violationCount + 1] ?? ($violationCount + 1) . 'th';
        
        return response()->json([
            'success' => true,
            'data' => [
                'previous_violations' => $previousViolations,
                'violation_count' => $violationCount,
                'is_repeat_violation' => $violationCount > 0,
                'next_violation_ordinal' => $nextOrdinal,
                'warning_message' => $violationCount > 0 
                    ? "This will be the {$nextOrdinal} violation for this employee in this category."
                    : null
            ]
        ]);
    }
}
