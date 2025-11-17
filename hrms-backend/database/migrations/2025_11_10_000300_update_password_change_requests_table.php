<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('password_change_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('password_change_requests', 'decision_notes')) {
                $table->text('decision_notes')->nullable()->after('reason');
            }

            if (!Schema::hasColumn('password_change_requests', 'approved_by')) {
                $table->unsignedBigInteger('approved_by')->nullable()->after('status');
            }

            if (!Schema::hasColumn('password_change_requests', 'decision_at')) {
                $table->timestamp('decision_at')->nullable()->after('approved_by');
            }

            if (!Schema::hasColumn('password_change_requests', 'reset_token_sent_at')) {
                $table->timestamp('reset_token_sent_at')->nullable()->after('decision_at');
            }

            if (!Schema::hasColumn('password_change_requests', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('reset_token_sent_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('password_change_requests', function (Blueprint $table) {
            if (Schema::hasColumn('password_change_requests', 'decision_notes')) {
                $table->dropColumn('decision_notes');
            }

            if (Schema::hasColumn('password_change_requests', 'approved_by')) {
                $table->dropColumn('approved_by');
            }

            if (Schema::hasColumn('password_change_requests', 'decision_at')) {
                $table->dropColumn('decision_at');
            }

            if (Schema::hasColumn('password_change_requests', 'reset_token_sent_at')) {
                $table->dropColumn('reset_token_sent_at');
            }

            if (Schema::hasColumn('password_change_requests', 'completed_at')) {
                $table->dropColumn('completed_at');
            }
        });
    }
};




