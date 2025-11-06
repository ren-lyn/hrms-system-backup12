<?php

namespace Database\Seeders;

use App\Models\OvertimeRequest;
use App\Models\Attendance;
use App\Models\User;
use App\Models\EmployeeProfile;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class ApprovedOvertimeRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates approved overtime requests based on attendance records with overtime hours
     */
    public function run(): void
    {
        // Get managers for approval and HR assistants for notes
        $managerRole = Role::where('name', 'Manager')->first();
        $hrAssistantRole = Role::where('name', 'HR Assistant')->first();

        $managers = $managerRole ? User::where('role_id', $managerRole->id)->get() : collect([]);
        $hrAssistants = $hrAssistantRole ? User::where('role_id', $hrAssistantRole->id)->get() : collect([]);

        if ($managers->isEmpty()) {
            $this->command->warn('No managers found. OT requests will not have manager approval.');
        }

        if ($hrAssistants->isEmpty()) {
            $this->command->warn('No HR Assistants found. OT requests will not have admin notes.');
        }

        // Define months: July, August, September
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;
        $year = ($currentMonth < 7) ? $currentYear - 1 : $currentYear;

        $months = [
            ['year' => $year, 'month' => 7], // July
            ['year' => $year, 'month' => 8], // August
            ['year' => $year, 'month' => 9], // September
        ];

        $this->command->info("Generating approved overtime requests from attendance records...");

        $totalRequests = 0;
        $processedEmployees = 0;

        // Get all employees
        $employees = EmployeeProfile::where(function($query) {
            $query->whereNull('status')
                  ->orWhere('status', 'active');
        })->get();

        $bar = $this->command->getOutput()->createProgressBar($employees->count());
        $bar->start();

        foreach ($employees as $employee) {
            $user = $employee->user;
            if (!$user) {
                $bar->advance();
                continue;
            }

            // Get all attendance records with overtime hours for this employee in the specified months
            $otAttendances = Attendance::where('employee_id', $employee->id)
                ->where(function($query) {
                    $query->where('overtime_hours', '>', 0)
                          ->orWhere('status', 'Overtime')
                          ->orWhere('status', 'Late (Overtime)');
                })
                ->where(function($query) use ($months) {
                    foreach ($months as $monthData) {
                        $startDate = Carbon::create($monthData['year'], $monthData['month'], 1);
                        $endDate = $startDate->copy()->endOfMonth();
                        
                        $query->orWhereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
                    }
                })
                ->whereNotNull('clock_out')
                ->whereNotNull('clock_in')
                ->orderBy('date', 'asc')
                ->get();

            if ($otAttendances->isEmpty()) {
                $bar->advance();
                continue;
            }

            foreach ($otAttendances as $attendance) {
                // Calculate OT hours based on clock_out time
                $otHours = $this->calculateOTHours($attendance);
                
                if ($otHours <= 0) {
                    continue; // Skip if no valid OT hours
                }

                // Check if OT request already exists for this date
                $existing = OvertimeRequest::where('employee_id', $employee->id)
                    ->where('ot_date', $attendance->date->format('Y-m-d'))
                    ->first();

                if ($existing) {
                    continue; // Skip if already exists
                }

                // Generate OT request
                $otRequest = $this->generateOTRequest(
                    $user,
                    $employee,
                    $attendance,
                    $otHours,
                    $managers,
                    $hrAssistants
                );

                if ($otRequest) {
                    $totalRequests++;
                }
            }

            $processedEmployees++;
            $bar->advance();
        }

        $bar->finish();
        $this->command->newLine();
        $this->command->info("Successfully created {$totalRequests} approved OT requests for {$processedEmployees} employees.");
    }

    /**
     * Calculate OT hours based on clock_out time
     * OT starts at 6 PM (18:00) - one hour after standard clock out time (5 PM)
     * Only time worked after 6 PM counts as OT, rounded UP to full hours
     */
    private function calculateOTHours(Attendance $attendance): int
    {
        if (!$attendance->clock_out) {
            return 0;
        }

        // Get the clock_out time
        $clockOutTime = Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $attendance->clock_out->format('H:i:s'));
        
        // OT starts at 6 PM (18:00) - one hour after standard clock out time
        $otStartTime = Carbon::parse($attendance->date->format('Y-m-d') . ' 18:00:00');

        // If clocked out before 6 PM, no OT
        if ($clockOutTime->lt($otStartTime)) {
            return 0;
        }

        // Calculate total minutes worked after 6 PM
        // Use absolute difference to ensure positive value
        $totalMinutes = abs($clockOutTime->diffInMinutes($otStartTime));
        
        // Convert to hours and round UP to full hours
        // Minimum 1 hour if clocked out at or after 6 PM
        // Example: 6:00 PM = 1 hour, 6:15 PM = 1 hour, 7:01 PM = 2 hours, 8:00 PM = 2 hours
        $hoursWorked = $totalMinutes / 60;
        $otHours = max(1, ceil($hoursWorked));

        return $otHours;
    }

    /**
     * Generate an OT request with proper approval workflow
     * Manager approves, HR Assistant adds notes
     */
    private function generateOTRequest(
        User $user,
        EmployeeProfile $employeeProfile,
        Attendance $attendance,
        int $otHours,
        $managers,
        $hrAssistants
    ): ?OvertimeRequest {
        // Get clock_out time from attendance
        $clockOutTime = Carbon::parse($attendance->date->format('Y-m-d') . ' ' . $attendance->clock_out->format('H:i:s'));
        
        // OT start time is 6 PM (18:00) - one hour after standard clock out time
        $otStartTime = Carbon::parse($attendance->date->format('Y-m-d') . ' 18:00:00');
        
        // Get manager for approval and HR Assistant for notes
        $manager = $managers->isNotEmpty() ? $managers->random() : null;
        $hrAssistant = $hrAssistants->isNotEmpty() ? $hrAssistants->random() : null;

        // Set approval timestamps
        // Manager approval should be 1-2 days after OT date
        $managerApprovalDate = Carbon::parse($attendance->date)->addDays(rand(1, 2));
        // HR Assistant adds notes same day or day after manager approval
        $hrNotesDate = $managerApprovalDate->copy()->addDays(rand(0, 1));

        // File date should be same day or day after OT (employees file after working OT)
        $fileDate = Carbon::parse($attendance->date)->addDays(rand(0, 1));

        // Generate reason
        $reason = $this->generateReason($otHours);

        // Create the approved OT request
        // Manager approves (final approval), HR Assistant adds notes only
        $otRequest = OvertimeRequest::create([
            'user_id' => $user->id,
            'employee_id' => $employeeProfile->id,
            'date' => $attendance->date->format('Y-m-d'),
            'ot_date' => $attendance->date->format('Y-m-d'),
            'start_time' => $otStartTime->format('H:i:s'), // 18:00:00 (6 PM)
            'end_time' => $clockOutTime->format('H:i:s'), // Actual clock out time
            'ot_hours' => $otHours,
            'reason' => $reason,
            'status' => 'hr_approved', // Final approved status
            'admin_notes' => $hrAssistant ? 'Approved OT request based on attendance records. Noted by HR Assistant.' : 'Approved OT request based on attendance records.',
            'manager_reviewed_by' => $manager ? $manager->id : null,
            'manager_reviewed_at' => $manager ? $managerApprovalDate : null,
            'hr_reviewed_by' => $hrAssistant ? $hrAssistant->id : null, // HR Assistant adds notes only
            'hr_reviewed_at' => $hrAssistant ? $hrNotesDate : null,
            'reviewed_by' => $manager ? $manager->id : null, // Manager is the final approver
            'reviewed_at' => $manager ? $managerApprovalDate : null,
            'created_at' => $fileDate,
            'updated_at' => $managerApprovalDate,
        ]);

        return $otRequest;
    }

    /**
     * Generate appropriate reason for OT request
     */
    private function generateReason(int $otHours): string
    {
        $reasons = [
            'Urgent project deadline',
            'Client meeting extended',
            'Important task completion',
            'System maintenance work',
            'Report preparation',
            'Project deliverables',
            'Client presentation preparation',
            'Data processing and analysis',
            'System testing and deployment',
            'Documentation completion',
            'Time-sensitive client request',
            'Emergency system issue resolution',
            'Month-end closing activities',
            'Quarterly report preparation',
            'Team project support',
        ];

        // For longer OT hours, use more specific reasons
        if ($otHours >= 3) {
            $longReasons = [
                'Critical project deadline',
                'Extended client meeting',
                'Major system deployment',
                'Urgent deliverables completion',
                'Emergency client support',
            ];
            return $longReasons[array_rand($longReasons)];
        }

        return $reasons[array_rand($reasons)];
    }
}
