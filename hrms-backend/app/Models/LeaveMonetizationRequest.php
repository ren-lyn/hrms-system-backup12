<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveMonetizationRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'requested_days',
        'daily_rate',
        'estimated_amount',
        'reason',
        'status',
        'remarks',
        'approved_by',
        'approved_at',
        'leave_year'
    ];

    protected $casts = [
        'requested_days' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'estimated_amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'leave_year' => 'integer',
    ];

    /**
     * Get the employee who made the request
     */
    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    /**
     * Get the HR staff who approved/rejected the request
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

