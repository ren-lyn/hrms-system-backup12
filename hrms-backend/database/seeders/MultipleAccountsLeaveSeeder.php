<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\LeaveRequest;
use Carbon\Carbon;

class MultipleAccountsLeaveSeeder extends Seeder
{
    public function run(): void
    {
        $employees = User::where('role_id', '!=', 5) // exclude Applicants
            ->whereHas('employeeProfile')
            ->inRandomOrder()
            ->take(10)
            ->get();

        if ($employees->count() < 10) {
            $this->command?->warn('Less than 10 employees found with profiles. Seeding leaves for available employees only.');
        }

        $leaveTypes = [
            'Vacation Leave',
            'Sick Leave',
            'Emergency Leave',
            'Maternity/Paternity',
            'LOA'
        ];

        foreach ($employees as $user) {
            $profile = $user->employeeProfile;
            $type = $leaveTypes[array_rand($leaveTypes)];

            // Random date range within -30 to +60 days, 1-5 day span
            $startDate = Carbon::now()->addDays(rand(-30, 60));
            $endDate = (clone $startDate)->addDays(rand(1, 5));

            $totalDays = $endDate->diffInDays($startDate) + 1;
            $status = ['pending', 'approved', 'rejected'][array_rand(['pending', 'approved', 'rejected'])];

            // Calculate automatic payment terms based on employee tenure
            // This properly categorizes Sick Leave and Emergency Leave as SIL for employees with 1+ year tenure
            // and assigns 8 days with pay for SIL
            $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
                $user->id,
                $type,
                $totalDays,
                $startDate->year
            );

            LeaveRequest::create([
                'employee_id' => $user->id,
                'company' => 'Cabuyao Concrete Development Corporation',
                'employee_name' => trim(($profile->first_name ?? $user->first_name) . ' ' . ($profile->last_name ?? $user->last_name)),
                'department' => $profile->department ?? 'Not Set',
                'type' => $type,
                'terms' => $paymentTerms['terms'],
                'leave_category' => $paymentTerms['leave_category'],
                'from' => $startDate->toDateString(),
                'to' => $endDate->toDateString(),
                'total_days' => $totalDays,
                'with_pay_days' => $paymentTerms['with_pay_days'],
                'without_pay_days' => $paymentTerms['without_pay_days'],
                'total_hours' => $totalDays * 8,
                'date_filed' => Carbon::now()->toDateTimeString(),
                'reason' => $type === 'Sick Leave' ? 'Medical rest' : 'Personal matter',
                'status' => $status,
                'admin_remarks' => $status !== 'pending' ? 'Processed by HR' : null,
                'approved_at' => $status === 'approved' ? Carbon::now()->toDateTimeString() : null,
                'rejected_at' => $status === 'rejected' ? Carbon::now()->toDateTimeString() : null,
                'approved_by' => $status !== 'pending' ? User::first()?->id : null,
            ]);
        }
    }
}




