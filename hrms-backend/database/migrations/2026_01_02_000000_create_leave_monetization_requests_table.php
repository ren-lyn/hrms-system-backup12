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
        Schema::create('leave_monetization_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->decimal('requested_days', 5, 2); // Number of unused leave days to monetize (supports fractional like 0.5, 1.5, etc.)
            $table->decimal('daily_rate', 10, 2); // Daily rate at time of request
            $table->decimal('estimated_amount', 10, 2); // Estimated cash value (requested_days * daily_rate)
            $table->text('reason')->nullable(); // Optional reason for monetization
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('remarks')->nullable(); // HR remarks
            $table->unsignedBigInteger('approved_by')->nullable(); // HR who approved/rejected
            $table->timestamp('approved_at')->nullable();
            $table->year('leave_year'); // Which year's unused leaves are being monetized
            $table->timestamps();

            $table->foreign('employee_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            
            // Index for faster queries
            $table->index(['employee_id', 'leave_year', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_monetization_requests');
    }
};

