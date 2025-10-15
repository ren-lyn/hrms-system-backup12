<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeTaxAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'tax_title_id',
        'custom_rate',
        'is_active'
    ];

    protected $casts = [
        'custom_rate' => 'decimal:4',
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
     * Get the tax title that owns the assignment
     */
    public function taxTitle(): BelongsTo
    {
        return $this->belongsTo(TaxTitle::class, 'tax_title_id');
    }

    /**
     * Get the effective tax rate (custom or default)
     */
    public function getEffectiveRate(): float
    {
        return $this->custom_rate ?? $this->taxTitle->rate;
    }

    /**
     * Scope for active assignments
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

