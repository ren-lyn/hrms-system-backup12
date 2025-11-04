<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if table exists before altering
        if (Schema::hasTable('cash_advance_requests')) {
            Schema::table('cash_advance_requests', function (Blueprint $table) {
                if (!Schema::hasColumn('cash_advance_requests', 'remaining_balance')) {
                    $table->decimal('remaining_balance', 10, 2)->nullable()->after('amount_ca');
                }
            });

            // Set initial balance for existing approved cash advances
            DB::statement('UPDATE cash_advance_requests SET remaining_balance = amount_ca WHERE status = "approved" AND remaining_balance IS NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('cash_advance_requests')) {
            Schema::table('cash_advance_requests', function (Blueprint $table) {
                if (Schema::hasColumn('cash_advance_requests', 'remaining_balance')) {
                    $table->dropColumn('remaining_balance');
                }
            });
        }
    }
};


