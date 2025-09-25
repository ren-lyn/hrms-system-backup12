<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Evaluation extends Model
{
    use HasFactory;

    protected $fillable = [
        'evaluation_form_id',
        'employee_id',
        'manager_id',
        'total_score',
        'average_score',
        'percentage_score',
        'is_passed',
        'passing_threshold',
        'status',
        'general_comments',
        'submitted_at',
        'due_date',
        'next_evaluation_date',
        'evaluation_period_start',
        'evaluation_period_end',
        'employee_notified',
        'notified_at',
    ];

    protected $casts = [
        'total_score' => 'decimal:2',
        'average_score' => 'decimal:2',
        'percentage_score' => 'decimal:2',
        'is_passed' => 'boolean',
        'passing_threshold' => 'integer',
        'employee_notified' => 'boolean',
        'submitted_at' => 'datetime',
        'due_date' => 'datetime',
        'next_evaluation_date' => 'datetime',
        'evaluation_period_start' => 'date',
        'evaluation_period_end' => 'date',
        'notified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function evaluationForm()
    {
        return $this->belongsTo(EvaluationForm::class);
    }

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function responses()
    {
        return $this->hasMany(EvaluationResponse::class);
    }

    // Scopes
    public function scopeDraft($query)
    {
        return $query->where('status', 'Draft');
    }

    public function scopeSubmitted($query)
    {
        return $query->where('status', 'Submitted');
    }

    public function scopeReviewed($query)
    {
        return $query->where('status', 'Reviewed');
    }

    public function scopeForEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeByManager($query, $managerId)
    {
        return $query->where('manager_id', $managerId);
    }

    public function scopeDueSoon($query, $days = 7)
    {
        return $query->where('due_date', '<=', Carbon::now()->addDays($days))
                     ->where('status', 'Draft');
    }

    // Accessors & Mutators
    public function setNextEvaluationDateAttribute($value)
    {
        // Automatically set next evaluation date to 3 months from submitted date
        if ($this->submitted_at) {
            $this->attributes['next_evaluation_date'] = Carbon::parse($this->submitted_at)->addMonths(3);
        }
    }

    // Helper methods
    public function calculateScores()
    {
        $responses = $this->responses;
        
        if ($responses->isEmpty()) {
            return;
        }

        $totalScore = $responses->sum('rating');
        $averageScore = $responses->avg('rating');

        $this->update([
            'total_score' => $totalScore,
            'average_score' => round($averageScore, 2),
        ]);
    }

    public function isOverdue()
    {
        return $this->due_date && Carbon::now()->gt($this->due_date) && $this->status === 'Draft';
    }

    public function isDueSoon($days = 7)
    {
        return $this->due_date && 
               Carbon::now()->diffInDays($this->due_date, false) <= $days && 
               Carbon::now()->lt($this->due_date) && 
               $this->status === 'Draft';
    }
}