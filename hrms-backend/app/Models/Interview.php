<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Interview extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'applicant_user_id',
        'interview_date',
        'interview_time',
        'end_time', // May not exist if migration hasn't run
        'interview_type',
        'location',
        'interviewer',
        'notes',
        'stage',
        'status',
        'feedback',
        'result'
    ];

    protected $casts = [
        'interview_date' => 'date',
        'interview_time' => 'string', // Store as HH:MM format string
        'end_time' => 'string', // Store as HH:MM format string
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the application that this interview belongs to
     */
    public function application()
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * Scope to get interviews by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get interviews by date range
     */
    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('interview_date', [$startDate, $endDate]);
    }

    /**
     * Scope to get upcoming interviews
     */
    public function scopeUpcoming($query)
    {
        return $query->where('interview_date', '>=', now()->toDateString())
                    ->where('status', 'scheduled');
    }

    /**
     * Get formatted interview date and time
     */
    public function getFormattedDateTimeAttribute()
    {
        $date = Carbon::parse($this->interview_date)->format('M d, Y');
        // Handle interview_time as string (HH:MM format) or datetime
        $time = is_string($this->interview_time) 
            ? Carbon::parse("2000-01-01 {$this->interview_time}")->format('g:i A')
            : Carbon::parse($this->interview_time)->format('g:i A');
        return "{$date} at {$time}";
    }

    /**
     * Get status badge class for UI
     */
    public function getStatusBadgeClassAttribute()
    {
        $statusClasses = [
            'scheduled' => 'bg-primary',
            'completed' => 'bg-success',
            'cancelled' => 'bg-danger',
            'rescheduled' => 'bg-warning'
        ];
        
        return $statusClasses[$this->status] ?? 'bg-secondary';
    }

    /**
     * Get result badge class for UI
     */
    public function getResultBadgeClassAttribute()
    {
        $resultClasses = [
            'passed' => 'bg-success',
            'failed' => 'bg-danger',
            'pending' => 'bg-warning'
        ];
        
        return $resultClasses[$this->result] ?? 'bg-secondary';
    }
}