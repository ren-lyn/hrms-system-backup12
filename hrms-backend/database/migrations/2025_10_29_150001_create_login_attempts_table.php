<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('login_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('ip_address');
            $table->text('user_agent')->nullable();
            $table->boolean('success')->default(false);
            $table->integer('attempts_count')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->timestamps();
            
            $table->index(['email', 'ip_address']);
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('login_attempts');
    }
};
