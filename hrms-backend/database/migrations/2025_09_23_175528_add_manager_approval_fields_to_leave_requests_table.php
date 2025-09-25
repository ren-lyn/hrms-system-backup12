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
            $table->timestamp('manager_approved_at')->nullable();
            $table->timestamp('manager_rejected_at')->nullable();
            $table->unsignedBigInteger('manager_approved_by')->nullable();
            $table->text('manager_remarks')->nullable();
            
            $table->foreign('manager_approved_by')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropForeign(['manager_approved_by']);
            $table->dropColumn([
                'manager_approved_at',
                'manager_rejected_at',
                'manager_approved_by',
                'manager_remarks'
            ]);
        });
    }
};
