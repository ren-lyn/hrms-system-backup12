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
        if (!Schema::hasTable('applications')) {
            return;
        }

        Schema::table('applications', function (Blueprint $table) {
            if (!Schema::hasColumn('applications', 'documents_approved_at')) {
                $afterColumn = Schema::hasColumn('applications', 'documents_locked_at')
                    ? 'documents_locked_at'
                    : (Schema::hasColumn('applications', 'documents_deadline') ? 'documents_deadline' : 'updated_at');

                $table->datetime('documents_approved_at')->nullable()->after($afterColumn);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('applications')) {
            return;
        }

        Schema::table('applications', function (Blueprint $table) {
            if (Schema::hasColumn('applications', 'documents_approved_at')) {
                $table->dropColumn('documents_approved_at');
            }
        });
    }
};

