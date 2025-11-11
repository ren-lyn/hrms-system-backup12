<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('applications', 'documents_snapshot')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->longText('documents_snapshot')->nullable()->after('documents_approved_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('applications', 'documents_snapshot')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->dropColumn('documents_snapshot');
            });
        }
    }
};



