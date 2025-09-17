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
            // Personal information fields
            $table->string('marital_status')->nullable()->after('last_name');
            $table->string('religion')->nullable()->after('marital_status');
            $table->string('place_of_birth')->nullable()->after('religion');
            $table->date('birth_date')->nullable()->after('place_of_birth');
            $table->string('blood_type')->nullable()->after('birth_date');
            $table->string('gender')->nullable()->after('blood_type');
            
            // Address fields
            $table->string('province')->nullable()->after('address');
            $table->string('barangay')->nullable()->after('province');
            $table->string('city')->nullable()->after('barangay');
            $table->string('postal_code')->nullable()->after('city');
            
            // Contact fields
            $table->string('phone')->nullable()->after('contact_number');
            $table->string('emergency_contact_name')->nullable()->after('phone');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            
            // Employment fields
            $table->string('employee_id')->nullable()->after('user_id');
            $table->date('hire_date')->nullable()->after('department');
            $table->string('employment_status')->nullable()->after('hire_date');
            $table->string('job_title')->nullable()->after('employment_status');
            $table->string('sss')->nullable()->after('job_title');
            $table->string('philhealth')->nullable()->after('sss');
            $table->string('pagibig')->nullable()->after('philhealth');
            
            // Edit count tracking
            $table->integer('marital_status_edit_count')->default(0)->after('pagibig');
            $table->integer('address_edit_count')->default(0)->after('marital_status_edit_count');
            $table->integer('contact_edit_count')->default(0)->after('address_edit_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'marital_status',
                'religion',
                'place_of_birth',
                'birth_date',
                'blood_type',
                'gender',
                'province',
                'barangay',
                'city',
                'postal_code',
                'phone',
                'emergency_contact_name',
                'emergency_contact_phone',
                'employee_id',
                'hire_date',
                'employment_status',
                'job_title',
                'sss',
                'philhealth',
                'pagibig',
                'marital_status_edit_count',
                'address_edit_count',
                'contact_edit_count'
            ]);
        });
    }
};
