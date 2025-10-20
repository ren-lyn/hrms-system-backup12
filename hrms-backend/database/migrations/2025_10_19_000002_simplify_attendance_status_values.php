<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update existing records to use simplified status values
        DB::statement("UPDATE attendances SET status = 'Late' WHERE status = 'Present - Late'");
        DB::statement("UPDATE attendances SET status = 'Undertime' WHERE status = 'Present - Undertime'");
        DB::statement("UPDATE attendances SET status = 'Overtime' WHERE status = 'Present - Overtime'");
        
        // Now update the enum to remove the old values
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('Present','Absent','Late','Undertime','Overtime','Late (Undertime)','Late (Overtime)','On Leave','Holiday (No Work)','Holiday (Worked)') NOT NULL DEFAULT 'Absent'");
    }

    public function down(): void
    {
        // Add back the old enum values
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('Present','Absent','Late','Undertime','Overtime','Late (Undertime)','Late (Overtime)','On Leave','Holiday (No Work)','Holiday (Worked)','Present - Late','Present - Undertime','Present - Overtime') NOT NULL DEFAULT 'Absent'");
        
        // Note: We cannot reliably revert the data changes
    }
};
