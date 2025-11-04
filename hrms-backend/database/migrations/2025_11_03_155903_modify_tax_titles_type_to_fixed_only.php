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
        // First, delete any tax titles with percentage type
        DB::table('tax_titles')->where('type', 'percentage')->delete();

        // Modify the enum to only allow 'fixed' using raw SQL
        // This works for both MySQL and MariaDB
        $driver = DB::getDriverName();
        
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE tax_titles MODIFY COLUMN type ENUM('fixed') NOT NULL DEFAULT 'fixed'");
        } elseif ($driver === 'sqlite') {
            // SQLite doesn't support enum, so we'll just ensure all values are 'fixed'
            // SQLite will treat it as text
            DB::table('tax_titles')->where('type', '!=', 'fixed')->update(['type' => 'fixed']);
        } else {
            // For other databases, try the standard Laravel method
            Schema::table('tax_titles', function (Blueprint $table) {
                $table->enum('type', ['fixed'])->default('fixed')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore the original enum with both options using raw SQL
        $driver = DB::getDriverName();
        
        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE tax_titles MODIFY COLUMN type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'fixed'");
        } elseif ($driver === 'sqlite') {
            // SQLite doesn't support enum, just restore text column
            // No action needed as SQLite treats it as text
        } else {
            // For other databases, try the standard Laravel method
            Schema::table('tax_titles', function (Blueprint $table) {
                $table->enum('type', ['percentage', 'fixed'])->default('fixed')->change();
            });
        }
    }
};
