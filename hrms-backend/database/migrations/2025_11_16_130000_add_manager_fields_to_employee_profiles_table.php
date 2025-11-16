<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_profiles', 'manager_name')) {
                $table->string('manager_name')->nullable()->after('employment_status');
            }
            if (!Schema::hasColumn('employee_profiles', 'manager_user_id')) {
                $table->unsignedBigInteger('manager_user_id')->nullable()->after('manager_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('employee_profiles', 'manager_user_id')) {
                $table->dropColumn('manager_user_id');
            }
            if (Schema::hasColumn('employee_profiles', 'manager_name')) {
                $table->dropColumn('manager_name');
            }
        });
    }
};


