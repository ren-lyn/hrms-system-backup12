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
        Schema::table('benefit_claims', function (Blueprint $table) {
            // Change supporting_documents_path from string to text to accommodate JSON arrays
            $table->text('supporting_documents_path')->nullable()->change();
            // Change supporting_documents_name from string to text to accommodate JSON arrays
            $table->text('supporting_documents_name')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('benefit_claims', function (Blueprint $table) {
            // Revert back to string (VARCHAR 255)
            $table->string('supporting_documents_path')->nullable()->change();
            $table->string('supporting_documents_name')->nullable()->change();
        });
    }
};




