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
        Schema::create('employee_leave_limits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->string('leave_type');
            $table->integer('max_days_per_month')->default(0);
            $table->integer('max_paid_requests_per_year')->default(0);
            $table->text('reason')->nullable(); // Reason for the custom limit
            $table->date('effective_from')->nullable(); // When this limit becomes effective
            $table->date('effective_until')->nullable(); // When this limit expires (optional)
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable(); // HR who created this limit
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('employee_id')->references('id')->on('employee_profiles')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            
            // Unique constraint to prevent duplicate limits for same employee and leave type
            $table->unique(['employee_id', 'leave_type'], 'unique_employee_leave_type');
            
            // Indexes for better performance
            $table->index(['employee_id', 'is_active']);
            $table->index(['leave_type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_leave_limits');
    }
};
