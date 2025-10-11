<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAttendancesTable extends Migration
{
    public function up()
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employee_profiles')->onDelete('cascade');
            $table->date('date');
            $table->time('clock_in')->nullable();
            $table->time('clock_out')->nullable();
            $table->enum('status', ['Present', 'Absent', 'Late', 'On Leave', 'Holiday (No Work)', 'Holiday (Worked)'])->default('Absent');
            $table->timestamps();

            $table->unique(['employee_id', 'date']); // Ensure one record per employee per day
        });
    }

    public function down()
    {
        Schema::dropIfExists('attendances');
    }
}
