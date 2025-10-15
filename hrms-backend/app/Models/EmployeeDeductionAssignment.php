<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeDeductionAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'deduction_title_id',
        'custom_amount',
        'is_active'
    ];

    protected $casts = [
        'custom_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get the employee that owns the assignment
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class, 'employee_id');
    }

    /**
     * Get the deduction title that owns the assignment
     */
    public function deductionTitle(): BelongsTo
    {
        return $this->belongsTo(DeductionTitle::class, 'deduction_title_id');
    }

    /**
     * Get the effective deduction amount (custom or default)
     */
    public function getEffectiveAmount(): float
    {
        return $this->custom_amount ?? $this->deductionTitle->amount;
    }

    /**
     * Scope for active assignments
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

