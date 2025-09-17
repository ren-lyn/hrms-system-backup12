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
        Schema::table('leave_requests', function (Blueprint $table) {
            // Drop the enum constraint and change to varchar
            DB::statement('ALTER TABLE leave_requests MODIFY COLUMN leave_category VARCHAR(255)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Revert back to enum (only if you want to rollback)
            DB::statement('ALTER TABLE leave_requests MODIFY COLUMN leave_category ENUM(\'Service Incentive Leave (SIL)\', \'Emergency Leave (EL)\')');
        });
    }
};
