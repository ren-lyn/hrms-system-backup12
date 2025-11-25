<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LeaveRequest;
use Carbon\Carbon;

class RecalculateLeaveWithPayDays extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leave:recalculate-with-pay-days {--employee-id= : Recalculate for specific employee ID} {--year= : Recalculate for specific year}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate with_pay_days for existing leave requests based on total_days and leave_duration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $employeeId = $this->option('employee-id');
        $year = $this->option('year') ?? Carbon::now()->year;

        $query = LeaveRequest::whereYear('from', $year)
            ->whereIn('status', ['approved', 'manager_approved', 'pending']);

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        $leaves = $query->get();
        $this->info("Found {$leaves->count()} leave requests to recalculate.");

        $updated = 0;
        $skipped = 0;

        foreach ($leaves as $leave) {
            // Recalculate payment terms based on current total_days
            $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
                $leave->employee_id,
                $leave->type,
                $leave->total_days,
                $year
            );

            // Only update if with_pay_days has changed
            $oldWithPayDays = $leave->with_pay_days;
            $newWithPayDays = $paymentTerms['with_pay_days'];

            // Round to 2 decimal places for comparison
            if (round($oldWithPayDays, 2) !== round($newWithPayDays, 2)) {
                $leave->with_pay_days = $newWithPayDays;
                $leave->without_pay_days = $paymentTerms['without_pay_days'];
                $leave->terms = $paymentTerms['terms'];
                $leave->leave_category = $paymentTerms['leave_category'];
                $leave->save();

                $this->line("Updated Leave ID {$leave->id}: with_pay_days {$oldWithPayDays} → {$newWithPayDays}");
                $updated++;
            } else {
                $skipped++;
            }
        }

        $this->info("Recalculation complete: {$updated} updated, {$skipped} skipped.");
        return 0;
    }
}
