<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id', 'company', 'employee_name', 'department', 'type', 'terms', 'leave_category', 'from', 'to', 
        'total_days', 'total_hours', 'date_filed', 'reason', 'attachment', 'signature_path', 'status', 
        'admin_remarks', 'approved_at', 'rejected_at', 'approved_by'
    ];

    protected $casts = [
        'from' => 'date',
        'to' => 'date',
        'date_filed' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'total_hours' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getDaysCountAttribute()
    {
        return $this->from->diffInDays($this->to) + 1;
    }
}
