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
            $table->foreign('application_id')->references('id')->on('applications')->onDelete('cascade');
            $table->string('employee_name');
            $table->string('employee_email');
            $table->string('position')->nullable();
            $table->string('department')->nullable();
            $table->string('onboarding_status')->default('pending_documents');
            $table->integer('progress')->default(0);
            $table->text('notes')->nullable();
            
            // Orientation scheduling fields
            $table->date('orientation_date')->nullable();
            $table->time('orientation_time')->nullable();
            $table->string('location')->nullable();
            $table->string('orientation_type')->nullable(); // 'In-person' or 'Virtual/Online'
            $table->text('additional_notes')->nullable();
            
            $table->timestamps();
            
            // Indexes for better query performance
            $table->index('application_id');
            $table->index('onboarding_status');
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
