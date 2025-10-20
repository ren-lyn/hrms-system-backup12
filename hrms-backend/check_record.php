<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;

echo "Checking Specific Attendance Record\n";
echo "====================================\n\n";

$record = Attendance::find(571);

if ($record) {
    echo "Record ID: " . $record->id . "\n";
    echo "Employee ID: " . $record->employee_id . "\n";
    echo "Date: " . $record->date->format('Y-m-d') . "\n";
    echo "Clock In: " . ($record->clock_in ? $record->clock_in->format('Y-m-d H:i:s') : 'NULL') . "\n";
    echo "Clock Out: " . ($record->clock_out ? $record->clock_out->format('Y-m-d H:i:s') : 'NULL') . "\n";
    echo "Total Hours (stored): " . $record->total_hours . "\n";
    echo "Status: " . $record->status . "\n";
    echo "\n";
    
    // Recalculate
    if ($record->clock_in && $record->clock_out) {
        $recalculated = $record->calculateTotalHours();
        echo "Recalculated Hours: " . $recalculated . "\n";
    }
} else {
    echo "Record not found.\n";
}
