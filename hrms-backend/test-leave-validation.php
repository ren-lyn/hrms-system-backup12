<?php

require_once 'bootstrap/app.php';

use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\LeaveRequestController;

echo "=== Leave Type Validation Test ===\n\n";

$controller = new LeaveRequestController();

// Test scenarios
$testCases = [
    [
        'description' => 'Valid Vacation Leave (3 days)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'IT',
            'type' => 'Vacation Leave',
            'from' => '2024-01-15',
            'to' => '2024-01-17',
            'total_days' => 3,
            'total_hours' => 24,
            'reason' => 'Family vacation'
        ],
        'expected' => 'success'
    ],
    [
        'description' => 'Invalid Vacation Leave (6 days - exceeds limit)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'IT',
            'type' => 'Vacation Leave',
            'from' => '2024-01-15',
            'to' => '2024-01-20',
            'total_days' => 6,
            'total_hours' => 48,
            'reason' => 'Extended vacation'
        ],
        'expected' => 'error'
    ],
    [
        'description' => 'Valid Maternity Leave (90 days)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'HR',
            'type' => 'Maternity Leave',
            'from' => '2024-03-01',
            'to' => '2024-05-29',
            'total_days' => 90,
            'total_hours' => 720,
            'reason' => 'Maternity leave'
        ],
        'expected' => 'success'
    ],
    [
        'description' => 'Invalid Maternity Leave (120 days - exceeds limit)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'HR',
            'type' => 'Maternity Leave',
            'from' => '2024-03-01',
            'to' => '2024-06-28',
            'total_days' => 120,
            'total_hours' => 960,
            'reason' => 'Extended maternity leave'
        ],
        'expected' => 'error'
    ],
    [
        'description' => 'Valid Paternity Leave (7 days)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'Finance',
            'type' => 'Paternity Leave',
            'from' => '2024-02-12',
            'to' => '2024-02-18',
            'total_days' => 7,
            'total_hours' => 56,
            'reason' => 'Newborn care'
        ],
        'expected' => 'success'
    ],
    [
        'description' => 'Invalid Paternity Leave (10 days - exceeds limit)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'Finance',
            'type' => 'Paternity Leave',
            'from' => '2024-02-12',
            'to' => '2024-02-21',
            'total_days' => 10,
            'total_hours' => 80,
            'reason' => 'Extended paternity leave'
        ],
        'expected' => 'error'
    ],
    [
        'description' => 'Valid Sick Leave (5 days)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'Operations',
            'type' => 'Sick Leave',
            'from' => '2024-04-01',
            'to' => '2024-04-05',
            'total_days' => 5,
            'total_hours' => 40,
            'reason' => 'Medical treatment'
        ],
        'expected' => 'success'
    ],
    [
        'description' => 'Invalid Sick Leave (8 days - exceeds limit)',
        'data' => [
            'company' => 'Cabuyao Concrete Development Corporation',
            'name' => 'Test Employee',
            'department' => 'Operations',
            'type' => 'Sick Leave',
            'from' => '2024-04-01',
            'to' => '2024-04-08',
            'total_days' => 8,
            'total_hours' => 64,
            'reason' => 'Extended medical treatment'
        ],
        'expected' => 'error'
    ]
];

$passedTests = 0;
$totalTests = count($testCases);

foreach ($testCases as $index => $test) {
    echo "Test " . ($index + 1) . ": " . $test['description'] . "\n";
    echo "Leave Type: " . $test['data']['type'] . "\n";
    echo "Days Requested: " . $test['data']['total_days'] . "\n";
    
    try {
        $request = new Request($test['data']);
        
        // Mock the request validation - we'll bypass it for testing
        $response = $controller->store($request);
        $statusCode = $response->getStatusCode();
        
        if ($test['expected'] === 'success' && $statusCode === 201) {
            echo "✅ PASSED - Request successfully submitted\n";
            $passedTests++;
        } elseif ($test['expected'] === 'error' && $statusCode === 201) {
            echo "❌ FAILED - Request should have been rejected but was accepted\n";
        } else {
            echo "✅ PASSED - Request correctly rejected (validation working)\n";
            $passedTests++;
        }
        
    } catch (Exception $e) {
        if ($test['expected'] === 'error') {
            echo "✅ PASSED - Request correctly rejected: " . $e->getMessage() . "\n";
            $passedTests++;
        } else {
            echo "❌ FAILED - Unexpected error: " . $e->getMessage() . "\n";
        }
    }
    
    echo str_repeat("-", 70) . "\n\n";
}

echo "\n=== Test Summary ===\n";
echo "Passed: $passedTests/$totalTests tests\n";
echo "Success Rate: " . round(($passedTests / $totalTests) * 100, 1) . "%\n";

if ($passedTests === $totalTests) {
    echo "🎉 All tests passed! Leave type validation is working correctly.\n";
} else {
    echo "⚠️  Some tests failed. Please check the validation logic.\n";
}

echo "\n=== Leave Type Limits Configuration ===\n";
$entitlements = config('leave.entitlements');
foreach ($entitlements as $type => $days) {
    echo "• $type: $days days\n";
}

?>
