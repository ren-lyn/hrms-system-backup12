<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Fix total_hours column to support larger values (e.g., Maternity Leave = 105 days = 840 hours)
     * Change from decimal(5,2) to decimal(8,2) to support values up to 999,999.99
     */
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->decimal('total_hours', 8, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->decimal('total_hours', 5, 2)->nullable()->change();
        });
    }
};
