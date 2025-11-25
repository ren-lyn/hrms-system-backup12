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
            // Change total_days to decimal to support fractional days (0.5 for half-day)
            // Only if the column exists
            if (Schema::hasColumn('leave_requests', 'total_days')) {
                $table->decimal('total_days', 5, 2)->nullable()->change();
            }
            
            // Add leave duration field (whole_day or half_day)
            if (!Schema::hasColumn('leave_requests', 'leave_duration')) {
                $table->enum('leave_duration', ['whole_day', 'half_day'])->default('whole_day')->after('to');
            }
            
            // Add half-day period field (am or pm) - only relevant when leave_duration is half_day
            if (!Schema::hasColumn('leave_requests', 'half_day_period')) {
                $table->enum('half_day_period', ['am', 'pm'])->nullable()->after('leave_duration');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Revert total_days back to integer
            $table->integer('total_days')->nullable()->change();
            
            // Drop the new columns
            $table->dropColumn(['leave_duration', 'half_day_period']);
        });
    }
};

