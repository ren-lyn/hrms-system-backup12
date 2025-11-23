<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;

class RecalculateLeaveWithPayDays extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leave:recalculate-with-pay-days {--employee-id= : Specific employee ID to recalculate}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate with_pay_days for existing approved leave requests';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $employeeId = $this->option('employee-id');
        
        $query = LeaveRequest::whereIn('status', ['approved', 'manager_approved'])
            ->where(function($q) {
                $q->whereNull('with_pay_days')
                  ->orWhere('with_pay_days', 0)
                  ->orWhereNull('without_pay_days');
            });
        
        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }
        
        $leaveRequests = $query->get();
        
        if ($leaveRequests->isEmpty()) {
            $this->info('No leave requests found that need recalculation.');
            return 0;
        }
        
        $this->info("Found {$leaveRequests->count()} leave request(s) to recalculate.");
        
        $updated = 0;
        $skipped = 0;
        
        foreach ($leaveRequests as $leaveRequest) {
            $employee = User::find($leaveRequest->employee_id);
            
            if (!$employee) {
                $this->warn("Employee ID {$leaveRequest->employee_id} not found for leave request {$leaveRequest->id}. Skipping.");
                $skipped++;
                continue;
            }
            
            // Get the year of the leave request
            $leaveYear = Carbon::parse($leaveRequest->from)->year;
            
            // Temporarily set with_pay_days to 0 so it's excluded from the calculation
            $originalWithPayDays = $leaveRequest->with_pay_days ?? 0;
            $leaveRequest->with_pay_days = 0;
            $leaveRequest->save();
            
            // Now recalculate payment terms (this will exclude the current leave from used days)
            $paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms(
                $leaveRequest->employee_id,
                $leaveRequest->type,
                $leaveRequest->total_days,
                $leaveYear
            );
            
            // Update the leave request with recalculated values
            $leaveRequest->with_pay_days = $paymentTerms['with_pay_days'];
            $leaveRequest->without_pay_days = $paymentTerms['without_pay_days'];
            $leaveRequest->terms = $paymentTerms['terms'];
            $leaveRequest->leave_category = $paymentTerms['leave_category'];
            
            $leaveRequest->save();
            $updated++;
            
            $this->info("Updated leave request {$leaveRequest->id} (Employee: {$employee->first_name} {$employee->last_name}, Type: {$leaveRequest->type}): with_pay_days = {$leaveRequest->with_pay_days}, without_pay_days = {$leaveRequest->without_pay_days}");
        }
        
        $this->info("\nRecalculation complete!");
        $this->info("Updated: {$updated}");
        $this->info("Skipped: {$skipped}");
        
        return 0;
    }
}

