<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\EmployeeProfile;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class GenerateAttendanceExcel extends Command
{
    protected $signature = 'attendance:generate-excel 
                          {--days=30 : Number of days to generate} 
                          {--file=sample_attendance.csv : Output filename}';

    protected $description = 'Generate sample attendance CSV file with real employee data';

    public function handle()
    {
        $this->info('Generating sample attendance Excel file...');

        $days = (int) $this->option('days');
        $filename = $this->option('file');

        try {
            // Get all employees (excluding applicants)
            $employees = EmployeeProfile::whereHas('user', function($query) {
                $query->whereHas('role', function($roleQuery) {
                    $roleQuery->where('name', '!=', 'Applicant');
                });
            })->get();

            if ($employees->isEmpty()) {
                $this->error('No employees found in the system.');
                return 1;
            }

            $this->info("Found {$employees->count()} employees");

            // Generate attendance data
            $attendanceData = $this->generateAttendanceData($employees, $days);

            // Create CSV file
            $this->createCsvFile($attendanceData, $filename);

            $this->info("Sample attendance file generated successfully: storage/app/public/{$filename}");
            $this->info("Total records generated: " . count($attendanceData));

            return 0;

        } catch (\Exception $e) {
            $this->error('Error generating attendance file: ' . $e->getMessage());
            return 1;
        }
    }

    private function generateAttendanceData($employees, $days)
    {
        $data = [];
        $startDate = Carbon::now()->subDays($days);

        // Add header row
        $data[] = [
            'Biometric ID',
            'Employee ID',
            'Employee Name',
            'Date',
            'Clock In',
            'Clock Out',
            'Break Out',
            'Break In',
            'Remarks'
        ];

        for ($day = 0; $day < $days; $day++) {
            $currentDate = $startDate->copy()->addDays($day);
            
            // Skip weekends (optional - you can remove this if you want weekend data)
            if ($currentDate->isWeekend()) {
                continue;
            }

            foreach ($employees as $employee) {
                // Generate biometric ID (using employee ID for simplicity)
                $biometricId = str_pad($employee->id, 4, '0', STR_PAD_LEFT);

                // Simulate some employees being absent randomly (10% chance)
                if (rand(1, 100) <= 10) {
                    $data[] = [
                        $biometricId,
                        $employee->id,
                        $employee->first_name . ' ' . $employee->last_name,
                        $currentDate->format('Y-m-d'),
                        '--',
                        '--',
                        '--',
                        '--',
                        'Absent'
                    ];
                    continue;
                }

                // Generate realistic times
                $clockIn = $this->generateClockInTime();
                $clockOut = $this->generateClockOutTime($clockIn);
                $breakOut = $this->generateBreakOutTime();
                $breakIn = $this->generateBreakInTime($breakOut);

                // Generate remarks (occasionally)
                $remarks = '';
                if (rand(1, 100) <= 5) {
                    $remarkOptions = ['', 'Medical appointment', 'Training', 'Meeting', 'OT approved'];
                    $remarks = $remarkOptions[array_rand($remarkOptions)];
                }

                $data[] = [
                    $biometricId,
                    $employee->id,
                    $employee->first_name . ' ' . $employee->last_name,
                    $currentDate->format('Y-m-d'),
                    $clockIn,
                    $clockOut,
                    $breakOut,
                    $breakIn,
                    $remarks
                ];
            }
        }

        return $data;
    }

    private function generateClockInTime()
    {
        // Standard time: 8:00 AM, with some variation
        // 70% on time (7:45-8:15), 20% late (8:16-9:00), 10% early (7:30-7:44)
        $rand = rand(1, 100);

        if ($rand <= 10) {
            // Early arrival
            $hour = 7;
            $minute = rand(30, 44);
        } elseif ($rand <= 80) {
            // Normal/slightly late
            $hour = rand(7, 8);
            if ($hour === 7) {
                $minute = rand(45, 59);
            } else {
                $minute = rand(0, 15);
            }
        } else {
            // Late arrival
            $hour = 8;
            $minute = rand(16, 59);
            if ($minute > 45) {
                $hour = 9;
                $minute = rand(0, 30);
            }
        }

        return sprintf('%02d:%02d:00', $hour, $minute);
    }

    private function generateClockOutTime($clockIn)
    {
        $clockInCarbon = Carbon::parse($clockIn);
        
        // Standard 8-hour workday plus 1 hour lunch break
        $workHours = rand(8, 10); // Sometimes overtime
        $clockOutCarbon = $clockInCarbon->copy()->addHours($workHours)->addHour(); // +1 for lunch

        // Add some variation (±30 minutes)
        $variation = rand(-30, 30);
        $clockOutCarbon->addMinutes($variation);

        return $clockOutCarbon->format('H:i:s');
    }

    private function generateBreakOutTime()
    {
        // Lunch break around 12:00 PM ± 1 hour
        $hour = rand(11, 13);
        $minute = rand(0, 59);

        return sprintf('%02d:%02d:00', $hour, $minute);
    }

    private function generateBreakInTime($breakOut)
    {
        $breakOutCarbon = Carbon::parse($breakOut);
        
        // Lunch break duration: 30 minutes to 1.5 hours
        $breakDuration = rand(30, 90);
        $breakInCarbon = $breakOutCarbon->copy()->addMinutes($breakDuration);

        return $breakInCarbon->format('H:i:s');
    }

    private function createCsvFile($data, $filename)
    {
        $csvContent = '';
        foreach ($data as $row) {
            $csvContent .= implode(',', array_map(function($field) {
                // Escape fields that contain commas, quotes, or newlines
                if (strpos($field, ',') !== false || strpos($field, '"') !== false || strpos($field, "\n") !== false) {
                    return '"' . str_replace('"', '\"\"', $field) . '"';
                }
                return $field;
            }, $row)) . "\n";
        }
        
        Storage::disk('public')->put($filename, $csvContent);
    }
}