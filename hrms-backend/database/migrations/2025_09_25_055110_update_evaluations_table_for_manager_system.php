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
        Schema::table('evaluations', function (Blueprint $table) {
            // Check if columns exist before adding
            if (!Schema::hasColumn('evaluations', 'percentage_score')) {
                $table->decimal('percentage_score', 5, 2)->nullable()->after('average_score');
            }
            
            if (!Schema::hasColumn('evaluations', 'evaluation_period_start')) {
                $table->date('evaluation_period_start')->nullable()->after('next_evaluation_date');
            }
            
            if (!Schema::hasColumn('evaluations', 'evaluation_period_end')) {
                $table->date('evaluation_period_end')->nullable()->after('evaluation_period_start');
            }
            
            if (!Schema::hasColumn('evaluations', 'is_passed')) {
                $table->boolean('is_passed')->default(false)->after('percentage_score');
            }
            
            if (!Schema::hasColumn('evaluations', 'passing_threshold')) {
                $table->integer('passing_threshold')->default(42)->after('is_passed');
            }
            
            if (!Schema::hasColumn('evaluations', 'employee_notified')) {
                $table->boolean('employee_notified')->default(false)->after('passing_threshold');
            }
            
            if (!Schema::hasColumn('evaluations', 'notified_at')) {
                $table->timestamp('notified_at')->nullable()->after('employee_notified');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluations', function (Blueprint $table) {
            $table->dropIndex('eval_employee_manager_period_idx');
            $table->dropColumn([
                'percentage_score',
                'evaluation_period_start',
                'evaluation_period_end',
                'is_passed',
                'passing_threshold',
                'employee_notified',
                'notified_at'
            ]);
        });
    }
};
