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
        // Update the interview_type enum to include 'On-site'
        DB::statement("ALTER TABLE interviews MODIFY COLUMN interview_type ENUM('in-person', 'video', 'phone', 'online', 'On-site') NOT NULL DEFAULT 'in-person'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum without 'On-site'
        DB::statement("ALTER TABLE interviews MODIFY COLUMN interview_type ENUM('in-person', 'video', 'phone', 'online') NOT NULL DEFAULT 'in-person'");
    }
};
