<?php

// Simple test to submit a leave request
$url = 'http://localhost:8000/api/leave-requests';

// Calculate dates
$tomorrow = date('Y-m-d', strtotime('+1 day'));
$dayAfter = date('Y-m-d', strtotime('+2 days'));

$data = [
    'type' => 'Vacation Leave',
    'from' => $tomorrow,
    'to' => $dayAfter,
    'total_days' => 2,
    'total_hours' => 0,
    'reason' => 'Testing the leave request API endpoint functionality',
];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data),
    ],
];

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result === FALSE) {
    echo "ERROR: Failed to make request\n";
} else {
    echo "SUCCESS: Leave request submitted\n";
    echo "Response: " . $result . "\n";
}

// Check if it was created
$checkUrl = 'http://localhost:8000/api/test-db';
$checkResult = file_get_contents($checkUrl);
echo "\nDatabase status after submission:\n";
echo $checkResult . "\n";
?>
