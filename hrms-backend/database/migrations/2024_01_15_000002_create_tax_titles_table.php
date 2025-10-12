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
        Schema::create('tax_titles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('rate', 10, 4); // Can be percentage or fixed amount
            $table->enum('type', ['percentage', 'fixed'])->default('percentage');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('name');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tax_titles');
    }
};
