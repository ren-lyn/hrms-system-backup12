<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeShift extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_time',
        'end_time',
        'working_days',
        'break_duration_minutes',
        'is_active'
    ];

    protected $casts = [
        'working_days' => 'array',
        'start_time' => 'datetime:H:i:s',
        'end_time' => 'datetime:H:i:s',
        'is_active' => 'boolean'
    ];

    public function employees()
    {
        return $this->hasMany(EmployeeProfile::class);
    }

    /**
     * Check if a given day of week is a working day
     * 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
     */
    public function isWorkingDay($dayOfWeek)
    {
        return in_array($dayOfWeek, $this->working_days ?? []);
    }

    /**
     * Get working days as readable format
     */
    public function getWorkingDaysTextAttribute()
    {
        $dayNames = [
            1 => 'Monday',
            2 => 'Tuesday', 
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
            7 => 'Sunday'
        ];

        $workingDays = collect($this->working_days ?? [])
            ->map(fn($day) => $dayNames[$day] ?? "Day {$day}")
            ->join(', ');

        return $workingDays ?: 'No working days set';
    }
}