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
        Schema::table('payrolls', function (Blueprint $table) {
            // Remove old columns that were replaced by the update migration
            if (Schema::hasColumn('payrolls', 'gross')) {
                $table->dropColumn('gross');
            }
            if (Schema::hasColumn('payrolls', 'deductions')) {
                $table->dropColumn('deductions');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payrolls', function (Blueprint $table) {
            // Add back old columns if reverting
            if (!Schema::hasColumn('payrolls', 'gross')) {
                $table->decimal('gross', 12, 2)->after('period_end');
            }
            if (!Schema::hasColumn('payrolls', 'deductions')) {
                $table->decimal('deductions', 12, 2)->after('gross');
            }
        });
    }
};
