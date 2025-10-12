<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Benefit extends Model
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
     * Get employees assigned to this benefit
     */
    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(
            EmployeeProfile::class,
            'employee_benefit_assignments',
            'benefit_id',
            'employee_id'
        )->withPivot(['custom_amount', 'is_active'])->withTimestamps();
    }

    /**
     * Get active employees assigned to this benefit
     */
    public function activeEmployees(): BelongsToMany
    {
        return $this->employees()->wherePivot('is_active', true);
    }

    /**
     * Check if benefit is percentage based
     */
    public function isPercentage(): bool
    {
        return $this->type === 'percentage';
    }

    /**
     * Check if benefit is fixed amount
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
     * Scope for active benefits
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for percentage type benefits
     */
    public function scopePercentage($query)
    {
        return $query->where('type', 'percentage');
    }

    /**
     * Scope for fixed type benefits
     */
    public function scopeFixed($query)
    {
        return $query->where('type', 'fixed');
    }
}
