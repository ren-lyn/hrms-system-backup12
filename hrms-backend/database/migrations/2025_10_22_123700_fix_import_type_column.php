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
        Schema::table('attendance_imports', function (Blueprint $table) {
            // This will ensure the column has a default value in the database
            $table->string('import_type')->default('weekly')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_imports', function (Blueprint $table) {
            // Revert the change if needed
            $table->string('import_type')->default(null)->change();
        });
    }
};
