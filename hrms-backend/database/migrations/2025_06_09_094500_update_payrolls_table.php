<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            // Add foreign key to payroll periods
            $table->foreignId('payroll_period_id')->nullable()->after('employee_id')->constrained('payroll_periods')->onDelete('set null');
            
            // Add more detailed payroll fields
            $table->decimal('basic_salary', 10, 2)->after('period_end')->default(0);
            $table->decimal('overtime_pay', 10, 2)->after('basic_salary')->default(0);
            $table->decimal('allowances', 10, 2)->after('overtime_pay')->default(0);
            $table->decimal('gross_pay', 10, 2)->after('allowances')->default(0);
            
            // Detailed deductions
            $table->decimal('sss_deduction', 10, 2)->after('gross_pay')->default(0);
            $table->decimal('philhealth_deduction', 10, 2)->after('sss_deduction')->default(0);
            $table->decimal('pagibig_deduction', 10, 2)->after('philhealth_deduction')->default(0);
            $table->decimal('tax_deduction', 10, 2)->after('pagibig_deduction')->default(0);
            $table->decimal('other_deductions', 10, 2)->after('tax_deduction')->default(0);
            $table->decimal('total_deductions', 10, 2)->after('other_deductions')->default(0);
            
            // Status and metadata
            $table->enum('status', ['draft', 'pending', 'processed', 'paid'])->after('net_pay')->default('draft');
            $table->text('notes')->nullable()->after('status');
            $table->timestamp('processed_at')->nullable()->after('notes');
            $table->timestamp('paid_at')->nullable()->after('processed_at');
            
            // Add indexes
            $table->index('payroll_period_id');
            $table->index('status');
            $table->index(['employee_id', 'payroll_period_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropForeign(['payroll_period_id']);
            $table->dropColumn([
                'payroll_period_id',
                'basic_salary',
                'overtime_pay',
                'allowances',
                'gross_pay',
                'sss_deduction',
                'philhealth_deduction',
                'pagibig_deduction',
                'tax_deduction',
                'other_deductions',
                'total_deductions',
                'net_pay',
                'status',
                'notes',
                'processed_at',
                'paid_at'
            ]);
        });
    }
};
