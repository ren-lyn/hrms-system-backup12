<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TaxTitle extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'rate',
        'type',
        'description',
        'is_active'
    ];

    protected $casts = [
        'rate' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    /**
     * Get employees assigned to this tax title
     */
    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(
            EmployeeProfile::class,
            'employee_tax_assignments',
            'tax_title_id',
            'employee_id'
        )->withPivot(['custom_rate', 'is_active'])->withTimestamps();
    }

    /**
     * Get active employees assigned to this tax title
     */
    public function activeEmployees(): BelongsToMany
    {
        return $this->employees()->wherePivot('is_active', true);
    }

    /**
     * Check if tax is percentage based
     */
    public function isPercentage(): bool
    {
        return $this->type === 'percentage';
    }

    /**
     * Check if tax is fixed amount
     */
    public function isFixed(): bool
    {
        return $this->type === 'fixed';
    }

    /**
     * Get formatted rate
     */
    public function getFormattedRate(): string
    {
        if ($this->isPercentage()) {
            return $this->rate . '%';
        }
        
        return '₱' . number_format($this->rate, 2);
    }

    /**
     * Scope for active tax titles
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for percentage type taxes
     */
    public function scopePercentage($query)
    {
        return $query->where('type', 'percentage');
    }

    /**
     * Scope for fixed type taxes
     */
    public function scopeFixed($query)
    {
        return $query->where('type', 'fixed');
    }
}
