<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('security_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('two_factor_auth')->default(false);
            $table->boolean('password_policy')->default(true);
            $table->boolean('account_lockout')->default(true);
            $table->integer('session_timeout')->default(30);
            $table->integer('password_min_length')->default(8);
            $table->boolean('password_require_special')->default(true);
            $table->boolean('password_require_numbers')->default(true);
            $table->integer('lockout_attempts')->default(5);
            $table->integer('lockout_duration')->default(15);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('security_settings');
    }
};
