<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Update applications.applicant_id to reference applicants table instead of users.
     */
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            // Drop existing foreign key to users
            try {
                $table->dropForeign(['applicant_id']);
            } catch (\Throwable $e) {
                // ignore if not present
            }
            // Add new foreign key to applicants
            $table->foreign('applicant_id')->references('id')->on('applicants')->onDelete('cascade');
        });
    }

    /**
     * Revert back to referencing users table.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            try {
                $table->dropForeign(['applicant_id']);
            } catch (\Throwable $e) {
            }
            $table->foreign('applicant_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
