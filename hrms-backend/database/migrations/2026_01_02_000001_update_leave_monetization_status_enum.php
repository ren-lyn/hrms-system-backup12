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
        // Update the enum to only include pending, approved, rejected
        // First, update any 'processed' status to 'approved'
        DB::table('leave_monetization_requests')
            ->where('status', 'processed')
            ->update(['status' => 'approved']);

        // Alter the enum column
        DB::statement("ALTER TABLE leave_monetization_requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'");
        
        // Remove processed_at column if it exists
        if (Schema::hasColumn('leave_monetization_requests', 'processed_at')) {
            Schema::table('leave_monetization_requests', function (Blueprint $table) {
                $table->dropColumn('processed_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add processed_at column back
        Schema::table('leave_monetization_requests', function (Blueprint $table) {
            $table->timestamp('processed_at')->nullable()->after('approved_at');
        });

        // Restore the enum with processed
        DB::statement("ALTER TABLE leave_monetization_requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'processed') DEFAULT 'pending'");
    }
};



