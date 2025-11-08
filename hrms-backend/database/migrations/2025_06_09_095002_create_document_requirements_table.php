<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_requirements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->string('document_name');
            $table->text('description')->nullable();
            $table->boolean('is_required')->default(true);
            $table->string('file_format')->nullable(); // e.g., 'pdf,jpg,png'
            $table->integer('max_file_size_mb')->default(5);
            $table->integer('order')->default(0);
            $table->timestamps();
            
            $table->foreign('application_id')->references('id')->on('applications')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_requirements');
    }
};


