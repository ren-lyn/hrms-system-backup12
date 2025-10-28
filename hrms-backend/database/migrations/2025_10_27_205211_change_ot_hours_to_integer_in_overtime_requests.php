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
        // Change ot_hours from decimal to integer
        DB::statement('ALTER TABLE overtime_requests MODIFY COLUMN ot_hours INT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to decimal
        DB::statement('ALTER TABLE overtime_requests MODIFY COLUMN ot_hours DECIMAL(5,2) NULL');
    }
};
