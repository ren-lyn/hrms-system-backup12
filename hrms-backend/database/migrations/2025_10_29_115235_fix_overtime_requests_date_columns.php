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
        // First, make the date column nullable
        Schema::table('overtime_requests', function (Blueprint $table) {
            $table->date('date')->nullable()->change();
            
            // Ensure ot_date column exists and is a date type
            if (!Schema::hasColumn('overtime_requests', 'ot_date')) {
                $table->date('ot_date')->after('date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert the changes if needed
        Schema::table('overtime_requests', function (Blueprint $table) {
            $table->date('date')->nullable(false)->change();
            
            // If we added ot_date, we can drop it
            if (Schema::hasColumn('overtime_requests', 'ot_date')) {
                $table->dropColumn('ot_date');
            }
        });
    }
};
