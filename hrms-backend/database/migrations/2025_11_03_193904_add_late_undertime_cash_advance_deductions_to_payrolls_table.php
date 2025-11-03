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
            $table->decimal('late_deduction', 10, 2)->default(0)->after('tax_deduction');
            $table->decimal('undertime_deduction', 10, 2)->default(0)->after('late_deduction');
            $table->decimal('cash_advance_deduction', 10, 2)->default(0)->after('undertime_deduction');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn(['late_deduction', 'undertime_deduction', 'cash_advance_deduction']);
        });
    }
};
