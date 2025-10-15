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
        Schema::create('employee_shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g., "Regular Shift", "Night Shift"
            $table->time('start_time'); // e.g., 08:00:00
            $table->time('end_time'); // e.g., 17:00:00
            $table->json('working_days'); // e.g., [1,2,3,4,5,6] for Monday-Saturday
            $table->integer('break_duration_minutes')->default(60); // 1 hour break
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_shifts');
    }
};