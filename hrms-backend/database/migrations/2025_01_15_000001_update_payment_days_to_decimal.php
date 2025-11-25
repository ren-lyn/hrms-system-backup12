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
        // Check if table exists before modifying
        if (!Schema::hasTable('leave_requests')) {
            return; // Table doesn't exist, skip this migration
        }

        Schema::table('leave_requests', function (Blueprint $table) {
            // Change with_pay_days and without_pay_days to decimal to support fractional days (0.5 for half-day)
            // Only if the columns exist
            if (Schema::hasColumn('leave_requests', 'with_pay_days')) {
                $table->decimal('with_pay_days', 5, 2)->default(0)->change();
            }
            if (Schema::hasColumn('leave_requests', 'without_pay_days')) {
                $table->decimal('without_pay_days', 5, 2)->default(0)->change();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Revert back to integer
            $table->integer('with_pay_days')->default(0)->change();
            $table->integer('without_pay_days')->default(0)->change();
        });
    }
};

