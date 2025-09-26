<?php

// Test the API endpoint directly
$baseUrl = 'http://localhost:8000/api'; // Adjust if your server runs on different port

echo "=== Testing Leave Request API Validation ===\n\n";

// Test case: Vacation Leave with 6 days (exceeds 5-day limit)
$testData = [
    'company' => 'Cabuyao Concrete Development Corporation',
    'name' => 'Test Employee',
    'department' => 'IT Department',
    'type' => 'Vacation Leave',
    'from' => '2024-10-01',
    'to' => '2024-10-06', // 6 days
    'total_days' => 6,
    'total_hours' => 48,
    'reason' => 'Family vacation - testing validation'
];

echo "Testing: Vacation Leave with 6 days (should be rejected)\n";
echo "Expected message: 'You can only file up to 5 days for Vacation Leave.'\n\n";

// Convert data to form format
$postData = http_build_query($testData);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json'
        ],
        'content' => $postData
    ]
]);

// Make API call
$response = file_get_contents($baseUrl . '/leave-requests', false, $context);

if ($response === false) {
    echo "❌ Failed to make API call. Make sure your Laravel server is running with:\n";
    echo "   php artisan serve\n\n";
    echo "If server is running on different port, update the \$baseUrl in this script.\n";
} else {
    $result = json_decode($response, true);
    
    if (isset($result['error'])) {
        echo "✅ Request was rejected with error:\n";
        echo "   " . $result['error'] . "\n\n";
        
        if (strpos($result['error'], 'You can only file up to 5 days for Vacation Leave') === 0) {
            echo "🎉 Perfect! The error message matches your requirement.\n";
        } else {
            echo "⚠️  The error message format is different than expected.\n";
        }
    } else {
        echo "❌ Request was accepted when it should have been rejected.\n";
        echo "Response: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
    }
}

echo "\n=== Test Complete ===\n";
echo "Note: Make sure to run 'php artisan serve' in another terminal before running this test.\n";

?>
