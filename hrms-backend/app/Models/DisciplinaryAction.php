<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class DisciplinaryAction extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'employee_id',
        'incident_date',
        'violation',
        'explanation',
        'status',
        'disciplinary_report_id',
        'investigator_id',
        'issued_by',
        'action_number',
        'action_type',
        'action_details',
        'employee_explanation',
        'investigation_notes',
        'investigation_findings',
        'investigation_recommendation',
        'verdict_details',
        'verdict',
        'effective_date',
        'due_date',
        'explanation_submitted_at',
        'investigation_completed_at',
        'verdict_issued_at'
    ];
    
    protected $casts = [
        'incident_date' => 'date',
        'effective_date' => 'date',
        'due_date' => 'date',
        'explanation_submitted_at' => 'datetime',
        'investigation_completed_at' => 'datetime',
        'verdict_issued_at' => 'datetime'
    ];
    
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($action) {
            if (!$action->action_number) {
                $action->action_number = 'DA-' . date('Y') . '-' . str_pad(static::whereYear('created_at', date('Y'))->count() + 1, 4, '0', STR_PAD_LEFT);
            }
        });
    }
    
    // Relationships
    public function employee()
    {
        return $this->belongsTo(EmployeeProfile::class, 'employee_id');
    }
    
    public function disciplinaryReport()
    {
        return $this->belongsTo(DisciplinaryReport::class);
    }
    
    public function investigator()
    {
        return $this->belongsTo(EmployeeProfile::class, 'investigator_id');
    }
    
    public function issuedBy()
    {
        return $this->belongsTo(EmployeeProfile::class, 'issued_by');
    }
    
    // Scopes
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }
    
    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }
    
    public function scopeForInvestigator($query, $investigatorId)
    {
        return $query->where('investigator_id', $investigatorId);
    }
    
    public function scopePendingExplanation($query)
    {
        return $query->where('status', 'explanation_requested')
                    ->whereNull('employee_explanation');
    }
    
    public function scopePendingInvestigation($query)
    {
        return $query->where('status', 'under_investigation')
                    ->whereNull('investigation_notes');
    }
    
    public function scopeAwaitingVerdict($query)
    {
        return $query->where('status', 'awaiting_verdict')
                    ->whereNull('verdict');
    }
    
    // Helper methods
    public function isExplanationOverdue()
    {
        return $this->due_date && Carbon::now()->gt($this->due_date) && !$this->employee_explanation;
    }
    
    public function canSubmitExplanation()
    {
        // Allow explanation submission if:
        // 1. Status is explanation_requested, OR
        // 2. Status is action_issued (newly issued actions), OR
        // 3. Status is under_investigation but no explanation submitted yet
        $allowedStatuses = [
            'explanation_requested', 
            'action_issued', 
            'under_investigation'
        ];
        
        // Don't allow if explanation already exists UNLESS status is specifically explanation_requested
        if ($this->employee_explanation && $this->status !== 'explanation_requested') {
            return false;
        }
        
        return in_array($this->status, $allowedStatuses);
    }
    
    public function canInvestigate()
    {
        // Cannot investigate if case is completed or already has investigation notes
        if ($this->status === 'completed' || $this->investigation_notes) {
            return false;
        }
        
        return in_array($this->status, [
            'action_issued',
            'explanation_requested', 
            'explanation_submitted',
            'under_investigation'
        ]);
    }
    
    public function canIssueVerdict()
    {
        return $this->status === 'awaiting_verdict' && !$this->verdict;
    }
    
    public function requestExplanation($dueDate = null)
    {
        $this->update([
            'status' => 'explanation_requested',
            'due_date' => $dueDate ?: Carbon::now()->addDays(7)
        ]);
    }
    
    public function submitExplanation($explanation)
    {
        $this->update([
            'employee_explanation' => $explanation,
            'explanation_submitted_at' => now(),
            'status' => 'explanation_submitted'
        ]);
    }
    
    public function assignToInvestigator($investigatorId)
    {
        $updateData = ['investigator_id' => $investigatorId];
        
        // Only change status to under_investigation if not already in explanation process
        if (!in_array($this->status, ['explanation_requested', 'explanation_submitted'])) {
            $updateData['status'] = 'under_investigation';
        }
        
        $this->update($updateData);
    }
    
    public function completeInvestigation($notes, $findings = null, $recommendation = null)
    {
        $this->update([
            'investigation_notes' => $notes,
            'investigation_findings' => $findings,
            'investigation_recommendation' => $recommendation,
            'investigation_completed_at' => now(),
            'status' => 'awaiting_verdict'
        ]);
    }
    
    public function issueVerdict($verdict, $details = null)
    {
        // Map frontend verdict values to backend values for consistency
        $mappedVerdict = $this->mapVerdictValue($verdict);
        
        $this->update([
            'verdict' => $mappedVerdict,
            'verdict_details' => $details,
            'verdict_issued_at' => now(),
            'status' => 'completed'
        ]);
    }
    
    /**
     * Map frontend verdict values to backend values
     * 
     * @param string $verdict
     * @return string
     */
    private function mapVerdictValue($verdict)
    {
        switch ($verdict) {
            case 'uphold':
                return 'guilty';
            case 'dismiss':
                return 'dismissed';
            default:
                return $verdict; // Return as-is for existing values
        }
    }
    
    /**
     * Get user-friendly verdict display text
     * 
     * @return string
     */
    public function getVerdictDisplayAttribute()
    {
        if (!$this->verdict) {
            return 'Pending';
        }
        
        switch ($this->verdict) {
            case 'guilty':
                return 'Action Upheld';
            case 'dismissed':
                return 'Action Dismissed';
            case 'not_guilty':
                return 'Not Guilty';
            case 'partially_guilty':
                return 'Partially Guilty';
            default:
                return ucfirst(str_replace('_', ' ', $this->verdict));
        }
    }
    
    /**
     * Get previous violations for the same employee and category
     */
    public function getPreviousViolationsAttribute()
    {
        if (!$this->disciplinaryReport) {
            return collect();
        }
        
        return DisciplinaryReport::where('employee_id', $this->disciplinaryReport->employee_id)
            ->where('disciplinary_category_id', $this->disciplinaryReport->disciplinary_category_id)
            ->where('id', '!=', $this->disciplinaryReport->id)
            ->where('status', '!=', 'dismissed')
            ->orderBy('created_at', 'desc')
            ->with(['disciplinaryCategory', 'disciplinaryActions'])
            ->get();
    }
    
    /**
     * Get violation count for this employee and category
     */
    public function getViolationCountAttribute()
    {
        if (!$this->disciplinaryReport) {
            return 0;
        }
        
        return DisciplinaryReport::where('employee_id', $this->disciplinaryReport->employee_id)
            ->where('disciplinary_category_id', $this->disciplinaryReport->disciplinary_category_id)
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
        if (!$this->disciplinaryReport || !$this->disciplinaryReport->created_at) {
            return '1st';
        }
        
        $count = DisciplinaryReport::where('employee_id', $this->disciplinaryReport->employee_id)
            ->where('disciplinary_category_id', $this->disciplinaryReport->disciplinary_category_id)
            ->where('created_at', '<=', $this->disciplinaryReport->created_at)
            ->where('status', '!=', 'dismissed')
            ->count();
            
        $ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
        return $ordinals[$count] ?? $count . 'th';
    }
    
    /**
     * Get repeated violation warning message
     */
    public function getViolationWarningMessageAttribute()
    {
        if (!$this->is_repeat_violation) {
            return null;
        }
        
        return "This is the {$this->violation_ordinal} violation for this employee in this category.";
    }
}

