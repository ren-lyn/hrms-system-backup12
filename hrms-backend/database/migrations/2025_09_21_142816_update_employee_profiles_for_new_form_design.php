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
            // Add new personal information fields
            $table->string('nickname')->nullable()->after('last_name');
            $table->integer('age')->nullable()->after('birth_date');
            
            // Update civil status to use correct enum values
            $table->enum('civil_status', ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'])->nullable()->after('address');
            
            // Ensure gender has correct enum values (if not already set)
            // Note: We'll handle this in the controller validation instead of changing existing data
            
            // Add TIN number field
            $table->string('tin_no')->nullable()->after('pagibig');
            
            // Add tenurity field for employment overview
            $table->string('tenurity')->nullable()->after('employment_status');
            
            // Add termination fields (optional, only filled when employee leaves)
            $table->date('termination_date')->nullable()->after('tenurity');
            $table->string('termination_reason')->nullable()->after('termination_date');
            $table->text('termination_remarks')->nullable()->after('termination_reason');
            
            // Add edit count fields for the 3-edit limit
            $table->integer('name_edit_count')->default(0)->after('termination_remarks');
            $table->integer('nickname_edit_count')->default(0)->after('name_edit_count');
            $table->integer('civil_status_edit_count')->default(0)->after('nickname_edit_count');
            $table->integer('emergency_contact_edit_count')->default(0)->after('civil_status_edit_count');
            
            // Drop the old marital_status column if it exists and rename civil_status
            // Note: We'll handle this carefully to preserve data
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'nickname',
                'age',
                'civil_status',
                'tin_no',
                'tenurity',
                'termination_date',
                'termination_reason',
                'termination_remarks',
                'name_edit_count',
                'nickname_edit_count',
                'civil_status_edit_count',
                'emergency_contact_edit_count'
            ]);
        });
    }
};
