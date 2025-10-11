<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
	use HasFactory;

	protected $fillable = [
		'name',
		'date',
		'type', // Regular or Special
		'is_movable',
		'moved_date',
		'is_working_day', // if true, work is expected (no automatic no-work)
	];

	protected $casts = [
		'date' => 'date',
		'moved_date' => 'date',
		'is_movable' => 'boolean',
		'is_working_day' => 'boolean',
	];

	public static function isHolidayDate(string $date): ?self
	{
		return self::whereDate('date', $date)
			->orWhereDate('moved_date', $date)
			->first();
	}
}




