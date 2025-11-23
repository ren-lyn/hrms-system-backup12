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
            // Add MPF (Member's Provident Fund) fields for SSS contributions
            // Based on 2025 SSS Contribution Table - MPF applies to MSC above ₱20,000
            $table->decimal('sss_regular_ss_msc', 10, 2)->after('sss_msc')->default(0)->comment('Regular SS MSC (up to ₱20,000)');
            $table->decimal('sss_regular_ss_employee', 10, 2)->after('sss_regular_ss_msc')->default(0)->comment('Regular SS employee contribution (5% of Regular SS MSC)');
            $table->decimal('sss_regular_ss_employer', 10, 2)->after('sss_regular_ss_employee')->default(0)->comment('Regular SS employer contribution (10% of Regular SS MSC)');
            $table->decimal('sss_regular_ss_total', 10, 2)->after('sss_regular_ss_employer')->default(0)->comment('Regular SS total contribution (15% of Regular SS MSC)');
            $table->decimal('sss_mpf_msc', 10, 2)->after('sss_regular_ss_total')->default(0)->comment('MPF MSC (MSC above ₱20,000)');
            $table->decimal('sss_mpf_employee', 10, 2)->after('sss_mpf_msc')->default(0)->comment('MPF employee contribution (5% of MPF MSC)');
            $table->decimal('sss_mpf_employer', 10, 2)->after('sss_mpf_employee')->default(0)->comment('MPF employer contribution (10% of MPF MSC)');
            $table->decimal('sss_mpf_total', 10, 2)->after('sss_mpf_employer')->default(0)->comment('MPF total contribution (15% of MPF MSC)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'sss_regular_ss_msc',
                'sss_regular_ss_employee',
                'sss_regular_ss_employer',
                'sss_regular_ss_total',
                'sss_mpf_msc',
                'sss_mpf_employee',
                'sss_mpf_employer',
                'sss_mpf_total'
            ]);
        });
    }
};
