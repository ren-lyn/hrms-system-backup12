<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TaxTitle;
use App\Models\DeductionTitle;
use App\Models\Benefit;
use App\Models\PayrollPeriod;
use App\Models\EmployeeProfile;
use App\Models\EmployeeTaxAssignment;
use App\Models\EmployeeDeductionAssignment;

class PayrollDataSeeder extends Seeder
{
    public function run(): void
    {
        // Map old tax title names to new ones
        $taxTitleMapping = [
            'SSS' => 'SSS Contribution',
            'PhilHealth' => 'PhilHealth Contribution',
            'Pag-IBIG' => 'Pag-IBIG Contribution',
        ];

        // Migrate employee assignments from old tax titles to new ones
        foreach ($taxTitleMapping as $oldName => $newName) {
            $oldTax = TaxTitle::where('name', $oldName)->first();
            $newTax = TaxTitle::where('name', $newName)->first();

            if ($oldTax && $newTax) {
                // Get all assignments from old tax title
                $oldAssignments = EmployeeTaxAssignment::where('tax_title_id', $oldTax->id)->get();

                // Migrate assignments to new tax title
                foreach ($oldAssignments as $assignment) {
                    EmployeeTaxAssignment::updateOrCreate(
                        [
                            'employee_id' => $assignment->employee_id,
                            'tax_title_id' => $newTax->id,
                        ],
                        [
                            'custom_rate' => $assignment->custom_rate,
                            'is_active' => $assignment->is_active,
                        ]
                    );
                }
            }
        }

        // Remove old tax titles with shorter names to avoid duplicates
        $oldTaxTitlesToDelete = ['SSS', 'PhilHealth', 'Pag-IBIG'];
        TaxTitle::whereIn('name', $oldTaxTitlesToDelete)->delete();

        // Create Tax Titles
        $taxTitles = [
            ['name' => 'SSS Contribution', 'rate' => 168.84, 'type' => 'fixed', 'description' => 'Social Security System contribution per payroll period', 'is_active' => true],
            ['name' => 'PhilHealth Contribution', 'rate' => 84.50, 'type' => 'fixed', 'description' => 'Philippine Health Insurance Corporation contribution per payroll period', 'is_active' => true],
            ['name' => 'Pag-IBIG Contribution', 'rate' => 50.00, 'type' => 'fixed', 'description' => 'Pag-IBIG Fund contribution per payroll period', 'is_active' => true],
        ];

        foreach ($taxTitles as $tax) {
            TaxTitle::firstOrCreate(['name' => $tax['name']], $tax);
        }

        // Remove SSS, PhilHealth, and Pag-IBIG from deduction titles if they exist
        $deductionTitlesToDelete = ['SSS', 'PhilHealth', 'Pag-IBIG'];
        DeductionTitle::whereIn('name', $deductionTitlesToDelete)->delete();

        // Remove Absence Deduction, Loan Deduction, and Uniform Deduction
        $removedDeductionTitles = ['Absence Deduction', 'Loan Deduction', 'Uniform Deduction'];
        DeductionTitle::whereIn('name', $removedDeductionTitles)->delete();

        // Create Deduction Titles
        $deductionTitles = [
            ['name' => 'Late Penalty', 'amount' => 0.00, 'type' => 'fixed', 'description' => 'Auto-calculated penalty for late arrival (15-minute grace period, then 8.67 per minute after 8:15 AM)', 'is_active' => true],
            ['name' => 'Undertime Penalty', 'amount' => 0.00, 'type' => 'fixed', 'description' => 'Auto-calculated penalty for clocking out before 5:00 PM (8.67 per minute early)', 'is_active' => true],
            ['name' => 'Cash Advance', 'amount' => 0.00, 'type' => 'fixed', 'description' => 'Auto-calculated cash advance deduction (500 for amounts ≤10k, 1000 for amounts >10k per payroll period until paid)', 'is_active' => true],
        ];

        foreach ($deductionTitles as $deduction) {
            DeductionTitle::firstOrCreate(['name' => $deduction['name']], $deduction);
        }

        // Create Benefits
        $benefits = [
            ['name' => '13th Month Pay', 'amount' => 0.00, 'type' => 'percentage', 'description' => 'Annual 13th month pay benefit', 'is_active' => true],
            ['name' => 'Transportation Allowance', 'amount' => 2000.00, 'type' => 'fixed', 'description' => 'Monthly transportation allowance', 'is_active' => true],
            ['name' => 'Meal Allowance', 'amount' => 1500.00, 'type' => 'fixed', 'description' => 'Monthly meal allowance', 'is_active' => true],
            ['name' => 'Performance Bonus', 'amount' => 5000.00, 'type' => 'fixed', 'description' => 'Quarterly performance bonus', 'is_active' => true],
        ];

        foreach ($benefits as $benefit) {
            Benefit::firstOrCreate(['name' => $benefit['name']], $benefit);
        }

        // Create Payroll Periods
        $currentMonth = now()->format('Y-m');
        $payrollPeriods = [
            [
                'name' => 'October 2025',
                'start_date' => '2025-10-01',
                'end_date' => '2025-10-31',
                'status' => 'active'
            ],
            [
                'name' => 'September 2025',
                'start_date' => '2025-09-01',
                'end_date' => '2025-09-30',
                'status' => 'closed'
            ],
        ];

        foreach ($payrollPeriods as $period) {
            PayrollPeriod::firstOrCreate(['name' => $period['name']], $period);
        }

        // Get some employees to assign taxes and deductions
        $employees = EmployeeProfile::where('employment_status', 'Full Time')->take(5)->get();

        if ($employees->count() > 0) {
            $taxTitles = TaxTitle::where('is_active', true)->get();
            $deductionTitles = DeductionTitle::where('is_active', true)->get();

            // Assign taxes to employees
            foreach ($employees as $employee) {
                foreach ($taxTitles as $taxTitle) {
                    EmployeeTaxAssignment::firstOrCreate([
                        'employee_id' => $employee->id,
                        'tax_title_id' => $taxTitle->id,
                    ], [
                        'custom_rate' => null,
                        'is_active' => true,
                    ]);
                }
            }

            // Assign some deductions to employees (not all)
            foreach ($employees->take(3) as $employee) {
                foreach ($deductionTitles->take(2) as $deductionTitle) {
                    EmployeeDeductionAssignment::firstOrCreate([
                        'employee_id' => $employee->id,
                        'deduction_title_id' => $deductionTitle->id,
                    ], [
                        'custom_amount' => null,
                        'is_active' => true,
                    ]);
                }
            }
        }
    }
}