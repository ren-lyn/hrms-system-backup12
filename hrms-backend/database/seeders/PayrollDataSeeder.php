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
        // Create Tax Titles
        $taxTitles = [
            ['name' => 'Income Tax', 'rate' => 10.00, 'type' => 'percentage', 'description' => 'Standard income tax', 'is_active' => true],
            ['name' => 'SSS Contribution', 'rate' => 11.00, 'type' => 'percentage', 'description' => 'Social Security System contribution', 'is_active' => true],
            ['name' => 'PhilHealth Contribution', 'rate' => 3.00, 'type' => 'percentage', 'description' => 'Philippine Health Insurance Corporation contribution', 'is_active' => true],
            ['name' => 'Pag-IBIG Contribution', 'rate' => 2.00, 'type' => 'percentage', 'description' => 'Home Development Mutual Fund contribution', 'is_active' => true],
        ];

        foreach ($taxTitles as $tax) {
            TaxTitle::firstOrCreate(['name' => $tax['name']], $tax);
        }

        // Create Deduction Titles
        $deductionTitles = [
            ['name' => 'Late Penalty', 'amount' => 50.00, 'type' => 'fixed', 'description' => 'Penalty for late arrival', 'is_active' => true],
            ['name' => 'Absence Deduction', 'amount' => 500.00, 'type' => 'fixed', 'description' => 'Deduction for unexcused absence', 'is_active' => true],
            ['name' => 'Loan Deduction', 'amount' => 1000.00, 'type' => 'fixed', 'description' => 'Salary loan deduction', 'is_active' => true],
            ['name' => 'Uniform Deduction', 'amount' => 200.00, 'type' => 'fixed', 'description' => 'Uniform cost deduction', 'is_active' => true],
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