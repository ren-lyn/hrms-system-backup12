<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
	public function up(): void
	{
		Schema::create('holidays', function (Blueprint $table) {
			$table->id();
			$table->string('name');
			$table->date('date');
			$table->enum('type', ['Regular', 'Special'])->default('Regular');
			$table->boolean('is_movable')->default(false);
			$table->date('moved_date')->nullable();
			$table->boolean('is_working_day')->default(false);
			$table->timestamps();

			$table->index(['date']);
			$table->index(['moved_date']);
		});
	}

	public function down(): void
	{
		Schema::dropIfExists('holidays');
	}
};




