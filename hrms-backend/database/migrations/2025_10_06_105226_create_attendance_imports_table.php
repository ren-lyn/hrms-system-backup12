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
        Schema::create('attendance_imports', function (Blueprint $table) {
            $table->id();
            $table->string('filename')->nullable();
            $table->date('period_start');
            $table->date('period_end');
            $table->string('import_type')->default('weekly'); // weekly, monthly, custom
            $table->integer('total_rows')->default(0);
            $table->integer('successful_rows')->default(0);
            $table->integer('failed_rows')->default(0);
            $table->integer('skipped_rows')->default(0);
            $table->text('errors')->nullable(); // JSON encoded errors
            $table->string('status')->default('pending'); // pending, processing, completed, failed
            $table->unsignedBigInteger('imported_by')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('imported_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['period_start', 'period_end']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_imports');
    }
};
