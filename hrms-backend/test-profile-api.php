<?php

require_once 'vendor/autoload.php';
use App\Models\User;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::capture();
$response = $kernel->handle($request);

echo "=== Testing Employee Profile API Response ===\n\n";

try {
    // Get a user with employee profile
    $user = User::with('employeeProfile')->first();
    if (!$user) {
        echo "❌ No users found\n";
        exit;
    }

    echo "👤 User Info:\n";
    echo "   ID: {$user->id}\n";
    echo "   First Name: {$user->first_name}\n";
    echo "   Last Name: {$user->last_name}\n";
    echo "   Email: {$user->email}\n";

    if ($user->employeeProfile) {
        echo "\n📋 Employee Profile:\n";
        echo "   Employee ID: {$user->employeeProfile->employee_id}\n";
        echo "   First Name: {$user->employeeProfile->first_name}\n";
        echo "   Last Name: {$user->employeeProfile->last_name}\n";
        echo "   Department: {$user->employeeProfile->department}\n";
        echo "   Position: {$user->employeeProfile->position}\n";
        echo "   Job Title: {$user->employeeProfile->job_title}\n";

        // Show what the API response would look like
        echo "\n🔧 API Response Structure:\n";
        $apiResponse = [
            'profile' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'department' => $user->employeeProfile->department,
                'position' => $user->employeeProfile->position,
                'job_title' => $user->employeeProfile->job_title
            ]
        ];
        echo json_encode($apiResponse, JSON_PRETTY_PRINT) . "\n";
    } else {
        echo "\n❌ No employee profile found\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
