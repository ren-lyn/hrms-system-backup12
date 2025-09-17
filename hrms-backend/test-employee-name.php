<?php

$url = 'http://localhost:8000/api/leave-requests';
$data = [
    'type' => 'Sick Leave',
    'from' => date('Y-m-d', strtotime('+3 days')),
    'to' => date('Y-m-d', strtotime('+4 days')),
    'total_days' => 2,
    'total_hours' => 0,
    'reason' => 'Medical checkup',
    'name' => 'Crystal Anne Alcantara',
    'department' => 'Accounting'
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
    $response = json_decode($result, true);
    echo "Employee Name in Response: " . $response['data']['employee_name'] . "\n";
    echo "Department: " . $response['data']['department'] . "\n";
}

echo "\nNow fetching all leave requests to verify:\n";
$allRequests = file_get_contents('http://localhost:8000/api/leave-requests');
$requests = json_decode($allRequests, true);

foreach($requests as $request) {
    echo "ID: " . $request['id'] . " - Name: " . $request['employee_name'] . " - Department: " . $request['department'] . "\n";
}
?>
