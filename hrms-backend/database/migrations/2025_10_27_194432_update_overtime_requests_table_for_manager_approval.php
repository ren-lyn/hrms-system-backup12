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
        Schema::table('overtime_requests', function (Blueprint $table) {
            // Add employee_id reference to employee_profiles
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained('employee_profiles')->onDelete('cascade');
            
            // Add ot_hours and ot_date fields (to match frontend)
            $table->date('ot_date')->nullable()->after('date');
            $table->integer('ot_hours')->nullable()->after('end_time'); // Integer only, no decimals
            
            // Add manager approval fields
            $table->foreignId('manager_reviewed_by')->nullable()->after('reviewed_by')->constrained('users')->onDelete('set null');
            $table->timestamp('manager_reviewed_at')->nullable()->after('manager_reviewed_by');
            
            // Add HR approval fields (keep existing reviewed_by for HR)
            $table->foreignId('hr_reviewed_by')->nullable()->after('manager_reviewed_at')->constrained('users')->onDelete('set null');
            $table->timestamp('hr_reviewed_at')->nullable()->after('hr_reviewed_by');
            
            // Add rejection reason field
            $table->text('rejection_reason')->nullable()->after('admin_notes');
        });
        
        // Update the status enum to include manager_approved and hr_approved
        DB::statement("ALTER TABLE overtime_requests MODIFY COLUMN status ENUM('pending', 'manager_approved', 'hr_approved', 'rejected') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('overtime_requests', function (Blueprint $table) {
            $table->dropForeign(['employee_id']);
            $table->dropColumn('employee_id');
            $table->dropColumn('ot_date');
            $table->dropColumn('ot_hours');
            $table->dropForeign(['manager_reviewed_by']);
            $table->dropColumn('manager_reviewed_by');
            $table->dropColumn('manager_reviewed_at');
            $table->dropForeign(['hr_reviewed_by']);
            $table->dropColumn('hr_reviewed_by');
            $table->dropColumn('hr_reviewed_at');
            $table->dropColumn('rejection_reason');
        });
        
        // Revert status enum back to original
        DB::statement("ALTER TABLE overtime_requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
    }
};
