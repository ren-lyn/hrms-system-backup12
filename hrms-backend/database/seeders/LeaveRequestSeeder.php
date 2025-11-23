<?php

namespace Database\Seeders;

use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class LeaveRequestSeeder extends Seeder
{
    public function run()
    {
        // Get users with Employee or any role
        $employees = User::take(5)->get();
        
        $leaveTypes = [
            'Vacation Leave',
            'Sick Leave', 
            'Emergency Leave',
            'Maternity/Paternity',
            'LOA'
        ];
        
        $reasons = [
            'For travel',
            'Due to illness',
            'For urgent situations',
            'For personal matters',
            'Family emergency',
            'Medical appointment',
            'Rest and recreation'
        ];
        
        $statuses = ['pending', 'approved', 'rejected'];
        
        foreach ($employees as $employee) {
            // Create 3-4 leave requests per employee
            for ($i = 0; $i < rand(3, 4); $i++) {
                $startDate = Carbon::now()->addDays(rand(-30, 60));
                $endDate = $startDate->copy()->addDays(rand(1, 7));
                $status = $statuses[array_rand($statuses)];
                
                $daysDiff = $endDate->diffInDays($startDate) + 1;
                $leaveType = $leaveTypes[array_rand($leaveTypes)];
                
                // Calculate automatic payment terms based on employee tenure
                // This properly categorizes Sick Leave and Emergency Leave as SIL for employees with 1+ year tenure
                // and assigns 8 days with pay for SIL
                $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
                    $employee->id,
                    $leaveType,
                    $daysDiff,
                    $startDate->year
                );
                
                LeaveRequest::create([
                    'employee_id' => $employee->id,
                    'company' => 'Cabuyao Concrete Development Corporation',
                    'department' => 'Department ' . chr(65 + ($i % 5)), // Department A, B, C, etc.
                    'type' => $leaveType,
                    'terms' => $paymentTerms['terms'],
                    'leave_category' => $paymentTerms['leave_category'],
                    'from' => $startDate->toDateString(),
                    'to' => $endDate->toDateString(),
                    'total_days' => $daysDiff,
                    'with_pay_days' => $paymentTerms['with_pay_days'],
                    'without_pay_days' => $paymentTerms['without_pay_days'],
                    'total_hours' => $daysDiff * 8,
                    'date_filed' => now(),
                    'reason' => $reasons[array_rand($reasons)],
                    'status' => $status,
                    'admin_remarks' => $status !== 'pending' ? 'Processed by HR' : null,
                    'approved_at' => $status === 'approved' ? now() : null,
                    'rejected_at' => $status === 'rejected' ? now() : null,
                    'approved_by' => $status !== 'pending' ? 1 : null, // Assuming user ID 1 is HR
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
