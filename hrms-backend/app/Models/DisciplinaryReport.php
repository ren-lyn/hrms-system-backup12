<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DisciplinaryReport extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'reporter_id',
        'employee_id',
        'disciplinary_category_id',
        'report_number',
        'incident_date',
        'incident_description',
        'evidence',
        'witnesses',
        'priority',
        'status',
        'location',
        'immediate_action_taken',
        'hr_notes',
        'reviewed_at',
        'reviewed_by'
    ];
    
    protected $casts = [
        'incident_date' => 'date',
        'witnesses' => 'array',
        'reviewed_at' => 'datetime'
    ];
    
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($report) {
            if (!$report->report_number) {
                $report->report_number = 'DR-' . date('Y') . '-' . str_pad(static::whereYear('created_at', date('Y'))->count() + 1, 4, '0', STR_PAD_LEFT);
            }
        });
    }
    
    // Relationships
    public function reporter()
    {
        return $this->belongsTo(EmployeeProfile::class, 'reporter_id');
    }
    
    public function employee()
    {
        return $this->belongsTo(EmployeeProfile::class, 'employee_id');
    }
    
    public function disciplinaryCategory()
    {
        return $this->belongsTo(DisciplinaryCategory::class);
    }
    
    public function reviewedBy()
    {
        return $this->belongsTo(EmployeeProfile::class, 'reviewed_by');
    }
    
    public function disciplinaryActions()
    {
        return $this->hasMany(DisciplinaryAction::class);
    }
    
    // Scopes
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }
    
    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }
    
    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }
    
    public function scopeByReporter($query, $reporterId)
    {
        return $query->where('reporter_id', $reporterId);
    }
    
    public function scopeRecentReports($query, $days = 30)
    {
        return $query->where('created_at', '>=', Carbon::now()->subDays($days));
    }
    
    // Helper methods
    public function isReviewed()
    {
        return !is_null($this->reviewed_at);
    }
    
    public function canBeEdited()
    {
        return in_array($this->status, ['reported', 'under_review']);
    }
    
    public function markAsReviewed($reviewerId)
    {
        $this->update([
            'reviewed_at' => now(),
            'reviewed_by' => $reviewerId,
            'status' => 'under_review'
        ]);
    }
    
    /**
     * Get the overall status based on associated disciplinary actions
     * This provides a more accurate status than the static report status
     */
    public function getOverallStatusAttribute()
    {
        // If no actions issued yet, return the report status
        if ($this->disciplinaryActions->isEmpty()) {
            return $this->status;
        }
        
        // Get the most advanced action status
        $actions = $this->disciplinaryActions;
        
        // Check if any action is completed (has verdict)
        if ($actions->where('verdict', '!=', null)->isNotEmpty()) {
            return 'completed';
        }
        
        // Check if any action is awaiting verdict
        if ($actions->where('status', 'awaiting_verdict')->isNotEmpty()) {
            return 'awaiting_verdict';
        }
        
        // Check if any action is under investigation
        if ($actions->where('status', 'under_investigation')->isNotEmpty() || 
            $actions->where('investigation_notes', '!=', null)->isNotEmpty()) {
            return 'under_investigation';
        }
        
        // Check if any action has explanation submitted
        if ($actions->where('status', 'explanation_submitted')->isNotEmpty() || 
            $actions->where('employee_explanation', '!=', null)->isNotEmpty()) {
            return 'explanation_submitted';
        }
        
        // Check if any action is waiting for explanation
        if ($actions->where('status', 'explanation_requested')->isNotEmpty()) {
            return 'explanation_requested';
        }
        
        // Default to action_issued if actions exist
        return 'action_issued';
    }
    
    /**
     * Get a detailed status description for display
     */
    public function getStatusDescriptionAttribute()
    {
        $overallStatus = $this->overall_status;
        
        switch ($overallStatus) {
            case 'reported':
                return 'Reported - Awaiting HR Review';
            case 'under_review':
                return 'Under Review by HR';
            case 'action_issued':
                return 'Disciplinary Action Issued';
            case 'explanation_requested':
                return 'Employee Explanation Requested';
            case 'explanation_submitted':
                return 'Employee Explanation Submitted';
            case 'under_investigation':
                return 'Under Investigation';
            case 'awaiting_verdict':
                return 'Awaiting HR Verdict';
            case 'completed':
                return 'Case Completed with Verdict';
            case 'dismissed':
                return 'Case Dismissed';
            default:
                return ucfirst(str_replace('_', ' ', $overallStatus));
        }
    }
    
    /**
     * Get progress percentage for the disciplinary process
     */
    public function getProgressPercentageAttribute()
    {
        $status = $this->overall_status;
        
        $progressMap = [
            'reported' => 10,
            'under_review' => 20,
            'action_issued' => 30,
            'explanation_requested' => 40,
            'explanation_submitted' => 60,
            'under_investigation' => 70,
            'awaiting_verdict' => 85,
            'completed' => 100,
            'dismissed' => 100
        ];
        
        return $progressMap[$status] ?? 0;
    }
    
    /**
     * Get previous violations for the same employee and category
     */
    public function getPreviousViolationsAttribute()
    {
        return static::where('employee_id', $this->employee_id)
            ->where('disciplinary_category_id', $this->disciplinary_category_id)
            ->where('id', '!=', $this->id)
            ->where('status', '!=', 'dismissed')
            ->orderBy('created_at', 'desc')
            ->get();
    }
    
    /**
     * Get violation count for this employee and category
     */
    public function getViolationCountAttribute()
    {
        return static::where('employee_id', $this->employee_id)
            ->where('disciplinary_category_id', $this->disciplinary_category_id)
            ->where('status', '!=', 'dismissed')
            ->count();
    }
    
    /**
     * Check if this is a repeat violation
     */
    public function getIsRepeatViolationAttribute()
    {
        return $this->violation_count > 1;
    }
    
    /**
     * Get ordinal number for this violation (1st, 2nd, 3rd, etc.)
     */
    public function getViolationOrdinalAttribute()
    {
        $count = static::where('employee_id', $this->employee_id)
            ->where('disciplinary_category_id', $this->disciplinary_category_id)
            ->where('created_at', '<=', $this->created_at)
            ->where('status', '!=', 'dismissed')
            ->count();
            
        $ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
        return $ordinals[$count] ?? $count . 'th';
    }
}
