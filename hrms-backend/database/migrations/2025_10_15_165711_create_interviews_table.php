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
        Schema::create('interviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            
            // Interview details
            $table->date('interview_date');
            $table->time('interview_time');
            $table->integer('duration')->default(30)->comment('Interview duration in minutes');
            $table->enum('interview_type', ['in-person', 'video', 'phone', 'online'])->default('in-person');
            $table->string('location');
            $table->string('interviewer');
            $table->text('notes')->nullable();
            
            // Interview status
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'rescheduled'])->default('scheduled');
            $table->text('feedback')->nullable();
            $table->enum('result', ['passed', 'failed', 'pending'])->nullable();
            
            $table->timestamps();
            
            // Foreign key constraint
            $table->foreign('application_id')->references('id')->on('applications')->onDelete('cascade');
            
            // Indexes for performance
            $table->index('interview_date');
            $table->index('status');
            $table->index(['interview_date', 'interview_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('interviews');
    }
};