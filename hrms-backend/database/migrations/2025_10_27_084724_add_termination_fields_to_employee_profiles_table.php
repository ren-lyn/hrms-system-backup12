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
        Schema::table('employee_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_profiles', 'status')) {
                $table->enum('status', ['active', 'terminated', 'resigned'])->default('active')->after('salary');
            }
            if (!Schema::hasColumn('employee_profiles', 'termination_date')) {
                $table->date('termination_date')->nullable()->after('status');
            }
            if (!Schema::hasColumn('employee_profiles', 'termination_reason')) {
                $table->string('termination_reason')->nullable()->after('termination_date');
            }
            if (!Schema::hasColumn('employee_profiles', 'termination_notes')) {
                $table->text('termination_notes')->nullable()->after('termination_reason');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $columnsToDrop = [];
            
            if (Schema::hasColumn('employee_profiles', 'termination_notes')) {
                $columnsToDrop[] = 'termination_notes';
            }
            if (Schema::hasColumn('employee_profiles', 'termination_reason')) {
                $columnsToDrop[] = 'termination_reason';
            }
            if (Schema::hasColumn('employee_profiles', 'termination_date')) {
                $columnsToDrop[] = 'termination_date';
            }
            if (Schema::hasColumn('employee_profiles', 'status')) {
                $columnsToDrop[] = 'status';
            }
            
            if (count($columnsToDrop) > 0) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
