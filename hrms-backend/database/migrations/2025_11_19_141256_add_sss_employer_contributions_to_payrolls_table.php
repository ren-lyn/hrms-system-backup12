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
            // Add employer SSS contribution fields
            // Based on 2025 SSS Contribution Table
            $table->decimal('sss_employer_contribution', 10, 2)->after('sss_deduction')->default(0)->comment('Employer SSS contribution (10% of MSC)');
            $table->decimal('sss_ec_contribution', 10, 2)->after('sss_employer_contribution')->default(0)->comment('Employees Compensation (EC) contribution paid by employer');
            $table->decimal('sss_employer_total', 10, 2)->after('sss_ec_contribution')->default(0)->comment('Total employer SSS contribution (Regular SS + EC)');
            $table->decimal('sss_total_remittance', 10, 2)->after('sss_employer_total')->default(0)->comment('Total SSS remittance (Employee + Employer contributions)');
            $table->decimal('sss_msc', 10, 2)->after('sss_total_remittance')->default(0)->comment('Monthly Salary Credit (MSC) used for calculation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'sss_employer_contribution',
                'sss_ec_contribution',
                'sss_employer_total',
                'sss_total_remittance',
                'sss_msc'
            ]);
        });
    }
};
