<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class DeductionTitle extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'amount',
        'type',
        'description',
        'is_active'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get employees assigned to this deduction title
     */
    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(
            EmployeeProfile::class,
            'employee_deduction_assignments',
            'deduction_title_id',
            'employee_id'
        )->withPivot(['custom_amount', 'is_active'])->withTimestamps();
    }

    /**
     * Get active employees assigned to this deduction title
     */
    public function activeEmployees(): BelongsToMany
    {
        return $this->employees()->wherePivot('is_active', true);
    }

    /**
     * Check if deduction is percentage based
     */
    public function isPercentage(): bool
    {
        return $this->type === 'percentage';
    }

    /**
     * Check if deduction is fixed amount
     */
    public function isFixed(): bool
    {
        return $this->type === 'fixed';
    }

    /**
     * Get formatted amount
     */
    public function getFormattedAmount(): string
    {
        if ($this->isPercentage()) {
            return $this->amount . '%';
        }
        
        return '₱' . number_format($this->amount, 2);
    }

    /**
     * Scope for active deduction titles
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for percentage type deductions
     */
    public function scopePercentage($query)
    {
        return $query->where('type', 'percentage');
    }

    /**
     * Scope for fixed type deductions
     */
    public function scopeFixed($query)
    {
        return $query->where('type', 'fixed');
    }
}
