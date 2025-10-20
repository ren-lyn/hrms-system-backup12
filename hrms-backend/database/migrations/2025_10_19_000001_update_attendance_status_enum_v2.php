<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update enum with simplified status values
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('Present','Absent','Late','Undertime','Overtime','Late (Undertime)','Late (Overtime)','On Leave','Holiday (No Work)','Holiday (Worked)') NOT NULL DEFAULT 'Absent'");
    }

    public function down(): void
    {
        // Revert to previous enum
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('Present','Absent','Late','Undertime','Overtime','Late (Undertime)','Late (Overtime)','On Leave','Holiday (No Work)','Holiday (Worked)') NOT NULL DEFAULT 'Absent'");
    }
};
