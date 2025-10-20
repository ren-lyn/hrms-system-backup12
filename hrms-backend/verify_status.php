<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;

echo "Verifying Attendance Status Updates\n";
echo "====================================\n\n";

$records = Attendance::whereNotNull('clock_in')
    ->whereNotNull('clock_out')
    ->latest()
    ->take(15)
    ->get(['id', 'date', 'clock_in', 'clock_out', 'total_hours', 'status']);

echo "Recent Attendance Records:\n";
echo "--------------------------\n";

foreach ($records as $record) {
    $expectedStatus = 'Unknown';
    if ($record->total_hours >= 9) {
        $expectedStatus = 'Overtime';
    } elseif ($record->total_hours >= 8) {
        $expectedStatus = 'Present';
    } else {
        $expectedStatus = 'Undertime';
    }
    
    $match = ($record->status === $expectedStatus) ? '✓' : '✗';
    
    echo sprintf(
        "%s ID: %-4d | Date: %s | Hours: %5.2f | Status: %-10s | Expected: %-10s\n",
        $match,
        $record->id,
        $record->date->format('Y-m-d'),
        $record->total_hours,
        $record->status,
        $expectedStatus
    );
}

echo "\n";

// Count by status
$statusCounts = Attendance::whereNotNull('clock_in')
    ->whereNotNull('clock_out')
    ->selectRaw('status, COUNT(*) as count')
    ->groupBy('status')
    ->get();

echo "Status Distribution:\n";
echo "--------------------\n";
foreach ($statusCounts as $stat) {
    echo sprintf("%-20s: %d\n", $stat->status, $stat->count);
}
