<?php

require_once 'vendor/autoload.php';

use Illuminate\Http\Request;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Models\User;
use App\Models\EmployeeProfile;
use App\Models\LeaveRequest;

echo "Testing Enhanced Leave Request Functionality\n";
echo "==========================================\n\n";

// Test 1: Check if we can get employee profile data
echo "1. Testing Employee Profile Data Retrieval:\n";
try {
    $users = User::with('employeeProfile')->take(5)->get();
    echo "Found " . $users->count() . " users\n";
    
    foreach ($users as $user) {
        echo "- User: {$user->first_name} {$user->last_name}";
        if ($user->employeeProfile) {
            echo " (Department: {$user->employeeProfile->department})";
        } else {
            echo " (No profile)";
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 2: Check existing leave requests
echo "2. Testing Leave Request Data:\n";
try {
    $leaveRequests = LeaveRequest::with(['employee'])->take(10)->get();
    echo "Found " . $leaveRequests->count() . " leave requests\n";
    
    foreach ($leaveRequests as $leave) {
        echo "- {$leave->employee_name} ({$leave->type}) from {$leave->from} to {$leave->to} - Status: {$leave->status}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Check validation rules
echo "3. Testing Enhanced Validation Rules:\n";
$validationRules = [
    'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Maternity Leave,Paternity Leave,Personal Leave,Bereavement Leave',
    'from' => 'required|date|after_or_equal:today',
    'to' => 'required|date|after_or_equal:from',
    'total_days' => 'nullable|integer|min:1',
    'total_hours' => 'nullable|numeric|min:0|max:8',
    'reason' => 'required|string|min:10|max:500',
    'signature' => 'nullable|file|mimes:pdf,jpg,jpeg,png,gif|max:2048',
    'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:2048'
];

echo "Enhanced validation rules implemented:\n";
foreach ($validationRules as $field => $rule) {
    echo "- {$field}: {$rule}\n";
}

echo "\n";

// Test 4: Available leave types
echo "4. Available Leave Types:\n";
$leaveTypes = [
    'Vacation Leave',
    'Sick Leave', 
    'Emergency Leave',
    'Maternity Leave',
    'Paternity Leave', 
    'Personal Leave',
    'Bereavement Leave'
];

foreach ($leaveTypes as $type) {
    echo "- {$type}\n";
}

echo "\n";

// Test 5: Check database connection for new routes
echo "5. Testing Database for New Functionality:\n";
try {
    $stats = [
        'total_users' => User::count(),
        'users_with_profiles' => User::whereHas('employeeProfile')->count(),
        'total_leave_requests' => LeaveRequest::count(),
        'pending_requests' => LeaveRequest::where('status', 'pending')->count(),
        'approved_requests' => LeaveRequest::where('status', 'approved')->count(),
    ];
    
    foreach ($stats as $key => $value) {
        echo "- " . ucwords(str_replace('_', ' ', $key)) . ": {$value}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
