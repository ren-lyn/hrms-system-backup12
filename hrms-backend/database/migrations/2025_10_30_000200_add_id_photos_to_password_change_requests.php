<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('password_change_requests', function (Blueprint $table) {
            $table->string('id_photo_1_path')->nullable();
            $table->string('id_photo_2_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('password_change_requests', function (Blueprint $table) {
            $table->dropColumn(['id_photo_1_path', 'id_photo_2_path']);
        });
    }
};










