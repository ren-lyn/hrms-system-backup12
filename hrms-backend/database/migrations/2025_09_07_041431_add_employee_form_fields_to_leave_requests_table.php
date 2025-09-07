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
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('company')->nullable()->after('employee_id');
            $table->string('department')->nullable()->after('company');
            $table->string('terms')->default('with PAY')->after('type'); // 'with PAY' or 'without PAY'
            $table->enum('leave_category', ['Service Incentive Leave (SIL)', 'Emergency Leave (EL)'])->nullable()->after('terms');
            $table->integer('total_days')->nullable()->after('to');
            $table->decimal('total_hours', 5, 2)->nullable()->after('total_days');
            $table->timestamp('date_filed')->nullable()->after('total_hours');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['company', 'department', 'terms', 'leave_category', 'total_days', 'total_hours', 'date_filed']);
        });
    }
};
