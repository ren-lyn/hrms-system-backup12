<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;

echo "Verifying Simplified Attendance Status\n";
echo "=======================================\n\n";

// Count by status
$statusCounts = Attendance::whereNotNull('clock_in')
    ->whereNotNull('clock_out')
    ->selectRaw('status, COUNT(*) as count')
    ->groupBy('status')
    ->orderBy('count', 'desc')
    ->get();

echo "Status Distribution:\n";
echo "--------------------\n";
foreach ($statusCounts as $stat) {
    echo sprintf("%-25s: %d\n", $stat->status, $stat->count);
}

echo "\n\nSample Records by Status:\n";
echo "-------------------------\n\n";

$statuses = ['Present', 'Late', 'Undertime', 'Overtime'];

foreach ($statuses as $status) {
    $records = Attendance::where('status', $status)
        ->whereNotNull('clock_in')
        ->whereNotNull('clock_out')
        ->latest()
        ->take(3)
        ->get(['id', 'date', 'clock_in', 'clock_out', 'status']);
    
    if ($records->count() > 0) {
        echo "Status: {$status}\n";
        echo str_repeat('-', 80) . "\n";
        
        foreach ($records as $record) {
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

echo "\nTest Cases:\n";
echo "-----------\n";

$testCases = [
    ['in' => '07:30:00', 'out' => '17:30:00', 'expected' => 'Present'],
    ['in' => '08:00:00', 'out' => '17:00:00', 'expected' => 'Present'],
    ['in' => '08:15:00', 'out' => '17:00:00', 'expected' => 'Late'],
    ['in' => '08:30:00', 'out' => '17:30:00', 'expected' => 'Late'],
    ['in' => '08:00:00', 'out' => '16:30:00', 'expected' => 'Undertime'],
    ['in' => '09:00:00', 'out' => '17:00:00', 'expected' => 'Undertime'],
    ['in' => '09:30:00', 'out' => '18:00:00', 'expected' => 'Undertime'],
    ['in' => '08:00:00', 'out' => '18:00:00', 'expected' => 'Overtime'],
    ['in' => '07:30:00', 'out' => '18:30:00', 'expected' => 'Overtime'],
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
        $actual = 'Overtime';
    } elseif ($isTooLate) {
        $actual = 'Undertime';
    } elseif ($isEarlyOut) {
        $actual = 'Undertime';
    } elseif ($isLate) {
        $actual = 'Late';
    } else {
        $actual = 'Present';
    }

    $match = ($actual === $test['expected']) ? '✓' : '✗';
    
    echo sprintf(
        "%s In: %s | Out: %s | Expected: %-10s | Actual: %-10s\n",
        $match,
        $test['in'],
        $test['out'],
        $test['expected'],
        $actual
    );
}
