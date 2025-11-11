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
        Schema::table('applications', function (Blueprint $table) {
            $table->enum('status', [
                'Applied',
                'Pending',
                'Under Review',
                'ShortListed',
                'Interview',
                'On going Interview',
                'Offered',
                'Offer Sent',
                'Offer Accepted',
                'Onboarding',
                'Document Submission',
                'Orientation Schedule',
                'Starting Date',
                'Benefits Enroll',
                'Profile Creation',
                'Hired',
                'Rejected',
            ])->default('Applied')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->enum('status', [
                'Applied',
                'Pending',
                'Under Review',
                'Interview',
                'On going Interview',
                'Hired',
                'Rejected',
            ])->default('Applied')->change();
        });
    }
};

