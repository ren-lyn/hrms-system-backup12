<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AttendanceEditRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'requested_by_user_id',
        'date',
        'current_time_in',
        'current_time_out',
        'requested_time_in',
        'requested_time_out',
        'reason',
        'proof_images',
        'status',
        'rejection_reason',
        'reviewed_by_user_id',
        'reviewed_at'
    ];

    protected $casts = [
        'date' => 'date',
        'proof_images' => 'array',
        'reviewed_at' => 'datetime'
    ];

    /**
     * Get the employee that owns the request
     */
    public function employee()
    {
        return $this->belongsTo(EmployeeProfile::class, 'employee_id');
    }

    /**
     * Get the user who made the request
     */
    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    /**
     * Get the user who reviewed the request
     */
    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
