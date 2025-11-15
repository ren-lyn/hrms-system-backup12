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
        // For MySQL/MariaDB, we need to modify the enum column
        // First, modify the enum to include all new statuses (keeping old ones temporarily)
        DB::statement("ALTER TABLE benefit_claims MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'processing', 'submitted', 'under_review', 'approved_by_hr', 'for_submission_to_agency', 'completed') DEFAULT 'submitted'");
        
        // Now update existing statuses to map to new statuses
        DB::statement("UPDATE benefit_claims SET status = 'submitted' WHERE status = 'pending'");
        DB::statement("UPDATE benefit_claims SET status = 'approved_by_hr' WHERE status = 'approved'");
        DB::statement("UPDATE benefit_claims SET status = 'submitted' WHERE status = 'processing'");
        
        // Finally, modify the enum to only include the new statuses
        DB::statement("ALTER TABLE benefit_claims MODIFY COLUMN status ENUM('submitted', 'under_review', 'approved_by_hr', 'for_submission_to_agency', 'completed', 'rejected') DEFAULT 'submitted'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Map back to old statuses
        DB::statement("UPDATE benefit_claims SET status = 'pending' WHERE status = 'submitted'");
        DB::statement("UPDATE benefit_claims SET status = 'approved' WHERE status = 'approved_by_hr'");
        DB::statement("UPDATE benefit_claims SET status = 'pending' WHERE status IN ('under_review', 'for_submission_to_agency', 'completed')");
        
        // Revert to old enum
        DB::statement("ALTER TABLE benefit_claims MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'processing') DEFAULT 'pending'");
    }
};
