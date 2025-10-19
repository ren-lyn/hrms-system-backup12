<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use App\Models\Application;

class OnboardingRecord extends Model
{
    use HasFactory;

    protected $table = 'onboarding_records';

    protected $fillable = [
        'application_id',
        'employee_name',
        'employee_email',
        'position',
        'department',
        'onboarding_status',
        'progress',
        'start_date',
        'notes',
    ];

    protected $casts = [
        'progress' => 'integer',
        'start_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $attributes = [
        'onboarding_status' => 'pending_documents',
        'progress' => 0,
    ];

    /**
     * Get the job application that this onboarding record belongs to
     */
    public function jobApplication()
    {
        return $this->belongsTo(Application::class, 'application_id');
    }

    /**
     * Scope to get records by onboarding status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('onboarding_status', $status);
    }

    /**
     * Scope to get records with progress above a certain threshold
     */
    public function scopeWithProgressAbove($query, $threshold)
    {
        return $query->where('progress', '>=', $threshold);
    }

    /**
     * Get formatted start date
     */
    public function getFormattedStartDateAttribute()
    {
        return $this->start_date ? Carbon::parse($this->start_date)->format('M d, Y') : null;
    }

    /**
     * Get status badge class for UI
     */
    public function getStatusBadgeClassAttribute()
    {
        $statusMap = [
            'pending_documents' => 'warning',
            'documents_approved' => 'info',
            'orientation_scheduled' => 'primary',
            'completed' => 'success'
        ];

        return $statusMap[$this->onboarding_status] ?? 'secondary';
    }

    /**
     * Get progress percentage formatted
     */
    public function getProgressPercentageAttribute()
    {
        return $this->progress . '%';
    }

    /**
     * Check if onboarding is completed
     */
    public function isCompleted()
    {
        return $this->onboarding_status === 'completed';
    }

    /**
     * Check if documents are pending
     */
    public function hasPendingDocuments()
    {
        return $this->onboarding_status === 'pending_documents';
    }
}