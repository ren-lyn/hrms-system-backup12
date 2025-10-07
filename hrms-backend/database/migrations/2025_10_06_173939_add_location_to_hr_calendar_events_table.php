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
        Schema::table('hr_calendar_events', function (Blueprint $table) {
            $table->string('location')->nullable()->after('blocks_leave_submissions');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hr_calendar_events', function (Blueprint $table) {
            $table->dropColumn('location');
        });
    }
};
