<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite doesn't support MODIFY COLUMN, so we'll recreate the table
        if (DB::getDriverName() === 'sqlite') {
            // For SQLite, we need to recreate the table
            Schema::table('leave_requests', function (Blueprint $table) {
                $table->string('leave_category')->change();
            });
        } else {
            // For MySQL/other databases
            DB::statement('ALTER TABLE leave_requests MODIFY COLUMN leave_category VARCHAR(255)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // For SQLite, revert back to string (can't easily revert to enum)
            Schema::table('leave_requests', function (Blueprint $table) {
                $table->string('leave_category')->change();
            });
        } else {
            // For MySQL/other databases
            DB::statement('ALTER TABLE leave_requests MODIFY COLUMN leave_category ENUM(\'Service Incentive Leave (SIL)\', \'Emergency Leave (EL)\')');
        }
    }
};
