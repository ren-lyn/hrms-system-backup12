<?php

namespace Database\Seeders;

use App\Models\LeaveRequest;
use App\Models\User;
use App\Models\EmployeeProfile;
use App\Models\Attendance;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class RenelynConcinaSILSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates 8 approved SIL (Sick Leave + Emergency Leave) days for Renelyn Concina
     */
    public function run(): void
    {
        // Find Renelyn Concina
        $user = User::where('email', 'concinarenelyn86@gmail.com')
            ->orWhere(function($query) {
                $query->where('first_name', 'Renelyn')
                      ->where('last_name', 'Concina');
            })
            ->first();

        if (!$user) {
            $this->command->warn('Renelyn Concina not found. Please seed users first.');
            return;
        }

        $employeeProfile = $user->employeeProfile;
        if (!$employeeProfile) {
            $this->command->warn('Renelyn Concina employee profile not found.');
            return;
        }

        // Get managers and HR assistants for approval
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

        $manager = $managers->isNotEmpty() ? $managers->first() : null;
        $hrApprover = $hrUsers->isNotEmpty() ? $hrUsers->first() : null;

        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        // Create 8 days of SIL (mix of Sick Leave and Emergency Leave)
        // Spread them across different months in the current year
        $leaveDays = [
            ['type' => 'Sick Leave', 'from' => "{$currentYear}-01-10", 'to' => "{$currentYear}-01-10", 'reason' => 'Medical check-up'],
            ['type' => 'Sick Leave', 'from' => "{$currentYear}-02-15", 'to' => "{$currentYear}-02-15", 'reason' => 'Recovery from illness'],
            ['type' => 'Emergency Leave', 'from' => "{$currentYear}-03-05", 'to' => "{$currentYear}-03-05", 'reason' => 'Family emergency'],
            ['type' => 'Sick Leave', 'from' => "{$currentYear}-04-12", 'to' => "{$currentYear}-04-12", 'reason' => 'Medical consultation'],
            ['type' => 'Emergency Leave', 'from' => "{$currentYear}-05-20", 'to' => "{$currentYear}-05-20", 'reason' => 'Urgent personal matter'],
            ['type' => 'Sick Leave', 'from' => "{$currentYear}-06-08", 'to' => "{$currentYear}-06-08", 'reason' => 'Health check-up'],
            ['type' => 'Emergency Leave', 'from' => "{$currentYear}-07-15", 'to' => "{$currentYear}-07-15", 'reason' => 'Unforeseen circumstances'],
            ['type' => 'Sick Leave', 'from' => "{$currentYear}-08-22", 'to' => "{$currentYear}-08-22", 'reason' => 'Medical treatment'],
        ];

        $createdCount = 0;

        foreach ($leaveDays as $leaveData) {
            $fromDate = Carbon::parse($leaveData['from']);
            $toDate = Carbon::parse($leaveData['to']);
            $totalDays = $fromDate->diffInDays($toDate) + 1;

            // Skip if date is in the future
            if ($fromDate->gt(Carbon::now())) {
                continue;
            }

            // Check if leave request already exists
            $existing = LeaveRequest::where('employee_id', $user->id)
                ->where('from', $fromDate->format('Y-m-d'))
                ->where('to', $toDate->format('Y-m-d'))
                ->first();

            if ($existing) {
                continue; // Skip if already exists
            }

            // Calculate payment terms based on employee tenure
            $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
                $user->id,
                $leaveData['type'],
                $totalDays,
                $fromDate->year
            );

            // Set approval timestamps (manager approves first, then HR)
            $managerApprovalDate = $fromDate->copy()->subDays(rand(1, 3));
            $hrApprovalDate = $managerApprovalDate->copy()->addDays(rand(0, 1));
            $fileDate = $fromDate->copy()->subDays(rand(3, 7));

            // Ensure approval dates are not in the future
            if ($managerApprovalDate->gt(Carbon::now())) {
                $managerApprovalDate = $fromDate->copy()->subDays(1);
            }
            if ($hrApprovalDate->gt(Carbon::now())) {
                $hrApprovalDate = $managerApprovalDate->copy();
            }
            if ($fileDate->gt(Carbon::now())) {
                $fileDate = $fromDate->copy()->subDays(2);
            }

            // Create the approved leave request
            $leaveRequest = LeaveRequest::create([
                'employee_id' => $user->id,
                'company' => 'Cabuyao Concrete Development Corporation',
                'employee_name' => "{$employeeProfile->first_name} {$employeeProfile->last_name}",
                'department' => $employeeProfile->department ?? 'HR Department',
                'type' => $leaveData['type'],
                'terms' => $paymentTerms['terms'],
                'leave_category' => $paymentTerms['leave_category'],
                'from' => $fromDate->format('Y-m-d'),
                'to' => $toDate->format('Y-m-d'),
                'total_days' => $totalDays,
                'with_pay_days' => $paymentTerms['with_pay_days'],
                'without_pay_days' => $paymentTerms['without_pay_days'],
                'total_hours' => $totalDays * 8, // 8 hours per day
                'date_filed' => $fileDate,
                'reason' => $leaveData['reason'],
                'status' => 'approved', // Fully approved
                'admin_remarks' => 'Approved SIL leave request.',
                'manager_remarks' => 'Approved. Take care.',
                'manager_approved_at' => $manager ? $managerApprovalDate : null,
                'manager_approved_by' => $manager ? $manager->id : null,
                'manager_rejected_at' => null,
                'approved_at' => $hrApprover ? $hrApprovalDate : null,
                'approved_by' => $hrApprover ? $hrApprover->id : null,
                'rejected_at' => null,
            ]);

            // Update attendance records to show "On Leave" for these dates
            $currentDate = $fromDate->copy();
            while ($currentDate->lte($toDate)) {
                // Only update weekdays (skip weekends)
                if ($currentDate->dayOfWeek >= 1 && $currentDate->dayOfWeek <= 5) {
                    $dateString = $currentDate->format('Y-m-d');

                    // Check if it's a holiday - if so, don't override holiday status
                    $isHoliday = \App\Models\Holiday::isHolidayDate($dateString);
                    if ($isHoliday) {
                        $currentDate->addDay();
                        continue;
                    }

                    // Update or create attendance record
                    Attendance::updateOrCreate(
                        [
                            'employee_id' => $employeeProfile->id,
                            'date' => $dateString,
                        ],
                        [
                            'employee_biometric_id' => $employeeProfile->employee_id ?? null,
                            'status' => 'On Leave',
                            'remarks' => 'On leave - ' . $leaveData['type'],
                        ]
                    );
                }
                $currentDate->addDay();
            }

            $createdCount++;
        }

        $this->command->info("Successfully created {$createdCount} approved SIL leave requests for Renelyn Concina.");
        $this->command->info("Attendance records updated to show 'On Leave' status for leave dates.");
    }
}

