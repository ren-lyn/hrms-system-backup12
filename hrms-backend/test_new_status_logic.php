<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;

echo "Testing New Attendance Status Logic\n";
echo "====================================\n\n";

// Get sample records with different statuses
$records = Attendance::whereNotNull('clock_in')
    ->whereNotNull('clock_out')
    ->whereIn('status', ['Present', 'Present - Late', 'Present - Undertime', 'Present - Overtime'])
    ->latest()
    ->take(20)
    ->get(['id', 'date', 'clock_in', 'clock_out', 'status']);

echo "Sample Records by Status:\n";
echo "-------------------------\n\n";

$statusGroups = $records->groupBy('status');

foreach (['Present', 'Present - Late', 'Present - Undertime', 'Present - Overtime'] as $status) {
    if (isset($statusGroups[$status])) {
        echo "Status: {$status}\n";
        echo str_repeat('-', 80) . "\n";
        
        foreach ($statusGroups[$status]->take(5) as $record) {
            $clockIn = \Carbon\Carbon::parse($record->clock_in)->format('H:i:s');
            $clockOut = \Carbon\Carbon::parse($record->clock_out)->format('H:i:s');
            
            echo sprintf(
                "  ID: %-4d | Date: %s | In: %s | Out: %s\n",
                $record->id,
                $record->date->format('Y-m-d'),
                $clockIn,
                $clockOut
            );
        }
        echo "\n";
    }
}

// Count by status
echo "\nStatus Distribution:\n";
echo "--------------------\n";

$statusCounts = Attendance::whereNotNull('clock_in')
    ->whereNotNull('clock_out')
    ->selectRaw('status, COUNT(*) as count')
    ->groupBy('status')
    ->orderBy('count', 'desc')
    ->get();

foreach ($statusCounts as $stat) {
    echo sprintf("%-25s: %d\n", $stat->status, $stat->count);
}

echo "\n";
echo "Test Cases:\n";
echo "-----------\n";

// Test specific scenarios
$testCases = [
    ['in' => '07:30:00', 'out' => '17:30:00', 'expected' => 'Present'],
    ['in' => '08:00:00', 'out' => '17:00:00', 'expected' => 'Present'],
    ['in' => '08:15:00', 'out' => '17:00:00', 'expected' => 'Present - Late'],
    ['in' => '08:30:00', 'out' => '17:30:00', 'expected' => 'Present - Late'],
    ['in' => '08:00:00', 'out' => '16:30:00', 'expected' => 'Present - Undertime'],
    ['in' => '09:00:00', 'out' => '17:00:00', 'expected' => 'Present - Undertime'],
    ['in' => '09:30:00', 'out' => '18:00:00', 'expected' => 'Present - Undertime'],
    ['in' => '08:00:00', 'out' => '18:00:00', 'expected' => 'Present - Overtime'],
    ['in' => '07:30:00', 'out' => '18:30:00', 'expected' => 'Present - Overtime'],
];

foreach ($testCases as $test) {
    $clockIn = \Carbon\Carbon::parse($test['in']);
    $clockOut = \Carbon\Carbon::parse($test['out']);
    $standardIn = \Carbon\Carbon::parse('08:00:00');
    $standardOut = \Carbon\Carbon::parse('17:00:00');
    $overtimeThreshold = \Carbon\Carbon::parse('18:00:00');

    $isLate = $clockIn->gt($standardIn);
    $isEarlyOut = $clockOut->lt($standardOut);
    $isTooLate = $clockIn->gte(\Carbon\Carbon::parse('09:00:00'));
    $isOvertime = $clockOut->gte($overtimeThreshold);

    if ($isOvertime && !$isLate && !$isEarlyOut) {
        $actual = 'Present - Overtime';
    } elseif ($isTooLate) {
        $actual = 'Present - Undertime';
    } elseif ($isEarlyOut) {
        $actual = 'Present - Undertime';
    } elseif ($isLate) {
        $actual = 'Present - Late';
    } else {
        $actual = 'Present';
    }

    $match = ($actual === $test['expected']) ? '✓' : '✗';
    
    echo sprintf(
        "%s In: %s | Out: %s | Expected: %-22s | Actual: %-22s\n",
        $match,
        $test['in'],
        $test['out'],
        $test['expected'],
        $actual
    );
}
