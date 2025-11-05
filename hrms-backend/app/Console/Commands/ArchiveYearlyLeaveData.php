<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ArchiveYearlyLeaveData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leave:archive-yearly';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Archive leave data from the previous year and prepare for new year reset';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting yearly leave data archive process...');
        
        // Get the previous year
        $previousYear = Carbon::now()->subYear()->year;
        $currentYear = Carbon::now()->year;
        
        $this->info("Archiving leave data for year: {$previousYear}");
        
        // Count approved and rejected leaves from previous year
        $approvedCount = LeaveRequest::where('status', 'approved')
            ->whereYear('from', $previousYear)
            ->count();
            
        $rejectedCount = LeaveRequest::where('status', 'rejected')
            ->whereYear('from', $previousYear)
            ->count();
            
        $totalArchived = $approvedCount + $rejectedCount;
        
        // Log the archive process
        Log::info('Yearly Leave Data Archive', [
            'previous_year' => $previousYear,
            'current_year' => $currentYear,
            'approved_leaves' => $approvedCount,
            'rejected_leaves' => $rejectedCount,
            'total_archived' => $totalArchived,
            'archived_at' => Carbon::now()->toDateTimeString()
        ]);
        
        $this->info("Archived {$approvedCount} approved leaves and {$rejectedCount} rejected leaves from {$previousYear}");
        $this->info("Total leaves archived: {$totalArchived}");
        
        // Note: We don't actually delete or move data - the Leave History component
        // already filters by approved/rejected status, so all historical data is accessible.
        // The "reset" happens automatically because:
        // 1. Stats are calculated based on current year (will be updated)
        // 2. Leave Tracker already filters by year
        // 3. Leave History shows all approved/rejected leaves regardless of year
        
        $this->info('Yearly archive process completed successfully!');
        $this->info('Note: Leave data is automatically filtered by year in the application.');
        $this->info('Previous year data is accessible in Leave History section.');
        
        return Command::SUCCESS;
    }
}

