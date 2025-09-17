<?php

require_once 'vendor/autoload.php';
use App\Models\User;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::capture();
$response = $kernel->handle($request);

echo "=== Checking User Profile Data ===\n\n";

try {
    $user = User::first();
    if (!$user) {
        echo "❌ No users found\n";
        exit;
    }

    echo "📋 User Information:\n";
    echo "   ID: {$user->id}\n";
    echo "   Name: {$user->first_name} {$user->last_name}\n";
    echo "   Email: {$user->email}\n\n";

    // Check if user has employee profile
    $profile = $user->employeeProfile;
    if ($profile) {
        echo "👤 Employee Profile Found:\n";
        echo "   Employee ID: {$profile->employee_id}\n";
        echo "   Department: " . ($profile->department ?: 'Not Set') . "\n";
        echo "   Position: " . ($profile->position ?: 'Not Set') . "\n";
        echo "   Job Title: " . ($profile->job_title ?: 'Not Set') . "\n";
        echo "   Employment Status: " . ($profile->employment_status ?: 'Not Set') . "\n\n";
    } else {
        echo "❌ No employee profile found for this user\n\n";
    }

    // Check a few more users
    $users = User::with('employeeProfile')->limit(3)->get();
    echo "📊 All Users and Departments:\n";
    foreach ($users as $u) {
        $dept = $u->employeeProfile->department ?? 'No Profile';
        echo "   • {$u->first_name} {$u->last_name} - {$dept}\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n=== Profile Check Complete ===\n";
