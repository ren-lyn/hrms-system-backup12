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
        Schema::create('employee_benefit_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employee_profiles')->onDelete('cascade');
            $table->foreignId('benefit_id')->constrained('benefits')->onDelete('cascade');
            $table->decimal('custom_amount', 10, 2)->nullable(); // Override default amount if needed
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique(['employee_id', 'benefit_id'], 'emp_benefit_unique');
            $table->index('employee_id');
            $table->index('benefit_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_benefit_assignments');
    }
};