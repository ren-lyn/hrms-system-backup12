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
            // Add employer Pag-IBIG contribution fields
            // Based on 2025 Pag-IBIG Contribution Table
            $table->decimal('pagibig_employer_contribution', 10, 2)->after('pagibig_deduction')->default(0)->comment('Employer Pag-IBIG contribution (2% of salary base, capped at ₱100)');
            $table->decimal('pagibig_total_contribution', 10, 2)->after('pagibig_employer_contribution')->default(0)->comment('Total Pag-IBIG contribution (Employee + Employer)');
            $table->decimal('pagibig_salary_base', 10, 2)->after('pagibig_total_contribution')->default(0)->comment('Salary base used for Pag-IBIG calculation (capped at ₱5,000)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'pagibig_employer_contribution',
                'pagibig_total_contribution',
                'pagibig_salary_base'
            ]);
        });
    }
};
