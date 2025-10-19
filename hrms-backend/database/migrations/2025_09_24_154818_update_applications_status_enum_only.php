<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // For SQLite, we can't modify enum columns easily, so we'll skip this migration
            // The status column will remain as string type
            Schema::table('applications', function (Blueprint $table) {
                $table->string('status')->default('Pending')->change();
            });
        } else {
            // For MySQL/other databases
            DB::statement("ALTER TABLE applications MODIFY status ENUM('Applied', 'Pending', 'ShortListed', 'Interview', 'Offered', 'Offered Accepted', 'Onboarding', 'Hired', 'Rejected') DEFAULT 'Pending'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // For SQLite, revert to string
            Schema::table('applications', function (Blueprint $table) {
                $table->string('status')->default('Applied')->change();
            });
        } else {
            // For MySQL/other databases
            DB::statement("ALTER TABLE applications MODIFY status ENUM('Applied', 'Pending', 'ShortListed', 'Interview', 'Offered', 'Offered Accepted', 'Onboarding', 'Hired', 'Rejected') DEFAULT 'Applied'");
        }
    }
};
