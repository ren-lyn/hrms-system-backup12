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
            // Add employer PhilHealth contribution fields
            // Based on 2025 PhilHealth Premium Rate (5%)
            $table->decimal('philhealth_employer_contribution', 10, 2)->after('philhealth_deduction')->default(0)->comment('Employer PhilHealth contribution (50% of total premium)');
            $table->decimal('philhealth_total_contribution', 10, 2)->after('philhealth_employer_contribution')->default(0)->comment('Total PhilHealth premium (Employee + Employer)');
            $table->decimal('philhealth_mbs', 10, 2)->after('philhealth_total_contribution')->default(0)->comment('Monthly Basic Salary (MBS) used for PhilHealth calculation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'philhealth_employer_contribution',
                'philhealth_total_contribution',
                'philhealth_mbs'
            ]);
        });
    }
};
