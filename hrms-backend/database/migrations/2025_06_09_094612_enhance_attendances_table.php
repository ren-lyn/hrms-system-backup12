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
        Schema::table('attendances', function (Blueprint $table) {
            // Add biometric-related fields
            $table->string('employee_biometric_id')->nullable()->after('employee_id');
            $table->time('break_out')->nullable()->after('clock_out');
            $table->time('break_in')->nullable()->after('break_out');
            $table->decimal('total_hours', 5, 2)->nullable()->after('break_in');
            $table->decimal('overtime_hours', 5, 2)->default(0)->after('total_hours');
            $table->decimal('undertime_hours', 5, 2)->default(0)->after('overtime_hours');
            $table->text('remarks')->nullable()->after('status');
            
            // Add index for better performance
            $table->index(['date', 'employee_id']);
            $table->index('employee_biometric_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn([
                'employee_biometric_id',
                'break_out',
                'break_in', 
                'total_hours',
                'overtime_hours',
                'undertime_hours',
                'remarks'
            ]);
            
            $table->dropIndex(['date', 'employee_id']);
            $table->dropIndex(['employee_biometric_id']);
        });
    }
};