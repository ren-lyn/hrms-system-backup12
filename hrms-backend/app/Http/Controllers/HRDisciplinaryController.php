<?php

namespace App\Http\Controllers;

use App\Models\DisciplinaryReport;
use App\Models\DisciplinaryAction;
use App\Models\DisciplinaryCategory;
use App\Models\EmployeeProfile;
use App\Notifications\DisciplinaryActionIssued;
use App\Notifications\InvestigationAssigned;
use App\Notifications\DisciplinaryVerdictIssued;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class HRDisciplinaryController extends Controller
{
    // Middleware is applied in routes/api.php
    // No constructor needed as middleware is handled at route level
    
    // View all disciplinary reports
    public function getReports(Request $request)
    {
        $query = DisciplinaryReport::with([
            'employee', 
            'disciplinaryCategory', 
            'reporter', 
            'reviewedBy',
            'disciplinaryActions' // Load actions to compute overall status
        ]);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->priority) {
            $query->where('priority', $request->priority);
        }
        
        $reports = $query->orderBy('created_at', 'desc')->paginate(15);
        
        return response()->json([
            'success' => true,
            'data' => $reports
        ]);
    }
    
    // Get single report details
    public function getReport($id)
    {
        $report = DisciplinaryReport::with([
            'employee', 
            'disciplinaryCategory', 
            'reporter', 
            'reviewedBy',
            'disciplinaryActions' => function($query) {
                $query->with(['investigator', 'issuedBy', 'disciplinaryReport.disciplinaryCategory'])
                      ->orderBy('created_at', 'desc');
            }
        ])->findOrFail($id);
        
        // Append repeated violation data for the report
        $report->append([
            'previous_violations', 
            'violation_count', 
            'is_repeat_violation',
            'violation_ordinal'
        ]);
        
        // Append repeated violation data for each action
        $report->disciplinaryActions->each(function ($action) {
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
            'data' => $report
        ]);
    }
    
    // Issue disciplinary action
    public function issueAction(Request $request)
    {
        $request->validate([
            'disciplinary_report_id' => 'required|exists:disciplinary_reports,id',
            'employee_id' => 'required|exists:employee_profiles,id',
            'action_type' => 'required|in:verbal_warning,written_warning,final_warning,suspension,demotion,termination,training,counseling',
            'action_details' => 'required|string',
            'effective_date' => 'required|date|after_or_equal:today',
            'investigator_id' => 'nullable|exists:employee_profiles,id',
            'incident_date' => 'required|date',
            'violation' => 'required|string'
        ]);
        
        $currentEmployee = Auth::user()->employeeProfile;
        
        // Use database transaction for data consistency and performance
        \DB::beginTransaction();
        try {
            // Create action with optimal status based on investigator assignment
            $initialStatus = $request->investigator_id ? 'explanation_requested' : 'explanation_requested';
            $action = DisciplinaryAction::create([
                'disciplinary_report_id' => $request->disciplinary_report_id,
                'employee_id' => $request->employee_id,
                'issued_by' => $currentEmployee->id,
                'investigator_id' => $request->investigator_id,
                'action_type' => $request->action_type,
                'action_details' => $request->action_details,
                'effective_date' => $request->effective_date,
                'incident_date' => $request->incident_date,
                'violation' => $request->violation,
                'status' => $initialStatus,
                'due_date' => now()->addDays(7) // Set explanation due date immediately
            ]);
            
            // Update report status in single query
            DisciplinaryReport::where('id', $request->disciplinary_report_id)
                ->update(['status' => 'action_issued']);
            
            \DB::commit();
            
            // Queue notifications for better performance
            $notificationData = [
                'action_id' => $action->id,
                'employee_id' => $request->employee_id,
                'investigator_id' => $request->investigator_id
            ];
            
            // Dispatch notification job asynchronously
            \App\Jobs\SendDisciplinaryActionNotifications::dispatch($notificationData);
            
            // Load relationships for response
            $action->load([
                'employee:id,first_name,last_name,employee_id',
                'disciplinaryReport:id,report_number,status'
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Disciplinary action issued successfully',
                'data' => $action
            ], 201);
            
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Error issuing disciplinary action', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to issue disciplinary action. Please try again.'
            ], 500);
        }
    }
    
    // Issue verdict
    public function issueVerdict(Request $request, $id)
    {
        $request->validate([
            'verdict' => 'required|in:guilty,not_guilty,partially_guilty,dismissed,uphold,dismiss',
            'verdict_details' => 'nullable|string'
        ]);
        
        $action = DisciplinaryAction::findOrFail($id);
        
        // Validate that all required steps are completed before issuing verdict
        if (!$this->canIssueVerdict($action)) {
            $missingSteps = $this->getMissingSteps($action);
            return response()->json([
                'success' => false,
                'message' => 'Cannot issue verdict yet. Missing required steps: ' . implode(', ', $missingSteps)
            ], 400);
        }
        
        $action->issueVerdict($request->verdict, $request->verdict_details);
        
        // Note: The disciplinary report's overall_status is computed dynamically
        // based on the action status, so we don't need to update it manually
        
        // Notify employee and reporter
        $action->employee->user->notify(new DisciplinaryVerdictIssued($action, 'employee'));
        
        if ($action->disciplinaryReport && $action->disciplinaryReport->reporter) {
            $action->disciplinaryReport->reporter->user->notify(
                new DisciplinaryVerdictIssued($action, 'reporter')
            );
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Verdict issued successfully',
            'data' => $action->load(['employee', 'disciplinaryReport'])
        ]);
    }
    
    /**
     * Check if a verdict can be issued for this action
     */
    private function canIssueVerdict(DisciplinaryAction $action)
    {
        // Action must be in awaiting_verdict status
        if ($action->status !== 'awaiting_verdict') {
            return false;
        }
        
        // Employee explanation should be submitted (if requested)
        if ($action->status === 'explanation_requested' && !$action->employee_explanation) {
            return false;
        }
        
        // Investigation should be completed (if investigator assigned)
        if ($action->investigator_id && !$action->investigation_notes) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get missing steps that prevent verdict issuance
     */
    private function getMissingSteps(DisciplinaryAction $action)
    {
        $missingSteps = [];
        
        if ($action->status !== 'awaiting_verdict') {
            $missingSteps[] = 'Investigation must be completed first';
        }
        
        // Check if employee explanation is pending
        if (in_array($action->status, ['explanation_requested']) && !$action->employee_explanation) {
            $missingSteps[] = 'Employee explanation is required';
        }
        
        // Check if investigation is pending
        if ($action->investigator_id && !$action->investigation_notes) {
            $missingSteps[] = 'Investigation report is required';
        }
        
        return $missingSteps;
    }
    
    // ==== DISCIPLINARY CATEGORIES ADMINISTRATION ====
    
    /**
     * Get all disciplinary categories for administration
     */
    public function getCategories(Request $request)
    {
        \Log::info('HRDisciplinaryController::getCategories called', [
            'request_params' => $request->all(),
            'status_filter' => $request->status,
            'severity_filter' => $request->severity,
            'search_filter' => $request->search,
            'per_page' => $request->per_page
        ]);
        
        $query = DisciplinaryCategory::query();
        
        // Apply status filter
        if ($request->status && $request->status !== 'all') {
            $isActive = $request->status === 'active';
            $query->where('is_active', $isActive);
        }
        
        // Apply severity filter
        if ($request->severity && $request->severity !== 'all') {
            $query->where('severity_level', $request->severity);
        }
        
        // Apply search filter
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        $categories = $query->withCount('disciplinaryReports')
                           ->orderBy('name')
                           ->paginate($request->per_page ?? 100);
        
        \Log::info('HRDisciplinaryController::getCategories result', [
            'categories_count' => $categories->count(),
            'total_records' => $categories->total(),
            'current_page' => $categories->currentPage(),
            'last_page' => $categories->lastPage(),
            'per_page' => $categories->perPage()
        ]);
        
        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }
    
    /**
     * Get single category details
     */
    public function getCategory($id)
    {
        $category = DisciplinaryCategory::withCount('disciplinaryReports')
                                      ->findOrFail($id);
        
        return response()->json([
            'success' => true,
            'data' => $category
        ]);
    }
    
    /**
     * Create new disciplinary category
     */
    public function createCategory(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:disciplinary_categories',
            'description' => 'nullable|string',
            'severity_level' => 'required|in:minor,major,severe',
            'suggested_actions' => 'nullable|array',
            'suggested_actions.*' => 'string|in:verbal_warning,written_warning,final_warning,suspension,demotion,termination,training,counseling,coaching,performance_improvement_plan,safety_training,mandatory_training,mandatory_counseling,legal_action',
            'is_active' => 'boolean'
        ]);
        
        $category = DisciplinaryCategory::create($request->all());
        
        return response()->json([
            'success' => true,
            'message' => 'Disciplinary category created successfully',
            'data' => $category
        ], 201);
    }
    
    /**
     * Update disciplinary category
     */
    public function updateCategory(Request $request, $id)
    {
        $category = DisciplinaryCategory::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255|unique:disciplinary_categories,name,' . $id,
            'description' => 'nullable|string',
            'severity_level' => 'required|in:minor,major,severe',
            'suggested_actions' => 'nullable|array',
            'suggested_actions.*' => 'string|in:verbal_warning,written_warning,final_warning,suspension,demotion,termination,training,counseling,coaching,performance_improvement_plan,safety_training,mandatory_training,mandatory_counseling,legal_action',
            'is_active' => 'boolean'
        ]);
        
        $category->update($request->all());
        
        return response()->json([
            'success' => true,
            'message' => 'Disciplinary category updated successfully',
            'data' => $category
        ]);
    }
    
    /**
     * Delete disciplinary category
     */
    public function deleteCategory($id)
    {
        $category = DisciplinaryCategory::findOrFail($id);
        
        // Check if category is being used in reports
        if ($category->disciplinaryReports()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category that is being used in disciplinary reports. Deactivate it instead.'
            ], 400);
        }
        
        $category->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Disciplinary category deleted successfully'
        ]);
    }
    
    /**
     * Toggle category active status
     */
    public function toggleCategoryStatus($id)
    {
        $category = DisciplinaryCategory::findOrFail($id);
        
        $category->update([
            'is_active' => !$category->is_active
        ]);
        
        $status = $category->is_active ? 'activated' : 'deactivated';
        
        return response()->json([
            'success' => true,
            'message' => "Disciplinary category {$status} successfully",
            'data' => $category
        ]);
    }
    
    // ==== ENHANCED REPORTING FEATURES ====
    
    /**
     * Get all disciplinary reports with enhanced filtering
     */
    public function getAllReports(Request $request)
    {
        \Log::info('HR getAllReports called', [
            'user_id' => auth()->id(),
            'user_role' => auth()->user()?->role?->name,
            'request_params' => $request->all()
        ]);
        
        $query = DisciplinaryReport::with([
            'employee:id,first_name,last_name,employee_id,department,position',
            'disciplinaryCategory:id,name,severity_level',
            'reporter:id,first_name,last_name,employee_id,position',
            'reviewedBy:id,first_name,last_name',
            'disciplinaryActions' => function($query) {
                $query->with([
                    'investigator:id,first_name,last_name,position', 
                    'issuedBy:id,first_name,last_name,position',
                    'disciplinaryReport:id,disciplinary_category_id,incident_description',
                    'disciplinaryReport.disciplinaryCategory:id,name,severity_level'
                ])->orderBy('created_at', 'desc');
            }
        ]);
        
        // Filtering options
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        if ($request->priority && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }
        
        if ($request->severity && $request->severity !== 'all') {
            $query->whereHas('disciplinaryCategory', function($q) use ($request) {
                $q->where('severity_level', $request->severity);
            });
        }
        
        if ($request->department) {
            $query->whereHas('employee', function($q) use ($request) {
                $q->where('department', 'like', "%{$request->department}%");
            });
        }
        
        if ($request->reporter_id) {
            $query->where('reporter_id', $request->reporter_id);
        }
        
        if ($request->date_from) {
            $query->where('incident_date', '>=', $request->date_from);
        }
        
        if ($request->date_to) {
            $query->where('incident_date', '<=', $request->date_to);
        }
        
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('report_number', 'like', "%{$search}%")
                  ->orWhere('incident_description', 'like', "%{$search}%")
                  ->orWhereHas('employee', function($subQ) use ($search) {
                      $subQ->where('first_name', 'like', "%{$search}%")
                           ->orWhere('last_name', 'like', "%{$search}%")
                           ->orWhere('employee_id', 'like', "%{$search}%");
                  });
            });
        }
        
        // Sorting
        $sortBy = $request->sort_by ?? 'created_at';
        $sortOrder = $request->sort_order ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);
        
        $reports = $query->paginate($request->per_page ?? 15);
        
        // Append repeated violation data for each report and their actions
        $reports->getCollection()->each(function ($report) {
            $report->append([
                'previous_violations', 
                'violation_count', 
                'is_repeat_violation',
                'violation_ordinal'
            ]);
            
            // Also append violation data for each disciplinary action
            if ($report->disciplinaryActions) {
                $report->disciplinaryActions->each(function ($action) {
                    $action->append([
                        'previous_violations', 
                        'violation_count', 
                        'is_repeat_violation',
                        'violation_ordinal',
                        'violation_warning_message'
                    ]);
                });
            }
        });
        
        \Log::info('HR getAllReports results', [
            'total_reports' => $reports->total(),
            'current_page_count' => $reports->count(),
            'first_report_id' => $reports->count() > 0 ? $reports->first()->id : null
        ]);
        
        return response()->json([
            'success' => true,
            'data' => $reports
        ]);
    }
    
    /**
     * Get report statistics for dashboard
     */
    public function getReportStatistics()
    {
        $stats = [
            // Status breakdown
            'by_status' => [
                'reported' => DisciplinaryReport::where('status', 'reported')->count(),
                'under_review' => DisciplinaryReport::where('status', 'under_review')->count(),
                'action_issued' => DisciplinaryReport::where('status', 'action_issued')->count(),
                'completed' => DisciplinaryReport::where('status', 'completed')->count(),
                'dismissed' => DisciplinaryReport::where('status', 'dismissed')->count(),
            ],
            
            // Priority breakdown
            'by_priority' => [
                'low' => DisciplinaryReport::where('priority', 'low')->count(),
                'medium' => DisciplinaryReport::where('priority', 'medium')->count(),
                'high' => DisciplinaryReport::where('priority', 'high')->count(),
                'urgent' => DisciplinaryReport::where('priority', 'urgent')->count(),
            ],
            
            // Severity breakdown
            'by_severity' => DisciplinaryReport::join('disciplinary_categories', 'disciplinary_reports.disciplinary_category_id', '=', 'disciplinary_categories.id')
                ->selectRaw('disciplinary_categories.severity_level, COUNT(*) as count')
                ->groupBy('disciplinary_categories.severity_level')
                ->pluck('count', 'severity_level')
                ->toArray(),
                
            // Monthly trends (last 12 months)
            'monthly_trends' => DisciplinaryReport::selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count')
                ->where('created_at', '>=', now()->subMonths(12))
                ->groupBy('year', 'month')
                ->orderBy('year')
                ->orderBy('month')
                ->get(),
                
            // Top categories
            'top_categories' => DisciplinaryReport::join('disciplinary_categories', 'disciplinary_reports.disciplinary_category_id', '=', 'disciplinary_categories.id')
                ->selectRaw('disciplinary_categories.name, COUNT(*) as count')
                ->groupBy('disciplinary_categories.id', 'disciplinary_categories.name')
                ->orderByDesc('count')
                ->limit(5)
                ->get(),
                
            // Recent activity
            'recent_reports' => DisciplinaryReport::with(['employee:id,first_name,last_name,employee_id', 'disciplinaryCategory:id,name'])
                ->latest()
                ->limit(5)
                ->get(),
                
            // Totals
            'total_reports' => DisciplinaryReport::count(),
            'reports_this_month' => DisciplinaryReport::whereMonth('created_at', now()->month)->count(),
            'pending_reviews' => DisciplinaryReport::whereIn('status', ['reported', 'under_review'])->count(),
        ];
        
        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
    
    /**
     * Mark report as reviewed by HR
     */
    public function markReportAsReviewed(Request $request, $id)
    {
        $report = DisciplinaryReport::findOrFail($id);
        $currentEmployee = Auth::user()->employeeProfile;
        
        $request->validate([
            'hr_notes' => 'nullable|string|max:1000'
        ]);
        
        $report->update([
            'status' => 'under_review',
            'reviewed_at' => now(),
            'reviewed_by' => $currentEmployee->id,
            'hr_notes' => $request->hr_notes
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Report marked as reviewed successfully',
            'data' => $report->load(['employee', 'disciplinaryCategory', 'reviewedBy'])
        ]);
    }
    
    /**
     * Get available managers for investigation assignment
     */
    public function getAvailableInvestigators()
    {
        $managers = EmployeeProfile::with('user:id,first_name,last_name,email')
            ->whereHas('user.role', function($q) {
                $q->where('name', 'manager');
            })
            ->select('id', 'user_id', 'first_name', 'last_name', 'employee_id', 'department', 'position')
            ->orderBy('first_name')
            ->get();
        
        return response()->json([
            'success' => true,
            'data' => $managers
        ]);
    }
    
    /**
     * Get all disciplinary actions for HR overview
     */
    public function getAllActions(Request $request)
    {
        $query = DisciplinaryAction::with([
            'employee:id,first_name,last_name,employee_id,department',
            'disciplinaryReport:id,disciplinary_category_id,report_number,status,employee_id',
            'disciplinaryReport.disciplinaryCategory:id,name,severity_level',
            'disciplinaryReport.employee:id,first_name,last_name,employee_id',
            'investigator:id,first_name,last_name,employee_id',
            'issuedBy:id,first_name,last_name'
        ]);
        
        if ($request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        if ($request->action_type && $request->action_type !== 'all') {
            $query->where('action_type', $request->action_type);
        }
        
        if ($request->severity && $request->severity !== 'all') {
            $query->whereHas('disciplinaryReport.disciplinaryCategory', function($q) use ($request) {
                $q->where('severity_level', $request->severity);
            });
        }
        
        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }
        
        $actions = $query->orderBy('created_at', 'desc')
                        ->paginate($request->per_page ?? 15);
        
        // Append repeated violation data for each action
        $actions->getCollection()->each(function ($action) {
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
}
