<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;

echo "Verifying Non-Holiday Attendance Records\n";
echo "========================================\n\n";

// Get records with Present, Overtime, and Undertime status
$records = Attendance::whereIn('status', ['Present', 'Overtime', 'Undertime'])
    ->whereNotNull('clock_in')
    ->whereNotNull('clock_out')
    ->latest()
    ->take(20)
    ->get(['id', 'date', 'clock_in', 'clock_out', 'total_hours', 'status']);

echo "Sample Records:\n";
echo "---------------\n";

$correctCount = 0;
$totalCount = 0;

foreach ($records as $record) {
    $expectedStatus = 'Unknown';
    if ($record->total_hours >= 9) {
        $expectedStatus = 'Overtime';
    } elseif ($record->total_hours >= 8) {
        $expectedStatus = 'Present';
    } else {
        $expectedStatus = 'Undertime';
    }
    
    $match = ($record->status === $expectedStatus);
    if ($match) $correctCount++;
    $totalCount++;
    
    $statusIcon = $match ? '✓' : '✗';
    
    echo sprintf(
        "%s ID: %-4d | Date: %s | Hours: %5.2f | Status: %-10s | Expected: %-10s\n",
        $statusIcon,
        $record->id,
        $record->date->format('Y-m-d'),
        $record->total_hours,
        $record->status,
        $expectedStatus
    );
}

echo "\n";
echo sprintf("Accuracy: %d/%d (%.1f%%)\n", $correctCount, $totalCount, ($correctCount/$totalCount)*100);
