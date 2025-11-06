<?php

namespace Database\Seeders;

use App\Models\LeaveRequest;
use App\Models\Attendance;
use App\Models\User;
use App\Models\EmployeeProfile;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class ApprovedLeaveRequestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates approved leave requests based on attendance records with "On Leave" status
     */
    public function run(): void
    {
        // Get all managers and HR assistants for approval
        $managerRole = Role::where('name', 'Manager')->first();
        $hrAssistantRole = Role::where('name', 'HR Assistant')->first();
        $hrStaffRole = Role::where('name', 'HR Staff')->first();

        $managers = $managerRole ? User::where('role_id', $managerRole->id)->get() : collect([]);
        $hrUsers = collect([]);
        
        if ($hrAssistantRole) {
            $hrUsers = $hrUsers->merge(User::where('role_id', $hrAssistantRole->id)->get());
        }
        if ($hrStaffRole) {
            $hrUsers = $hrUsers->merge(User::where('role_id', $hrStaffRole->id)->get());
        }

        if ($managers->isEmpty()) {
            $this->command->warn('No managers found. Leave requests will not have manager approval.');
        }

        if ($hrUsers->isEmpty()) {
            $this->command->warn('No HR users found. Leave requests will not have HR approval.');
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

        $this->command->info("Generating approved leave requests from attendance records...");

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

            // Get all "On Leave" attendance records for this employee in the specified months
            $leaveAttendances = Attendance::where('employee_id', $employee->id)
                ->whereIn('status', ['On Leave'])
                ->where(function($query) use ($months) {
                    foreach ($months as $monthData) {
                        $startDate = Carbon::create($monthData['year'], $monthData['month'], 1);
                        $endDate = $startDate->copy()->endOfMonth();
                        
                        $query->orWhereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
                    }
                })
                ->orderBy('date', 'asc')
                ->get();

            if ($leaveAttendances->isEmpty()) {
                $bar->advance();
                continue;
            }

            // Group consecutive leave days into leave requests
            $leaveGroups = $this->groupConsecutiveLeaveDays($leaveAttendances);

            foreach ($leaveGroups as $group) {
                $fromDate = $group['from'];
                $toDate = $group['to'];
                $days = $fromDate->diffInDays($toDate) + 1;

                // Skip if leave is too long (likely data issue)
                if ($days > 30) {
                    continue;
                }

                // Generate leave request details
                $leaveRequest = $this->generateLeaveRequest(
                    $user,
                    $employee,
                    $fromDate,
                    $toDate,
                    $days,
                    $managers,
                    $hrUsers
                );

                if ($leaveRequest) {
                    $totalRequests++;
                }
            }

            $processedEmployees++;
            $bar->advance();
        }

        $bar->finish();
        $this->command->newLine();
        $this->command->info("Successfully created {$totalRequests} approved leave requests for {$processedEmployees} employees.");
    }

    /**
     * Group consecutive leave days into ranges
     * Handles weekends correctly (Saturday to Monday is considered consecutive)
     */
    private function groupConsecutiveLeaveDays($attendances): array
    {
        if ($attendances->isEmpty()) {
            return [];
        }

        $groups = [];
        $currentGroup = null;

        foreach ($attendances as $attendance) {
            $date = Carbon::parse($attendance->date);

            if ($currentGroup === null) {
                // Start new group
                $currentGroup = [
                    'from' => $date->copy(),
                    'to' => $date->copy(),
                ];
            } else {
                // Check if date is consecutive (including weekends)
                $expectedDate = $currentGroup['to']->copy()->addDay();
                $isConsecutive = $date->isSameDay($expectedDate);
                
                // Also check if it's Saturday to Monday (skip Sunday as rest day)
                $isWeekendContinuation = false;
                if ($currentGroup['to']->dayOfWeek === Carbon::SATURDAY && 
                    $date->dayOfWeek === Carbon::MONDAY) {
                    $isWeekendContinuation = true;
                }
                
                if ($isConsecutive || $isWeekendContinuation) {
                    // Extend current group
                    $currentGroup['to'] = $date->copy();
                } else {
                    // Save current group and start new one
                    $groups[] = $currentGroup;
                    $currentGroup = [
                        'from' => $date->copy(),
                        'to' => $date->copy(),
                    ];
                }
            }
        }

        // Add last group
        if ($currentGroup !== null) {
            $groups[] = $currentGroup;
        }

        return $groups;
    }

    /**
     * Generate a leave request with proper approval workflow
     */
    private function generateLeaveRequest(
        User $user,
        EmployeeProfile $employeeProfile,
        Carbon $fromDate,
        Carbon $toDate,
        int $totalDays,
        $managers,
        $hrUsers
    ): ?LeaveRequest {
        // Check if leave request already exists for this date range
        $existing = LeaveRequest::where('employee_id', $user->id)
            ->where('from', $fromDate->format('Y-m-d'))
            ->where('to', $toDate->format('Y-m-d'))
            ->first();

        if ($existing) {
            return null; // Skip if already exists
        }

        // Generate leave type and details
        $leaveType = $this->generateLeaveType($totalDays);
        $reason = $this->generateReason($leaveType);
        
        // Calculate payment terms based on employee tenure
        $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
            $user->id,
            $leaveType,
            $totalDays,
            $fromDate->year
        );

        // Get manager and HR approver
        $manager = $managers->isNotEmpty() ? $managers->random() : null;
        $hrApprover = $hrUsers->isNotEmpty() ? $hrUsers->random() : null;

        // Set approval timestamps (manager approves first, then HR)
        // Manager approval should be 1-3 days before leave starts
        $managerApprovalDate = $fromDate->copy()->subDays(rand(1, 3));
        // HR approval should be same day or day after manager approval
        $hrApprovalDate = $managerApprovalDate->copy()->addDays(rand(0, 1));

        // File date should be before manager approval (3-7 days before leave starts)
        $fileDate = $fromDate->copy()->subDays(rand(3, 7));

        // Create the approved leave request
        $leaveRequest = LeaveRequest::create([
            'employee_id' => $user->id,
            'company' => 'Cabuyao Concrete Development Corporation',
            'employee_name' => "{$employeeProfile->first_name} {$employeeProfile->last_name}",
            'department' => $employeeProfile->department ?? 'General Department',
            'type' => $leaveType,
            'terms' => $paymentTerms['terms'],
            'leave_category' => $paymentTerms['leave_category'],
            'from' => $fromDate->format('Y-m-d'),
            'to' => $toDate->format('Y-m-d'),
            'total_days' => $totalDays,
            'with_pay_days' => $paymentTerms['with_pay_days'],
            'without_pay_days' => $paymentTerms['without_pay_days'],
            'total_hours' => $totalDays * 8, // 8 hours per day
            'date_filed' => $fileDate,
            'reason' => $reason,
            'status' => 'approved', // Fully approved
            'admin_remarks' => 'Approved leave request based on attendance records.',
            'manager_remarks' => $this->generateManagerRemarks(),
            'manager_approved_at' => $manager ? $managerApprovalDate : null,
            'manager_approved_by' => $manager ? $manager->id : null,
            'manager_rejected_at' => null,
            'approved_at' => $hrApprover ? $hrApprovalDate : null,
            'approved_by' => $hrApprover ? $hrApprover->id : null,
            'rejected_at' => null,
        ]);

        return $leaveRequest;
    }

    /**
     * Generate appropriate leave type based on duration
     */
    private function generateLeaveType(int $days): string
    {
        $leaveTypes = [
            'Vacation Leave',
            'Sick Leave',
            'Emergency Leave',
            'Personal Leave',
            'Bereavement Leave',
        ];

        // For longer leaves, use specific types
        if ($days >= 7 && $days <= 15) {
            $specialTypes = ['Vacation Leave', 'Sick Leave', 'Personal Leave'];
            return $specialTypes[array_rand($specialTypes)];
        }

        if ($days > 15) {
            return 'Vacation Leave'; // Long vacations
        }

        // For shorter leaves, random selection
        return $leaveTypes[array_rand($leaveTypes)];
    }

    /**
     * Generate appropriate reason for leave
     */
    private function generateReason(string $leaveType): string
    {
        $reasons = [
            'Vacation Leave' => [
                'Family vacation',
                'Personal rest and recreation',
                'Travel and leisure',
                'Family time',
                'Personal matters',
            ],
            'Sick Leave' => [
                'Due to illness',
                'Medical consultation',
                'Recovery from illness',
                'Health check-up',
                'Medical treatment',
            ],
            'Emergency Leave' => [
                'Family emergency',
                'Urgent personal matters',
                'Emergency situation',
                'Unforeseen circumstances',
                'Critical personal issue',
            ],
            'Personal Leave' => [
                'Personal matters',
                'Family obligations',
                'Personal appointments',
                'Family activities',
                'Personal errands',
            ],
            'Bereavement Leave' => [
                'Death in the family',
                'Family bereavement',
                'Attending funeral',
                'Family loss',
                'Condolence matters',
            ],
        ];

        $typeReasons = $reasons[$leaveType] ?? ['Personal matters'];
        return $typeReasons[array_rand($typeReasons)];
    }

    /**
     * Generate manager remarks
     */
    private function generateManagerRemarks(): string
    {
        $remarks = [
            'Approved. Please coordinate with team for coverage.',
            'Approved. Ensure tasks are properly delegated.',
            'Approved. Safe travels.',
            'Approved. Take care and get well soon.',
            'Approved. Enjoy your leave.',
            'Approved.',
        ];

        return $remarks[array_rand($remarks)];
    }
}
