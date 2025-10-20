<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use Illuminate\Console\Command;

class RecalculateAttendanceStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:recalculate-status {--date= : Specific date to recalculate (Y-m-d format)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate attendance status based on total worked hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting attendance status recalculation...');
        
        $query = Attendance::whereNotNull('clock_in')
            ->whereNotNull('clock_out');
        
        // If specific date provided, filter by that date
        if ($this->option('date')) {
            $query->whereDate('date', $this->option('date'));
            $this->info('Filtering by date: ' . $this->option('date'));
        }
        
        $attendances = $query->get();
        $this->info('Found ' . $attendances->count() . ' attendance records to process.');
        
        $updated = 0;
        $bar = $this->output->createProgressBar($attendances->count());
        $bar->start();
        
        foreach ($attendances as $attendance) {
            // Recalculate total hours
            $attendance->total_hours = $attendance->calculateTotalHours();
            $attendance->overtime_hours = $attendance->calculateOvertimeHours();
            $attendance->undertime_hours = $attendance->calculateUndertimeHours();
            
            // Determine new status based on clock times
            $oldStatus = $attendance->status;
            $newStatus = $attendance->determineStatus();
            
            // Only update if not a special status (holidays, leaves, etc.)
            if (!in_array($oldStatus, ['Holiday (No Work)', 'Holiday (Worked)', 'On Leave', 'Absent'])) {
                $attendance->status = $newStatus;
                $attendance->save();
                $updated++;
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->newLine(2);
        $this->info("Successfully updated {$updated} attendance records.");
        
        return 0;
    }
}
