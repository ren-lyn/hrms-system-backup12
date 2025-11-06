<?php

namespace App\Console\Commands;

use App\Models\OvertimeRequest;
use App\Models\Attendance;
use Illuminate\Console\Command;
use Carbon\Carbon;

class RecalculateOTHours extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ot:recalculate {--dry-run : Show what would be updated without making changes} {--force : Force update all records} {--debug : Show detailed calculation info}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate OT hours for existing overtime requests based on clock out time (OT starts at 6 PM)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $force = $this->option('force');
        $debug = $this->option('debug');
        
        if ($dryRun) {
            $this->info('DRY RUN MODE - No changes will be saved');
        }
        
        if ($force) {
            $this->warn('FORCE MODE - All records will be updated regardless of current value');
        }

        $this->info('Recalculating OT hours for existing overtime requests...');
        $this->newLine();

        $otRequests = OvertimeRequest::whereNotNull('ot_date')
            ->orWhereNotNull('date')
            ->get();

        $this->info("Found {$otRequests->count()} overtime requests to process.");
        $this->newLine();

        $bar = $this->output->createProgressBar($otRequests->count());
        $bar->start();

        $updated = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($otRequests as $otRequest) {
            try {
                $date = $otRequest->ot_date ?? $otRequest->date;
                
                if (!$date) {
                    $skipped++;
                    $bar->advance();
                    continue;
                }

                // Try to get clock out time from end_time field first, then from attendance record
                $clockOutTime = null;
                
                if ($otRequest->end_time) {
                    // Use the stored end_time from the overtime request
                    // Handle both time string and Carbon instance
                    $endTimeStr = $otRequest->end_time instanceof Carbon 
                        ? $otRequest->end_time->format('H:i:s') 
                        : $otRequest->end_time;
                    $clockOutTime = Carbon::parse($date->format('Y-m-d') . ' ' . $endTimeStr);
                } else {
                    // Fallback to attendance record
                    $attendance = Attendance::where('employee_id', $otRequest->employee_id)
                        ->where('date', $date->format('Y-m-d'))
                        ->first();

                    if (!$attendance || !$attendance->clock_out) {
                        $skipped++;
                        $bar->advance();
                        continue;
                    }

                    $clockOutTime = Carbon::parse($date->format('Y-m-d') . ' ' . $attendance->clock_out->format('H:i:s'));
                }

                // Calculate new OT hours
                $newOTHours = $this->calculateOTHoursFromClockOut($clockOutTime, $date);
                
                // Always update if different (comparing as integers to avoid type issues)
                $currentHours = (int) $otRequest->ot_hours;
                $newHours = (int) $newOTHours;
                
                $shouldUpdate = $force || ($currentHours != $newHours);
                
                if ($shouldUpdate) {
                    $endTimeDisplay = $otRequest->end_time instanceof Carbon 
                        ? $otRequest->end_time->format('H:i:s') 
                        : ($otRequest->end_time ?? 'N/A');
                    
                    if ($debug && $updated < 20) {
                        // Show detailed calculation info
                        $this->info("Request ID {$otRequest->id}: Employee ID = {$otRequest->employee_id}, Date = {$date->format('Y-m-d')}, Clock out = {$endTimeDisplay}, Current OT = {$currentHours}h, New OT = {$newHours}h");
                    } elseif (!$debug && $dryRun && $updated < 10) {
                        // Show first few examples in dry run
                        $this->info("Request ID {$otRequest->id}: Clock out = {$endTimeDisplay}, Current OT = {$currentHours}h, New OT = {$newHours}h");
                    }
                    
                    if (!$dryRun) {
                        $otRequest->ot_hours = $newHours;
                        $otRequest->save();
                    }
                    $updated++;
                }

            } catch (\Exception $e) {
                $errors++;
                $this->error("Error processing request ID {$otRequest->id}: " . $e->getMessage());
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->newLine();

        $this->info("Summary:");
        $this->info("  - Updated: {$updated}");
        $this->info("  - Skipped: {$skipped}");
        $this->info("  - Errors: {$errors}");

        if ($dryRun) {
            $this->warn("This was a dry run. Run without --dry-run to apply changes.");
        } else {
            $this->info("Successfully recalculated OT hours!");
        }

        return 0;
    }

    /**
     * Calculate OT hours based on clock_out time
     * OT starts at 6 PM (18:00) - one hour after standard clock out time (5 PM)
     * Only time worked after 6 PM counts as OT, rounded UP to full hours
     */
    private function calculateOTHoursFromClockOut(Carbon $clockOutTime, $date): int
    {
        // OT starts at 6 PM (18:00) - one hour after standard clock out time
        $dateString = $date instanceof Carbon ? $date->format('Y-m-d') : $date;
        $otStartTime = Carbon::parse($dateString . ' 18:00:00');

        // Ensure both times are on the same date for comparison
        $clockOutTime = Carbon::parse($dateString . ' ' . $clockOutTime->format('H:i:s'));

        // If clocked out before 6 PM, no OT
        if ($clockOutTime->lt($otStartTime)) {
            return 0;
        }

        // Calculate total minutes worked after 6 PM
        // Use absolute difference to ensure positive value
        $totalMinutes = abs($clockOutTime->diffInMinutes($otStartTime));
        
        // Convert to hours and round UP to full hours
        // Minimum 1 hour if clocked out at or after 6 PM
        $hoursWorked = $totalMinutes / 60;
        $otHours = max(1, ceil($hoursWorked));

        return $otHours;
    }
}
