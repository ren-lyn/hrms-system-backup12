<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Attendance extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'employee_id', 
        'employee_biometric_id',
        'date', 
        'clock_in', 
        'clock_out', 
        'break_in',
        'break_out',
        'total_hours',
        'overtime_hours',
        'undertime_hours',
        'status',
        'remarks'
    ];

    protected $casts = [
        'date' => 'date',
        'clock_in' => 'datetime:H:i:s',
        'clock_out' => 'datetime:H:i:s',
        'break_in' => 'datetime:H:i:s',
        'break_out' => 'datetime:H:i:s',
        'total_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'undertime_hours' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(EmployeeProfile::class, 'employee_id');
    }

    /**
     * Calculate total work hours
     */
    public function calculateTotalHours()
    {
        if (!$this->clock_in || !$this->clock_out) {
            return 0;
        }

        // Use the attendance date as the base date for time calculations
        $baseDate = $this->date ? $this->date->format('Y-m-d') : Carbon::today()->format('Y-m-d');
        
        $clockIn = Carbon::parse($baseDate . ' ' . Carbon::parse($this->clock_in)->format('H:i:s'));
        $clockOut = Carbon::parse($baseDate . ' ' . Carbon::parse($this->clock_out)->format('H:i:s'));
        
        // If clock out is before clock in, assume it's the next day
        if ($clockOut->lt($clockIn)) {
            $clockOut->addDay();
        }
        
        $totalMinutes = $clockIn->diffInMinutes($clockOut);
        
        // Subtract break time if available
        if ($this->break_out && $this->break_in) {
            $breakOut = Carbon::parse($baseDate . ' ' . Carbon::parse($this->break_out)->format('H:i:s'));
            $breakIn = Carbon::parse($baseDate . ' ' . Carbon::parse($this->break_in)->format('H:i:s'));
            
            // If break in is before break out, assume it's the next day
            if ($breakIn->lt($breakOut)) {
                $breakIn->addDay();
            }
            
            $breakMinutes = $breakOut->diffInMinutes($breakIn);
            $totalMinutes -= $breakMinutes;
        }
        
        return round($totalMinutes / 60, 2);
    }

    /**
     * Calculate overtime hours (assuming 8 hours standard)
     */
    public function calculateOvertimeHours($standardHours = 8)
    {
        $totalHours = $this->total_hours ?? $this->calculateTotalHours();
        return max(0, $totalHours - $standardHours);
    }

    /**
     * Calculate undertime hours (assuming 8 hours standard)
     */
    public function calculateUndertimeHours($standardHours = 8)
    {
        $totalHours = $this->total_hours ?? $this->calculateTotalHours();
        return max(0, $standardHours - $totalHours);
    }

    /**
     * Determine attendance status based on clock in/out times
     */
    public function determineStatus($standardClockIn = '08:00:00', $standardClockOut = '17:00:00')
    {
        if (!$this->clock_in || !$this->clock_out) {
            return 'Absent';
        }

        $clockInTime = Carbon::parse($this->clock_in);
        $clockOutTime = Carbon::parse($this->clock_out);
        $standardIn = Carbon::parse($standardClockIn);
        $standardOut = Carbon::parse($standardClockOut);
        $overtimeThreshold = Carbon::parse('18:00:00'); // 6 PM

        // Check if clocked in late (after 8:00 AM)
        $isLate = $clockInTime->gt($standardIn);
        
        // Check if clocked out early (before 5:00 PM)
        $isEarlyOut = $clockOutTime->lt($standardOut);
        
        // Check if clocked in at 9 AM or later
        $isTooLate = $clockInTime->gte(Carbon::parse('09:00:00'));
        
        // Check if clocked out at 6 PM or later (overtime)
        $isOvertime = $clockOutTime->gte($overtimeThreshold);

        // Determine status based on combinations
        // Priority: Overtime > Late > Undertime > Present
        
        if ($isOvertime && !$isLate && !$isEarlyOut) {
            // Clocked in on time (8am or earlier) and clocked out at 6pm+
            return 'Overtime';
        } elseif ($isTooLate) {
            // Clocked in at 9am or later
            return 'Undertime';
        } elseif ($isEarlyOut) {
            // Clocked out before 5pm
            return 'Undertime';
        } elseif ($isLate) {
            // Clocked in after 8am but before 9am
            return 'Late';
        } else {
            // Clocked in on time and clocked out in normal range
            return 'Present';
        }
    }
}
