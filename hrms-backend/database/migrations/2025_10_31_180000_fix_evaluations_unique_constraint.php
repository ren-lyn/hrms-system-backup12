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
        // Get all foreign keys on evaluations table
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'evaluations' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");
        
        // Drop all foreign keys temporarily
        foreach ($foreignKeys as $fk) {
            try {
                DB::statement("ALTER TABLE evaluations DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
            } catch (\Exception $e) {
                // Ignore if it doesn't exist
            }
        }
        
        // Drop the problematic unique constraint
        DB::statement('ALTER TABLE evaluations DROP INDEX eval_form_emp_mgr_created_unique');
        
        // Recreate foreign keys
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_evaluation_form_id_foreign FOREIGN KEY (evaluation_form_id) REFERENCES evaluation_forms(id) ON DELETE SET NULL');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_employee_id_foreign FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_manager_id_foreign FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE');
        
        // Add a proper unique constraint using evaluation_period_start instead
        Schema::table('evaluations', function (Blueprint $table) {
            // This prevents duplicate evaluations for the same employee/manager/period
            $table->unique(
                ['evaluation_form_id', 'employee_id', 'manager_id', 'evaluation_period_start'],
                'eval_form_emp_mgr_period_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            // Drop the new constraint
            $table->dropUnique('eval_form_emp_mgr_period_unique');
        });
        
        // Get all foreign keys on evaluations table
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'evaluations' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");
        
        // Drop all foreign keys temporarily
        foreach ($foreignKeys as $fk) {
            try {
                DB::statement("ALTER TABLE evaluations DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
            } catch (\Exception $e) {
                // Ignore if it doesn't exist
            }
        }
        
        // Re-add the old constraint
        DB::statement('ALTER TABLE evaluations ADD UNIQUE INDEX eval_form_emp_mgr_created_unique (evaluation_form_id, employee_id, manager_id, created_at)');
        
        // Recreate foreign keys
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_evaluation_form_id_foreign FOREIGN KEY (evaluation_form_id) REFERENCES evaluation_forms(id) ON DELETE SET NULL');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_employee_id_foreign FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE evaluations ADD CONSTRAINT evaluations_manager_id_foreign FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE');
    }
};

