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
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->text('reason')->nullable()->after('to');
            $table->string('attachment')->nullable()->after('reason');
            $table->text('admin_remarks')->nullable()->after('attachment');
            $table->timestamp('approved_at')->nullable()->after('admin_remarks');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->unsignedBigInteger('approved_by')->nullable()->after('rejected_at');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['reason', 'attachment', 'admin_remarks', 'approved_at', 'rejected_at', 'approved_by']);
        });
    }
};
