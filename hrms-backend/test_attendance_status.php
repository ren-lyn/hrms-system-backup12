<?php

// Test script to verify attendance status logic
// Run this with: php test_attendance_status.php

echo "Testing Attendance Status Logic\n";
echo "================================\n\n";

function determineStatus($totalHours) {
    if ($totalHours >= 9) {
        return 'Overtime';
    } elseif ($totalHours >= 8) {
        return 'Present';
    } else {
        return 'Undertime';
    }
}

$testCases = [
    7.0 => 'Undertime',
    7.5 => 'Undertime',
    7.99 => 'Undertime',
    8.0 => 'Present',
    8.25 => 'Present',
    8.5 => 'Present',
    8.75 => 'Present',
    8.99 => 'Present',
    9.0 => 'Overtime',
    9.5 => 'Overtime',
    10.0 => 'Overtime',
    10.5 => 'Overtime',
];

echo "Test Results:\n";
echo "-------------\n";

$allPassed = true;
foreach ($testCases as $hours => $expectedStatus) {
    $actualStatus = determineStatus($hours);
    $passed = ($actualStatus === $expectedStatus);
    $allPassed = $allPassed && $passed;
    
    $statusIcon = $passed ? '✓' : '✗';
    echo sprintf(
        "%s %.2f hours => Expected: %-10s | Actual: %-10s %s\n",
        $statusIcon,
        $hours,
        $expectedStatus,
        $actualStatus,
        $passed ? '' : '(FAILED)'
    );
}

echo "\n";
echo $allPassed ? "All tests PASSED! ✓\n" : "Some tests FAILED! ✗\n";
