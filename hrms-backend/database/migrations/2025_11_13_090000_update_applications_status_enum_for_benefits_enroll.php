<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('applications', 'status')) {
            if (DB::getDriverName() === 'sqlite') {
                Schema::table('applications', function (Blueprint $table) {
                    $table->string('status', 191)->default('Pending')->change();
                });
            } else {
                DB::statement("
                    ALTER TABLE applications
                    MODIFY status ENUM(
                        'Applied',
                        'Pending',
                        'ShortListed',
                        'Interview',
                        'On going Interview',
                        'Offered',
                        'Offer Sent',
                        'Offer Accepted',
                        'Offered Accepted',
                        'Onboarding',
                        'Document Submission',
                        'Benefits Enroll',
                        'Orientation Schedule',
                        'Starting Date',
                        'Profile Creation',
                        'Hired',
                        'Completed',
                        'Rejected'
                    ) DEFAULT 'Pending'
                ");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('applications', 'status')) {
            if (DB::getDriverName() === 'sqlite') {
                Schema::table('applications', function (Blueprint $table) {
                    $table->string('status', 191)->default('Applied')->change();
                });
            } else {
                DB::statement("
                    ALTER TABLE applications
                    MODIFY status ENUM(
                        'Applied',
                        'Pending',
                        'ShortListed',
                        'Interview',
                        'On going Interview',
                        'Offered',
                        'Offer Sent',
                        'Offer Accepted',
                        'Offered Accepted',
                        'Onboarding',
                        'Hired',
                        'Rejected'
                    ) DEFAULT 'Applied'
                ");
            }
        }
    }
};

