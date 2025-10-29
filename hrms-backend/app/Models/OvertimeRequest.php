<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeRequest extends Model
{
    protected $fillable = [
        'user_id',
        'employee_id',
        'date',
        'ot_date',
        'start_time',
        'end_time',
        'ot_hours',
        'reason',
        'proof_images',
        'status',
        'admin_notes',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'manager_reviewed_by',
        'manager_reviewed_at',
        'hr_reviewed_by',
        'hr_reviewed_at'
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted()
    {
        static::creating(function ($overtime) {
            // If date is not set but ot_date is, copy the value
            if (empty($overtime->date) && !empty($overtime->ot_date)) {
                $overtime->date = $overtime->ot_date;
            }
            // If ot_date is not set but date is, copy the value
            elseif (empty($overtime->ot_date) && !empty($overtime->date)) {
                $overtime->ot_date = $overtime->date;
            }
        });
    }

    protected $dates = [
        'date',
        'ot_date',
        'reviewed_at',
        'manager_reviewed_at',
        'hr_reviewed_at',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'ot_date' => 'date',
        'proof_images' => 'array',
    ];

    /**
     * Get the user that owns the overtime request.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the employee that owns the overtime request.
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class, 'employee_id');
    }

    /**
     * Get the admin who reviewed the request.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Get the manager who reviewed the request.
     */
    public function managerReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_reviewed_by');
    }

    /**
     * Get the HR who reviewed the request.
     */
    public function hrReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'hr_reviewed_by');
    }

    /**
     * Get the attendance record for this overtime request date.
     */
    public function attendance()
    {
        return $this->hasOne(Attendance::class, 'employee_id', 'employee_id')
            ->where('date', $this->ot_date);
    }
}
