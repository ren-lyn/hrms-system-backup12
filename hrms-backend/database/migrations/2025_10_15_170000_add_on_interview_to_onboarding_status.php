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
        Schema::table('onboarding_records', function (Blueprint $table) {
            // Update the enum to include 'on_interview'
            $table->enum('onboarding_status', [
                'pending_documents',
                'on_interview',
                'documents_approved', 
                'orientation_scheduled',
                'completed'
            ])->default('pending_documents')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('onboarding_records', function (Blueprint $table) {
            // Revert to original enum
            $table->enum('onboarding_status', [
                'pending_documents',
                'documents_approved', 
                'orientation_scheduled',
                'completed'
            ])->default('pending_documents')->change();
        });
    }
};
