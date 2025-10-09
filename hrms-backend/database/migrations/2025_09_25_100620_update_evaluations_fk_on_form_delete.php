<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Clean up any partial columns from a failed prior attempt
        if (Schema::hasColumn('evaluations', 'evaluation_form_id_new')) {
            Schema::table('evaluations', function (Blueprint $table) {
                $table->dropColumn('evaluation_form_id_new');
            });
        }

        // Make the existing column nullable, then set FK to nullOnDelete
        if (Schema::hasColumn('evaluations', 'evaluation_form_id')) {
            // Drop existing FK if present
            try {
                Schema::table('evaluations', function (Blueprint $table) {
                    $table->dropForeign(['evaluation_form_id']);
                });
            } catch (\Throwable $e) {
                // ignore if it doesn't exist
            }

            // Alter column to be nullable without requiring DBAL
            if (DB::getDriverName() === 'sqlite') {
                // For SQLite, we can't modify columns easily, so we'll skip the MODIFY
                // The column will remain as is
            } else {
                DB::statement('ALTER TABLE evaluations MODIFY evaluation_form_id BIGINT UNSIGNED NULL');
            }

            // Recreate FK with SET NULL on delete
            Schema::table('evaluations', function (Blueprint $table) {
                $table->foreign('evaluation_form_id')->references('id')->on('evaluation_forms')->nullOnDelete();
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('evaluations', 'evaluation_form_id')) {
            try {
                Schema::table('evaluations', function (Blueprint $table) {
                    $table->dropForeign(['evaluation_form_id']);
                });
            } catch (\Throwable $e) {
                // ignore
            }

            // Revert to NOT NULL and cascade on delete
            if (DB::getDriverName() === 'sqlite') {
                // For SQLite, we can't modify columns easily, so we'll skip the MODIFY
            } else {
                DB::statement('ALTER TABLE evaluations MODIFY evaluation_form_id BIGINT UNSIGNED NOT NULL');
            }
            Schema::table('evaluations', function (Blueprint $table) {
                $table->foreign('evaluation_form_id')->references('id')->on('evaluation_forms')->onDelete('cascade');
            });
        }
    }
};
