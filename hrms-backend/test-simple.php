<?php

require_once 'vendor/autoload.php';

// Create Laravel app
$app = require_once 'bootstrap/app.php';

echo "=== Leave Type Validation Test ===\n";
echo "Testing leave type limits configuration:\n\n";

// Test configuration loading
$entitlements = config('leave.entitlements');
foreach ($entitlements as $type => $days) {
    echo "• $type: $days days\n";
}

echo "\n=== Testing Error Messages ===\n";

// Test the checkLeaveTypeLimit method directly
$controller = new \App\Http\Controllers\Api\LeaveRequestController();

// Use reflection to access the private method
$reflection = new ReflectionClass($controller);
$method = $reflection->getMethod('checkLeaveTypeLimit');
$method->setAccessible(true);

// Test cases
$testCases = [
    ['Vacation Leave', 6, 'should fail (limit: 5)'],
    ['Vacation Leave', 3, 'should pass (limit: 5)'],
    ['Sick Leave', 8, 'should fail (limit: 5)'],
    ['Paternity Leave', 10, 'should fail (limit: 7)'],
    ['Maternity Leave', 120, 'should fail (limit: 105)'],
];

foreach ($testCases as $test) {
    [$leaveType, $days, $description] = $test;
    $result = $method->invoke($controller, $leaveType, $days);
    
    if ($result === null) {
        echo "✅ $leaveType ($days days) - PASSED: $description\n";
    } else {
        echo "❌ $leaveType ($days days) - ERROR: $result\n";
        
        // Check if the error message matches our expected format
        $expectedFormat = "You can only file up to";
        if (strpos($result, $expectedFormat) === 0) {
            echo "   ✅ Error message format is correct\n";
        } else {
            echo "   ❌ Error message format needs improvement\n";
        }
    }
}

echo "\n✅ Test completed!\n";

?>
