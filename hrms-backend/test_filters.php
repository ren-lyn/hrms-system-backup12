<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;
use App\Models\EmployeeProfile;
use Carbon\Carbon;

echo "=== Testing Attendance Filters ===\n\n";

// Test 1: Date Range Filter
echo "Test 1: Date Range Filter (Oct 1-3, 2025)\n";
$records = Attendance::whereBetween('date', ['2025-10-01', '2025-10-03'])->count();
echo "Records found: {$records}\n\n";

// Test 2: Status Filter
echo "Test 2: Status Filter (Present only)\n";
$presentRecords = Attendance::whereBetween('date', ['2025-10-01', '2025-10-31'])
    ->where('status', 'Present')
    ->count();
echo "Present records: {$presentRecords}\n\n";

// Test 3: Search Filter
echo "Test 3: Search Filter (Search for 'Juan')\n";
$searchRecords = Attendance::whereBetween('date', ['2025-10-01', '2025-10-31'])
    ->whereHas('employee', function($q) {
        $q->where('first_name', 'LIKE', '%Juan%')
          ->orWhere('last_name', 'LIKE', '%Juan%');
    })
    ->count();
echo "Records for 'Juan': {$searchRecords}\n\n";

// Test 4: Combined Filters
echo "Test 4: Combined Filters (Oct 1-3, Status=Present, Search='Juan')\n";
$combinedRecords = Attendance::whereBetween('date', ['2025-10-01', '2025-10-03'])
    ->where('status', 'Present')
    ->whereHas('employee', function($q) {
        $q->where('first_name', 'LIKE', '%Juan%')
          ->orWhere('last_name', 'LIKE', '%Juan%');
    })
    ->with('employee')
    ->get();

echo "Records found: " . $combinedRecords->count() . "\n";
foreach ($combinedRecords as $record) {
    echo "  - {$record->employee->first_name} {$record->employee->last_name} | {$record->date} | {$record->status}\n";
}

echo "\n=== Test Complete ===\n";
