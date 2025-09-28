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
        Schema::create('disciplinary_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('employee_profiles')->onDelete('cascade'); // Manager reporting
            $table->foreignId('employee_id')->constrained('employee_profiles')->onDelete('cascade'); // Employee being reported
            $table->foreignId('disciplinary_category_id')->constrained()->onDelete('cascade');
            $table->string('report_number')->unique(); // Auto-generated report number
            $table->date('incident_date');
            $table->text('incident_description');
            $table->text('evidence')->nullable(); // Supporting evidence/documentation
            $table->json('witnesses')->nullable(); // Array of witness information
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('status', ['reported', 'under_review', 'action_issued', 'completed', 'dismissed'])->default('reported');
            $table->text('hr_notes')->nullable(); // HR comments/notes
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('employee_profiles'); // HR staff who reviewed
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('disciplinary_reports');
    }
};
