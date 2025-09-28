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
        Schema::table('disciplinary_actions', function (Blueprint $table) {
            // Add new columns for enhanced workflow
            $table->foreignId('disciplinary_report_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('investigator_id')->nullable()->constrained('employee_profiles')->onDelete('set null');
            $table->foreignId('issued_by')->nullable()->constrained('employee_profiles')->onDelete('set null'); // HR staff who issued
            $table->string('action_number')->unique()->nullable(); // Auto-generated action number
            $table->enum('action_type', ['verbal_warning', 'written_warning', 'final_warning', 'suspension', 'demotion', 'termination', 'training', 'counseling'])->nullable();
            $table->text('action_details')->nullable(); // Detailed action description
            $table->text('employee_explanation')->nullable(); // Employee's explanation
            $table->text('investigation_notes')->nullable(); // Investigator's findings
            $table->text('verdict_details')->nullable(); // Final verdict details
            $table->enum('verdict', ['guilty', 'not_guilty', 'partially_guilty', 'dismissed'])->nullable();
            $table->date('effective_date')->nullable(); // When the action becomes effective
            $table->date('due_date')->nullable(); // Due date for employee explanation
            $table->timestamp('explanation_submitted_at')->nullable();
            $table->timestamp('investigation_completed_at')->nullable();
            $table->timestamp('verdict_issued_at')->nullable();
            
            // Update the existing status enum to include more workflow stages
            $table->enum('status', [
                'pending', 'action_issued', 'explanation_requested', 'explanation_submitted', 
                'under_investigation', 'investigation_completed', 'awaiting_verdict', 
                'completed', 'dismissed', 'resolved', 'rejected'
            ])->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('disciplinary_actions', function (Blueprint $table) {
            $table->dropForeign(['disciplinary_report_id']);
            $table->dropForeign(['investigator_id']);
            $table->dropForeign(['issued_by']);
            $table->dropColumn([
                'disciplinary_report_id',
                'investigator_id',
                'issued_by',
                'action_number',
                'action_type',
                'action_details',
                'employee_explanation',
                'investigation_notes',
                'verdict_details',
                'verdict',
                'effective_date',
                'due_date',
                'explanation_submitted_at',
                'investigation_completed_at',
                'verdict_issued_at'
            ]);
            
            // Restore original status enum
            $table->enum('status', ['Pending', 'Resolved', 'Rejected'])->default('Pending')->change();
        });
    }
};
