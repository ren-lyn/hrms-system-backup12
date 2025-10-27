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
        // This is a no-op since the columns already exist
        // The columns were likely added by a previous migration
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to drop columns to prevent data loss
    }
};
