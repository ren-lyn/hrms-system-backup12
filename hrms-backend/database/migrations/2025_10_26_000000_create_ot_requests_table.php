<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('ot_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->decimal('duration', 5, 2); // in hours
            $table->text('reason');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('action_by')->nullable()->constrained('users');
            $table->timestamp('action_at')->nullable();
            $table->timestamps();
            
            // Add index for better query performance
            $table->index(['user_id', 'date', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('ot_requests');
    }
};
