<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'payroll_period_id',
        'period_start',
        'period_end',
        'days_worked',
        'absences',
        'basic_salary',
        'overtime_pay',
        'holiday_pay',
        'thirteenth_month_pay',
        'allowances',
        'gross_pay',
        'sss_deduction',
        'sss_employer_contribution',
        'sss_ec_contribution',
        'sss_employer_total',
        'sss_total_remittance',
        'sss_msc',
        'sss_regular_ss_msc',
        'sss_regular_ss_employee',
        'sss_regular_ss_employer',
        'sss_regular_ss_total',
        'sss_mpf_msc',
        'sss_mpf_employee',
        'sss_mpf_employer',
        'sss_mpf_total',
        'philhealth_deduction',
        'philhealth_employer_contribution',
        'philhealth_total_contribution',
        'philhealth_mbs',
        'pagibig_deduction',
        'pagibig_employer_contribution',
        'pagibig_total_contribution',
        'pagibig_salary_base',
        'tax_deduction',
        'late_deduction',
        'undertime_deduction',
        'cash_advance_deduction',
        'other_deductions',
        'total_deductions',
        'net_pay',
        'status',
        'notes',
        'processed_at',
        'paid_at'
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'days_worked' => 'integer',
        'absences' => 'integer',
        'basic_salary' => 'decimal:2',
        'overtime_pay' => 'decimal:2',
        'holiday_pay' => 'decimal:2',
        'thirteenth_month_pay' => 'decimal:2',
        'allowances' => 'decimal:2',
        'gross_pay' => 'decimal:2',
        'sss_deduction' => 'decimal:2',
        'sss_employer_contribution' => 'decimal:2',
        'sss_ec_contribution' => 'decimal:2',
        'sss_employer_total' => 'decimal:2',
        'sss_total_remittance' => 'decimal:2',
        'sss_msc' => 'decimal:2',
        'sss_regular_ss_msc' => 'decimal:2',
        'sss_regular_ss_employee' => 'decimal:2',
        'sss_regular_ss_employer' => 'decimal:2',
        'sss_regular_ss_total' => 'decimal:2',
        'sss_mpf_msc' => 'decimal:2',
        'sss_mpf_employee' => 'decimal:2',
        'sss_mpf_employer' => 'decimal:2',
        'sss_mpf_total' => 'decimal:2',
        'philhealth_deduction' => 'decimal:2',
        'philhealth_employer_contribution' => 'decimal:2',
        'philhealth_total_contribution' => 'decimal:2',
        'philhealth_mbs' => 'decimal:2',
        'pagibig_deduction' => 'decimal:2',
        'pagibig_employer_contribution' => 'decimal:2',
        'pagibig_total_contribution' => 'decimal:2',
        'pagibig_salary_base' => 'decimal:2',
        'tax_deduction' => 'decimal:2',
        'late_deduction' => 'decimal:2',
        'undertime_deduction' => 'decimal:2',
        'cash_advance_deduction' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_pay' => 'decimal:2',
        'processed_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    /**
     * Get the employee that owns the payroll
     */
    public function employee(): BelongsTo
    {
        return $this->belongsTo(EmployeeProfile::class, 'employee_id');
    }

    /**
     * Get the payroll period that owns the payroll
     */
    public function payrollPeriod(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    /**
     * Check if payroll is processed
     */
    public function isProcessed(): bool
    {
        return $this->status === 'processed';
    }

    /**
     * Check if payroll is paid
     */
    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    /**
     * Check if payroll is draft
     */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /**
     * Scope for processed payrolls
     */
    public function scopeProcessed($query)
    {
        return $query->where('status', 'processed');
    }

    /**
     * Scope for paid payrolls
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    /**
     * Scope for draft payrolls
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Scope for pending payrolls
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
