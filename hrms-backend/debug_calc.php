<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;
use Carbon\Carbon;

echo "Debugging Hour Calculation\n";
echo "==========================\n\n";

$record = Attendance::find(571);

if ($record) {
    echo "Record Details:\n";
    echo "Date: " . $record->date->format('Y-m-d') . "\n";
    echo "Clock In (raw): " . $record->clock_in . "\n";
    echo "Clock Out (raw): " . $record->clock_out . "\n";
    echo "\n";
    
    // Manual calculation
    $baseDate = $record->date->format('Y-m-d');
    echo "Base Date: " . $baseDate . "\n";
    
    $clockInTime = Carbon::parse($record->clock_in)->format('H:i:s');
    $clockOutTime = Carbon::parse($record->clock_out)->format('H:i:s');
    
    echo "Clock In Time: " . $clockInTime . "\n";
    echo "Clock Out Time: " . $clockOutTime . "\n";
    
    $clockIn = Carbon::parse($baseDate . ' ' . $clockInTime);
    $clockOut = Carbon::parse($baseDate . ' ' . $clockOutTime);
    
    echo "Clock In Full: " . $clockIn->format('Y-m-d H:i:s') . "\n";
    echo "Clock Out Full: " . $clockOut->format('Y-m-d H:i:s') . "\n";
    
    if ($clockOut->lt($clockIn)) {
        echo "Clock out is before clock in, adding 1 day\n";
        $clockOut->addDay();
        echo "Clock Out Full (adjusted): " . $clockOut->format('Y-m-d H:i:s') . "\n";
    }
    
    $totalMinutes = $clockOut->diffInMinutes($clockIn);
    $totalHours = round($totalMinutes / 60, 2);
    
    echo "\nTotal Minutes: " . $totalMinutes . "\n";
    echo "Total Hours: " . $totalHours . "\n";
}
