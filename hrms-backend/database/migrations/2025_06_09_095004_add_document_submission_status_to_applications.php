<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('applications', function (Blueprint $table) {
                $table->string('status')->default('Applied')->change();
            });
        } else {
            // Add "Document Submission" to the status enum
            DB::statement("ALTER TABLE applications MODIFY status ENUM('Applied', 'Pending', 'ShortListed', 'Interview', 'On going Interview', 'Offered', 'Offer Sent', 'Offer Accepted', 'Offered Accepted', 'Document Submission', 'Onboarding', 'Hired', 'Rejected') DEFAULT 'Applied'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('applications', function (Blueprint $table) {
                $table->string('status')->default('Applied')->change();
            });
        } else {
            DB::statement("ALTER TABLE applications MODIFY status ENUM('Applied', 'Pending', 'ShortListed', 'Interview', 'On going Interview', 'Offered', 'Offer Sent', 'Offer Accepted', 'Offered Accepted', 'Onboarding', 'Hired', 'Rejected') DEFAULT 'Applied'");
        }
    }
};

