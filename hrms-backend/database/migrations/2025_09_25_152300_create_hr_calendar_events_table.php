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
        Schema::create('hr_calendar_events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->datetime('start_datetime');
            $table->datetime('end_datetime');
            $table->enum('event_type', [
                'meeting', 
                'training', 
                'interview', 
                'break', 
                'unavailable', 
                'other'
            ])->default('meeting');
            $table->enum('status', ['active', 'cancelled', 'completed'])->default('active');
            $table->boolean('blocks_leave_submissions')->default(true);
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');

            // Indexes for better query performance
            $table->index(['start_datetime', 'end_datetime']);
            $table->index(['status', 'blocks_leave_submissions']);
            $table->index('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hr_calendar_events');
    }
};
