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

        $clockIn = Carbon::parse($this->clock_in);
        $clockOut = Carbon::parse($this->clock_out);
        
        $totalMinutes = $clockOut->diffInMinutes($clockIn);
        
        // Subtract break time if available
        if ($this->break_out && $this->break_in) {
            $breakOut = Carbon::parse($this->break_out);
            $breakIn = Carbon::parse($this->break_in);
            $breakMinutes = $breakIn->diffInMinutes($breakOut);
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
     * Determine attendance status based on time
     */
    public function determineStatus($standardClockIn = '08:00:00')
    {
        if (!$this->clock_in) {
            return 'Absent';
        }

        $clockIn = Carbon::parse($this->clock_in);
        $standardTime = Carbon::parse($standardClockIn);

        if ($clockIn->gt($standardTime)) {
            return 'Late';
        }

        return 'Present';
    }
}
