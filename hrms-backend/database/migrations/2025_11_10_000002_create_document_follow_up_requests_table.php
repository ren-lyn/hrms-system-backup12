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
        Schema::create('document_follow_up_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_requirement_id')->nullable()->constrained()->nullOnDelete();
            $table->string('document_key');
            $table->foreignId('applicant_id')->nullable()->constrained('applicants')->nullOnDelete();
            $table->text('message');
            $table->string('attachment_path')->nullable();
            $table->string('attachment_name')->nullable();
            $table->string('attachment_mime')->nullable();
            $table->unsignedBigInteger('attachment_size')->nullable();
            $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
            $table->integer('extension_days')->nullable();
            $table->dateTime('extension_deadline')->nullable();
            $table->text('hr_response')->nullable();
            $table->foreignId('hr_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('responded_at')->nullable();
            $table->timestamps();

            $table->index(['application_id', 'document_key']);
            $table->index(['document_requirement_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_follow_up_requests');
    }
};

