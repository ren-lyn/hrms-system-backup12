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
        Schema::create('job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained('applications')->onDelete('cascade');
            $table->string('department')->nullable();
            $table->string('position')->nullable();
            $table->string('salary')->nullable();
            $table->string('payment_schedule')->default('Monthly');
            $table->string('employment_type')->default('Full-time');
            $table->string('work_setup')->default('Onsite');
            $table->string('offer_validity')->default('7 days');
            $table->string('contact_person');
            $table->string('contact_number');
            $table->text('notes')->nullable();
            $table->string('status')->default('pending'); // pending, accepted, rejected
            $table->timestamp('offer_sent_at')->useCurrent();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('application_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_offers');
    }
};
