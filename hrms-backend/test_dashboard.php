<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Attendance;
use App\Models\EmployeeProfile;
use Carbon\Carbon;

echo "=== Attendance Dashboard Test ===\n\n";

$dateFrom = Carbon::now()->startOfMonth()->format('Y-m-d');
$dateTo = Carbon::now()->endOfMonth()->format('Y-m-d');

echo "Date Range: {$dateFrom} to {$dateTo}\n\n";

$totalEmployees = EmployeeProfile::count();
$totalRecords = Attendance::whereBetween('date', [$dateFrom, $dateTo])->count();

echo "Total Employees: {$totalEmployees}\n";
echo "Total Attendance Records (this month): {$totalRecords}\n\n";

if ($totalRecords > 0) {
    $presentCount = Attendance::whereBetween('date', [$dateFrom, $dateTo])
        ->where('status', 'Present')->count();
    
    $absentCount = Attendance::whereBetween('date', [$dateFrom, $dateTo])
        ->where('status', 'Absent')->count();
        
    $lateCount = Attendance::whereBetween('date', [$dateFrom, $dateTo])
        ->where('status', 'Late')->count();

    echo "Present: {$presentCount}\n";
    echo "Absent: {$absentCount}\n";
    echo "Late: {$lateCount}\n\n";

    echo "Recent Attendance Records:\n";
    $recentAttendance = Attendance::with('employee')
        ->whereBetween('date', [$dateFrom, $dateTo])
        ->orderBy('date', 'desc')
        ->limit(5)
        ->get();

    foreach ($recentAttendance as $record) {
        $employeeName = $record->employee 
            ? "{$record->employee->first_name} {$record->employee->last_name}"
            : "Unknown (ID: {$record->employee_id})";
        
        echo "  - {$employeeName} | {$record->date} | {$record->status} | In: {$record->clock_in} | Out: {$record->clock_out}\n";
    }
} else {
    echo "No attendance records found for the current month.\n";
    echo "\nChecking all attendance records...\n";
    $allRecords = Attendance::orderBy('date', 'desc')->limit(5)->get(['date', 'status', 'employee_id']);
    foreach ($allRecords as $record) {
        echo "  - Employee ID: {$record->employee_id} | Date: {$record->date} | Status: {$record->status}\n";
    }
}

echo "\n=== Test Complete ===\n";
