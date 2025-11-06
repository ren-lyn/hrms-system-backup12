<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\EmployeeProfile;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class AttendanceRecordSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates attendance records for July, August, and September
     */
    public function run(): void
    {
        // Get all employees with active status
        $employees = EmployeeProfile::where(function($query) {
            $query->whereNull('status')
                  ->orWhere('status', 'active');
        })->get();

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found. Please seed employees first.');
            return;
        }

        $this->command->info("Found {$employees->count()} employees. Generating attendance records...");

        // Define months: July, August, September
        // Use current year, or previous year if current month is before July
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;
        
        // If we're before July, use previous year
        $year = ($currentMonth < 7) ? $currentYear - 1 : $currentYear;
        
        $months = [
            ['year' => $year, 'month' => 7], // July
            ['year' => $year, 'month' => 8], // August
            ['year' => $year, 'month' => 9], // September
        ];

        $bar = $this->command->getOutput()->createProgressBar($employees->count() * 3); // 3 months
        $bar->start();

        foreach ($employees as $employee) {
            foreach ($months as $monthData) {
                $this->generateAttendanceForMonth($employee, $monthData['year'], $monthData['month']);
                $bar->advance();
            }
        }

        $bar->finish();
        $this->command->newLine();
        $this->command->info("Successfully generated attendance records for {$employees->count()} employees across 3 months.");
    }

    /**
     * Generate attendance records for a specific month
     */
    private function generateAttendanceForMonth(EmployeeProfile $employee, int $year, int $month): void
    {
        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth();
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            $dayOfWeek = $currentDate->dayOfWeek; // 0 = Sunday, 6 = Saturday

            // Skip Sundays (rest day)
            if ($dayOfWeek === Carbon::SUNDAY) {
                $currentDate->addDay();
                continue;
            }

            // Generate attendance record
            $this->generateAttendanceRecord($employee, $currentDate->copy());
            
            $currentDate->addDay();
        }
    }

    /**
     * Generate a single attendance record with random scenarios
     */
    private function generateAttendanceRecord(EmployeeProfile $employee, Carbon $date): void
    {
        // Random chance for different scenarios
        $scenario = rand(1, 100);

        // 5% chance of being absent
        if ($scenario <= 5) {
            Attendance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'date' => $date->format('Y-m-d'),
                ],
                [
                    'employee_biometric_id' => $employee->employee_id ?? null,
                    'status' => 'Absent',
                    'remarks' => 'Absent',
                ]
            );
            return;
        }

        // 10% chance of being on leave
        if ($scenario <= 15) {
            Attendance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'date' => $date->format('Y-m-d'),
                ],
                [
                    'employee_biometric_id' => $employee->employee_id ?? null,
                    'status' => 'On Leave',
                    'remarks' => 'On leave',
                ]
            );
            return;
        }

        // Standard work hours
        $standardClockIn = Carbon::createFromTime(8, 0, 0);
        $standardClockOut = Carbon::createFromTime(17, 0, 0);
        $gracePeriodEnd = Carbon::createFromTime(8, 15, 0);

        // Generate clock in time
        $clockInTime = $this->generateClockInTime($standardClockIn, $gracePeriodEnd);
        
        // Generate clock out time based on clock in
        $clockOutTime = $this->generateClockOutTime($standardClockOut, $clockInTime);

        // Calculate break times (1 hour lunch break, typically 12:00-13:00)
        $breakOut = Carbon::createFromTime(12, 0, rand(0, 30), 0); // 12:00 to 12:30
        $breakIn = $breakOut->copy()->addHour(); // 1 hour break

        // Calculate total hours
        $totalHours = $this->calculateTotalHours($clockInTime, $clockOutTime, $breakOut, $breakIn);

        // Calculate overtime and undertime
        $standardHours = 8.0;
        $overtimeHours = max(0, $totalHours - $standardHours);
        $undertimeHours = max(0, $standardHours - $totalHours);

        // Determine status
        $status = $this->determineStatus($clockInTime, $clockOutTime, $standardClockIn, $gracePeriodEnd, $standardClockOut, $overtimeHours, $undertimeHours);

        // Create attendance record
        Attendance::updateOrCreate(
            [
                'employee_id' => $employee->id,
                'date' => $date->format('Y-m-d'),
            ],
            [
                'employee_biometric_id' => $employee->employee_id ?? null,
                'clock_in' => $clockInTime->format('H:i:s'),
                'clock_out' => $clockOutTime->format('H:i:s'),
                'break_out' => $breakOut->format('H:i:s'),
                'break_in' => $breakIn->format('H:i:s'),
                'total_hours' => round($totalHours, 2),
                'overtime_hours' => round($overtimeHours, 2),
                'undertime_hours' => round($undertimeHours, 2),
                'status' => $status,
                'remarks' => $this->generateRemarks($status, $clockInTime, $clockOutTime),
            ]
        );
    }

    /**
     * Generate clock in time with random scenarios
     */
    private function generateClockInTime(Carbon $standardClockIn, Carbon $gracePeriodEnd): Carbon
    {
        $scenario = rand(1, 100);

        // 60% chance: On time (8:00 - 8:15)
        if ($scenario <= 60) {
            $minutes = rand(0, 15);
            return $standardClockIn->copy()->addMinutes($minutes);
        }

        // 25% chance: Late (8:16 - 9:30)
        if ($scenario <= 85) {
            $minutesLate = rand(16, 90); // 16 to 90 minutes late
            return $standardClockIn->copy()->addMinutes($minutesLate);
        }

        // 10% chance: Very late (9:31 - 10:30)
        if ($scenario <= 95) {
            $minutesLate = rand(91, 150);
            return $standardClockIn->copy()->addMinutes($minutesLate);
        }

        // 5% chance: Extremely late (10:31 - 11:00)
        $minutesLate = rand(151, 180);
        return $standardClockIn->copy()->addMinutes($minutesLate);
    }

    /**
     * Generate clock out time based on clock in and scenarios
     */
    private function generateClockOutTime(Carbon $standardClockOut, Carbon $clockInTime): Carbon
    {
        $scenario = rand(1, 100);

        // 50% chance: On time (5:00 PM)
        if ($scenario <= 50) {
            return $standardClockOut->copy();
        }

        // 20% chance: Early out / Undertime (4:00 PM - 4:59 PM)
        if ($scenario <= 70) {
            $minutesEarly = rand(1, 60);
            return $standardClockOut->copy()->subMinutes($minutesEarly);
        }

        // 20% chance: Overtime (5:01 PM - 7:00 PM)
        if ($scenario <= 90) {
            $minutesOT = rand(1, 120); // 1 to 120 minutes overtime
            return $standardClockOut->copy()->addMinutes($minutesOT);
        }

        // 10% chance: Extended overtime (7:01 PM - 9:00 PM)
        $minutesOT = rand(121, 240);
        return $standardClockOut->copy()->addMinutes($minutesOT);
    }

    /**
     * Calculate total work hours
     */
    private function calculateTotalHours(Carbon $clockIn, Carbon $clockOut, Carbon $breakOut, Carbon $breakIn): float
    {
        // Calculate total minutes
        $totalMinutes = $clockIn->diffInMinutes($clockOut);

        // Subtract break time (1 hour)
        $breakMinutes = $breakOut->diffInMinutes($breakIn);
        $workMinutes = $totalMinutes - $breakMinutes;

        // Convert to hours
        return round($workMinutes / 60, 2);
    }

    /**
     * Determine attendance status based on times
     */
    private function determineStatus(
        Carbon $clockIn,
        Carbon $clockOut,
        Carbon $standardClockIn,
        Carbon $gracePeriodEnd,
        Carbon $standardClockOut,
        float $overtimeHours,
        float $undertimeHours
    ): string {
        $isLate = $clockIn->gt($gracePeriodEnd);
        $isEarlyOut = $clockOut->lt($standardClockOut);
        $hasOvertime = $overtimeHours > 0;
        $hasUndertime = $undertimeHours > 0;

        // Late + Overtime
        if ($isLate && $hasOvertime && !$isEarlyOut) {
            return 'Late (Overtime)';
        }

        // Late + Undertime
        if ($isLate && ($hasUndertime || $isEarlyOut)) {
            return 'Late (Undertime)';
        }

        // Just Late
        if ($isLate && !$hasOvertime && !$hasUndertime) {
            return 'Late';
        }

        // Just Overtime
        if (!$isLate && $hasOvertime && !$isEarlyOut) {
            return 'Overtime';
        }

        // Just Undertime (early out)
        if (!$isLate && ($hasUndertime || $isEarlyOut)) {
            return 'Undertime';
        }

        // Present (on time, no overtime, no undertime)
        return 'Present';
    }

    /**
     * Generate remarks based on status
     */
    private function generateRemarks(string $status, Carbon $clockIn, Carbon $clockOut): ?string
    {
        $remarks = [];

        if ($clockIn->gt(Carbon::createFromTime(8, 15))) {
            $lateMinutes = Carbon::createFromTime(8, 15)->diffInMinutes($clockIn);
            $remarks[] = "Late by {$lateMinutes} minutes";
        }

        if ($clockOut->lt(Carbon::createFromTime(17, 0))) {
            $earlyMinutes = $clockOut->diffInMinutes(Carbon::createFromTime(17, 0));
            $remarks[] = "Left {$earlyMinutes} minutes early";
        }

        if ($clockOut->gt(Carbon::createFromTime(17, 0))) {
            $otMinutes = Carbon::createFromTime(17, 0)->diffInMinutes($clockOut);
            $remarks[] = "Overtime: {$otMinutes} minutes";
        }

        return !empty($remarks) ? implode('. ', $remarks) : null;
    }
}
