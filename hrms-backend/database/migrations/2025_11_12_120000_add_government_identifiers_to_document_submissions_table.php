<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_submissions', function (Blueprint $table) {
            $table->string('sss_number', 50)->nullable()->after('file_size');
            $table->string('philhealth_number', 50)->nullable()->after('sss_number');
            $table->string('pagibig_number', 50)->nullable()->after('philhealth_number');
            $table->string('tin_number', 50)->nullable()->after('pagibig_number');
        });
    }

    public function down(): void
    {
        Schema::table('document_submissions', function (Blueprint $table) {
            $table->dropColumn([
                'sss_number',
                'philhealth_number',
                'pagibig_number',
                'tin_number',
            ]);
        });
    }
};


