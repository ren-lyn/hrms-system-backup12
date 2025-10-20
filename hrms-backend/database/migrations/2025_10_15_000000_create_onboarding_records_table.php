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
        Schema::create('onboarding_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id')->unique();
            
            // Employee information (copied from job application for quick access)
            $table->string('employee_name');
            $table->string('employee_email');
            $table->string('position');
            $table->string('department')->nullable();
            
            // Onboarding specific fields
            $table->enum('onboarding_status', [
                'pending_documents',
                'documents_approved', 
                'orientation_scheduled',
                'completed'
            ])->default('pending_documents');
            $table->integer('progress')->default(0)->comment('Completion percentage 0-100');
            $table->date('start_date')->nullable();
            $table->text('notes')->nullable();
            
            $table->timestamps();
            
            // Foreign key constraint
            $table->foreign('application_id')->references('id')->on('applications')->onDelete('cascade');
            
            // Indexes for performance
            $table->index('onboarding_status');
            $table->index('start_date');
            $table->index(['onboarding_status', 'progress']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('onboarding_records');
    }
};