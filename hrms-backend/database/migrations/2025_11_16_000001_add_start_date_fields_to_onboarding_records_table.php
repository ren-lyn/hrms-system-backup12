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
        if (!Schema::hasTable('onboarding_records')) {
            // If table doesn't exist, skip this migration
            // The table should be created by the create_onboarding_records_table migration first
            return;
        }

        // Check which columns need to be added
        $columnsToAdd = [];
        
        if (!Schema::hasColumn('onboarding_records', 'official_start_date')) {
            $columnsToAdd['official_start_date'] = 'date';
        }
        if (!Schema::hasColumn('onboarding_records', 'reporting_manager')) {
            $columnsToAdd['reporting_manager'] = 'string';
        }
        if (!Schema::hasColumn('onboarding_records', 'work_schedule')) {
            $columnsToAdd['work_schedule'] = 'string';
        }
        if (!Schema::hasColumn('onboarding_records', 'employment_type')) {
            $columnsToAdd['employment_type'] = 'string';
        }
        if (!Schema::hasColumn('onboarding_records', 'additional_instructions')) {
            $columnsToAdd['additional_instructions'] = 'text';
        }

        // Only modify table if there are columns to add
        if (!empty($columnsToAdd)) {
            Schema::table('onboarding_records', function (Blueprint $table) use ($columnsToAdd) {
                // Start date fields
                if (isset($columnsToAdd['official_start_date'])) {
                    $table->date('official_start_date')->nullable()->after('additional_notes');
                }
                if (isset($columnsToAdd['reporting_manager'])) {
                    $table->string('reporting_manager')->nullable()->after('official_start_date');
                }
                if (isset($columnsToAdd['work_schedule'])) {
                    $table->string('work_schedule')->nullable()->after('reporting_manager');
                }
                if (isset($columnsToAdd['employment_type'])) {
                    $table->string('employment_type')->nullable()->after('work_schedule');
                }
                if (isset($columnsToAdd['additional_instructions'])) {
                    $table->text('additional_instructions')->nullable()->after('employment_type');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('onboarding_records')) {
            Schema::table('onboarding_records', function (Blueprint $table) {
                // Only drop columns if they exist
                $columnsToDrop = [];
                if (Schema::hasColumn('onboarding_records', 'official_start_date')) {
                    $columnsToDrop[] = 'official_start_date';
                }
                if (Schema::hasColumn('onboarding_records', 'reporting_manager')) {
                    $columnsToDrop[] = 'reporting_manager';
                }
                if (Schema::hasColumn('onboarding_records', 'work_schedule')) {
                    $columnsToDrop[] = 'work_schedule';
                }
                if (Schema::hasColumn('onboarding_records', 'employment_type')) {
                    $columnsToDrop[] = 'employment_type';
                }
                if (Schema::hasColumn('onboarding_records', 'additional_instructions')) {
                    $columnsToDrop[] = 'additional_instructions';
                }
                
                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }
    }
};

