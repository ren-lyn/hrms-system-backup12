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
        Schema::table('applications', function (Blueprint $table) {
            // Update existing resume_path column to be nullable
            $table->string('resume_path')->nullable()->change();
            // Add reviewed_at timestamp
            $table->timestamp('reviewed_at')->nullable()->after('applied_at');
            // Update status enum to include more options
            $table->enum('status', ['Applied', 'Pending', 'Under Review', 'Interview', 'Hired', 'Rejected'])->default('Applied')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn('reviewed_at');
            $table->enum('status', ['Applied', 'Interview', 'Hired', 'Rejected'])->default('Applied')->change();
            $table->string('resume_path')->change();
        });
    }
};
