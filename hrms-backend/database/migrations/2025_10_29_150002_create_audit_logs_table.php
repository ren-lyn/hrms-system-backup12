<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('action');
            $table->enum('status', ['success', 'failed']);
            $table->string('ip_address');
            $table->text('user_agent')->nullable();
            $table->json('details')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'created_at']);
            $table->index('action');
            $table->index('status');
        });
    }

    public function down()
    {
        Schema::dropIfExists('audit_logs');
    }
};
