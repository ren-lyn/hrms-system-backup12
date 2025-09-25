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
        // Use raw SQL to modify the enum column
        DB::statement("ALTER TABLE applications MODIFY status ENUM('Applied', 'Pending', 'Under Review', 'Interview', 'Hired', 'Rejected') DEFAULT 'Applied'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE applications MODIFY status ENUM('Applied', 'Interview', 'Hired', 'Rejected') DEFAULT 'Applied'");
    }
};
