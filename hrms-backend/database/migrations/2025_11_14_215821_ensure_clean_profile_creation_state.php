<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * This migration ensures that benefits_enrollments and related tables are clean
     * before seeding. It should run after all table creation migrations.
     */
    public function up(): void
    {
        // Disable foreign key checks temporarily to allow deletion
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        }

        // Delete ALL applications - most aggressive cleanup to ensure no old data
        // This ensures Profile Creation tab is completely empty
        if (Schema::hasTable('applications')) {
            DB::table('applications')->delete();
        }

        // Truncate benefits_enrollments table
        if (Schema::hasTable('benefits_enrollments')) {
            DB::table('benefits_enrollments')->truncate();
        }

        // Truncate onboarding_records if it exists
        if (Schema::hasTable('onboarding_records')) {
            DB::table('onboarding_records')->truncate();
        }

        // Re-enable foreign key checks
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse truncation
    }
};
