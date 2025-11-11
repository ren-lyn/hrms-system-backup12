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
        })->orderBy('id')->get();

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found. Please seed employees first.');
            return;
        }

        Attendance::truncate();

        $this->command->info("Found {$employees->count()} employees. Generating attendance records...");

        // Define months: January through September
        // Use current year, or previous year if current month is before September
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;
        
        // If we're before September, use previous year
        $year = ($currentMonth < 9) ? $currentYear - 1 : $currentYear;
        
        $months = [
            ['year' => $year, 'month' => 1], // January
            ['year' => $year, 'month' => 2], // February
            ['year' => $year, 'month' => 3], // March
            ['year' => $year, 'month' => 4], // April
            ['year' => $year, 'month' => 5], // May
            ['year' => $year, 'month' => 6], // June
            ['year' => $year, 'month' => 7], // July
            ['year' => $year, 'month' => 8], // August
            ['year' => $year, 'month' => 9], // September
        ];

        $bar = $this->command->getOutput()->createProgressBar($employees->count() * count($months));
        $bar->start();

        $highRiskTarget = 2;
        $mediumRiskTarget = 5;

        foreach ($employees as $index => $employee) {
            if ($index < $highRiskTarget) {
                $riskProfile = 'high';
            } elseif ($index < ($highRiskTarget + $mediumRiskTarget)) {
                $riskProfile = 'medium';
            } else {
                $riskProfile = 'low';
            }

            foreach ($months as $monthData) {
                $this->generateAttendanceForMonth($employee, $monthData['year'], $monthData['month'], $riskProfile);
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
    private function generateAttendanceForMonth(EmployeeProfile $employee, int $year, int $month, string $riskProfile): void
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
            $this->generateAttendanceRecord($employee, $currentDate->copy(), $riskProfile);
            
            $currentDate->addDay();
        }
    }

    /**
     * Generate a single attendance record with random scenarios
     */
    private function generateAttendanceRecord(EmployeeProfile $employee, Carbon $date, string $riskProfile): void
    {
        $riskAdjustments = [
            'low' => [
                'absence_threshold' => 1,
                'leave_threshold' => 5,
                'clock_in_distribution' => [93, 99, 100, 100],
                'clock_out_distribution' => [78, 84, 98, 100],
            ],
            'medium' => [
                'absence_threshold' => 3,
                'leave_threshold' => 9,
                'clock_in_distribution' => [82, 94, 99, 100],
                'clock_out_distribution' => [68, 78, 95, 100],
            ],
            'high' => [
                'absence_threshold' => 12,
                'leave_threshold' => 20,
                'clock_in_distribution' => [45, 70, 88, 100],
                'clock_out_distribution' => [45, 70, 92, 100],
            ],
        ];

        $config = $riskAdjustments[$riskProfile] ?? $riskAdjustments['medium'];

        // Deterministic chance for different scenarios based on risk profile
        $scenario = $this->seededRandom($employee, $date, 1, 100, 'attendance_scenario_'.$riskProfile);

        // Risk-adjusted chance of being absent
        if ($scenario <= $config['absence_threshold']) {
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

        // Risk-adjusted chance of being on leave
        if ($scenario <= $config['leave_threshold']) {
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
        $clockInTime = $this->generateClockInTime($employee, $date, $standardClockIn, $gracePeriodEnd, $riskProfile, $config['clock_in_distribution']);
        
        // Generate clock out time based on clock in
        $clockOutTime = $this->generateClockOutTime($employee, $date, $standardClockOut, $clockInTime, $riskProfile, $config['clock_out_distribution']);

        // Calculate break times (1 hour lunch break, typically 12:00-13:00)
        $breakOut = Carbon::createFromTime(12, 0, $this->seededRandom($employee, $date, 0, 30, 'break_out_seconds'), 0); // 12:00 to 12:30
        $breakIn = $breakOut->copy()->addHour(); // 1 hour break

        // Calculate total hours
        $totalHours = $this->calculateTotalHours($clockInTime, $clockOutTime, $breakOut, $breakIn);

        // Calculate overtime and undertime
        $standardHours = 8.0;
        $overtimeHours = max(0, $totalHours - $standardHours);
        $undertimeHours = max(0, $standardHours - $totalHours);

        // Apply a small grace allowance so employees who stay until the end of shift
        // are not marked undertime due to minor variances (e.g., seconds lost to rounding).
        $undertimeGraceThreshold = 0.25; // 15 minutes
        if (
            $undertimeHours > 0
            && $undertimeHours <= $undertimeGraceThreshold
            && $clockOutTime->gte($standardClockOut)
            && $clockInTime->lte($gracePeriodEnd)
        ) {
            $undertimeHours = 0.0;
            $totalHours = max($totalHours, $standardHours);
        }

        $overtimeThresholdMinutes = 60; // 1 hour (6:00 PM and beyond)
        if ($overtimeHours > 0 && $clockOutTime->diffInMinutes($standardClockOut) < $overtimeThresholdMinutes) {
            $overtimeHours = 0.0;
        }

        $leftEarly = $clockOutTime->lt($standardClockOut);
        if ($undertimeHours > 0 && !$leftEarly) {
            $undertimeHours = 0.0;
        }

        // Determine status
        $status = $this->determineStatus($clockInTime, $clockOutTime, $standardClockIn, $gracePeriodEnd, $standardClockOut);

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
    private function generateClockInTime(
        EmployeeProfile $employee,
        Carbon $date,
        Carbon $standardClockIn,
        Carbon $gracePeriodEnd,
        string $riskProfile,
        array $distribution
    ): Carbon
    {
        $scenario = $this->seededRandom($employee, $date, 1, 100, 'clock_in_scenario');

        // On time or within buffer
        if ($scenario <= $distribution[0]) {
            $minutes = $this->seededRandom($employee, $date, 0, 10, 'clock_in_on_time');
            return $standardClockIn->copy()->addMinutes($minutes);
        }

        // Slight late (8:11 - 8:45)
        if ($scenario <= $distribution[1]) {
            $minutesLate = $this->seededRandom($employee, $date, 11, 45, 'clock_in_late');
            return $standardClockIn->copy()->addMinutes($minutesLate);
        }

        // Very late (8:46 - 9:30)
        if ($scenario <= $distribution[2]) {
            $minutesLate = $this->seededRandom($employee, $date, 46, 90, 'clock_in_very_late');
            return $standardClockIn->copy()->addMinutes($minutesLate);
        }

        // Extremely late (9:31 - 10:30)
        $minutesLate = $this->seededRandom($employee, $date, 91, 150, 'clock_in_extremely_late');
        return $standardClockIn->copy()->addMinutes($minutesLate);
    }

    /**
     * Generate clock out time based on clock in and scenarios
     */
    private function generateClockOutTime(
        EmployeeProfile $employee,
        Carbon $date,
        Carbon $standardClockOut,
        Carbon $clockInTime,
        string $riskProfile,
        array $distribution
    ): Carbon
    {
        $scenario = $this->seededRandom($employee, $date, 1, 100, 'clock_out_scenario');

        if ($scenario <= $distribution[0]) {
            return $standardClockOut->copy();
        }

        if ($scenario <= $distribution[1]) {
            $minutesEarly = $this->seededRandom($employee, $date, 1, 30, 'clock_out_early');
            return $standardClockOut->copy()->subMinutes($minutesEarly);
        }

        if ($scenario <= $distribution[2]) {
            $minutesOT = $this->seededRandom($employee, $date, 1, 90, 'clock_out_ot'); // 1 to 90 minutes overtime
            return $standardClockOut->copy()->addMinutes($minutesOT);
        }

        // Extended overtime (6:31 PM - 8:00 PM)
        $minutesOT = $this->seededRandom($employee, $date, 91, 180, 'clock_out_ext_ot');
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
        Carbon $standardClockOut
    ): string {
        $isLate = $clockIn->gt($gracePeriodEnd);
        $isEarlyOut = $clockOut->lt($standardClockOut);
        $overtimeThreshold = $standardClockOut->copy()->addHour(); // 6:00 PM
        $meetsOvertimeThreshold = $clockOut->gte($overtimeThreshold);

        // Late + Overtime
        if ($isLate && $meetsOvertimeThreshold && !$isEarlyOut) {
            return 'Late (Overtime)';
        }

        // Late + Undertime
        if ($isLate && $isEarlyOut) {
            return 'Late (Undertime)';
        }

        // Just Late
        if ($isLate) {
            return 'Late';
        }

        // Just Overtime
        if (!$isLate && $meetsOvertimeThreshold && !$isEarlyOut) {
            return 'Overtime';
        }

        // Just Undertime (early out)
        if (!$isLate && $isEarlyOut) {
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

    /**
     * Deterministic pseudo-random number generator to keep seeded data consistent
     */
    private function seededRandom(EmployeeProfile $employee, Carbon $date, int $min, int $max, string $context): int
    {
        $range = $max - $min + 1;

        if ($range <= 0) {
            return $min;
        }

        $seedSource = $employee->id . '|' . $date->format('Ymd') . '|' . $context;
        $seed = crc32($seedSource);

        return $min + ($seed % $range);
    }
}
