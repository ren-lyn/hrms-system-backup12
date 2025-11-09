<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_submissions', function (Blueprint $table) {
            $table->string('document_type')->nullable()->after('document_requirement_id');
            $table->index(['application_id', 'document_type'], 'document_submissions_app_doc_type_idx');
        });
    }

    public function down(): void
    {
        Schema::table('document_submissions', function (Blueprint $table) {
            $table->dropIndex('document_submissions_app_doc_type_idx');
            $table->dropColumn('document_type');
        });
    }
};

