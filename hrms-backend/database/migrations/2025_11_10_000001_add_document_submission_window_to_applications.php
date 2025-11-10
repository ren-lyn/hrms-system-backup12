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
        Schema::table('applications', function (Blueprint $table) {
            $hasOfferAcceptedAt = Schema::hasColumn('applications', 'offer_accepted_at');
            $previousColumn = $hasOfferAcceptedAt ? 'offer_accepted_at' : null;

            if (!Schema::hasColumn('applications', 'documents_start_date')) {
                $column = $table->dateTime('documents_start_date')->nullable();
                if ($previousColumn) {
                    $column->after($previousColumn);
                }
                $previousColumn = 'documents_start_date';
            } else {
                $previousColumn = 'documents_start_date';
            }

            if (!Schema::hasColumn('applications', 'documents_deadline')) {
                $column = $table->dateTime('documents_deadline')->nullable();
                if ($previousColumn) {
                    $column->after($previousColumn);
                }
                $previousColumn = 'documents_deadline';
            } else {
                $previousColumn = 'documents_deadline';
            }

            if (!Schema::hasColumn('applications', 'documents_locked_at')) {
                $column = $table->dateTime('documents_locked_at')->nullable();
                if ($previousColumn) {
                    $column->after($previousColumn);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            if (Schema::hasColumn('applications', 'documents_locked_at')) {
                $table->dropColumn('documents_locked_at');
            }

            if (Schema::hasColumn('applications', 'documents_deadline')) {
                $table->dropColumn('documents_deadline');
            }

            if (Schema::hasColumn('applications', 'documents_start_date')) {
                $table->dropColumn('documents_start_date');
            }
        });
    }
};

