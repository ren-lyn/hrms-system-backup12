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
        Schema::table('onboarding_records', function (Blueprint $table) {
            // Start date fields
            $table->date('official_start_date')->nullable()->after('additional_notes');
            $table->string('reporting_manager')->nullable()->after('official_start_date');
            $table->string('work_schedule')->nullable()->after('reporting_manager');
            $table->string('employment_type')->nullable()->after('work_schedule');
            $table->text('additional_instructions')->nullable()->after('employment_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('onboarding_records', function (Blueprint $table) {
            $table->dropColumn([
                'official_start_date',
                'reporting_manager',
                'work_schedule',
                'employment_type',
                'additional_instructions'
            ]);
        });
    }
};

