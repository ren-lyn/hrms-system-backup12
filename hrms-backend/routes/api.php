<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\JobPostingController;
use App\Http\Controllers\Api\ApplicantController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\EmployeeEvaluationController;
use App\Http\Controllers\API\EvaluationAdministrationController;
use App\Http\Controllers\Api\CashAdvanceController;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/job-postings', [JobPostingController::class, 'index']);
    Route::post('/job-postings', [JobPostingController::class, 'store']);
    Route::put('/job-postings/{id}', [JobPostingController::class, 'update']);
    Route::delete('/job-postings/{id}', [JobPostingController::class, 'destroy']);
});

// Route::middleware(['auth:sanctum', 'role:HR Assistant'])->group(function () {
//     Route::put('/employees/{id}', [EmployeeController::class, 'update']);
//     Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
// });

Route::middleware(['auth:sanctum'])->group(function () {
    Route::put('/employees/{id}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
});


Route::get('/employees', [EmployeeController::class, 'index']);
Route::post('/employees', [EmployeeController::class, 'store']);

Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);
Route::middleware('auth:sanctum')->get('/auth/user', [AuthController::class, 'user']);

// Employee Profile Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/employee/profile', [EmployeeController::class, 'profile']);
    
    // Profile update endpoints with 3-edit limits
    Route::put('/employee/profile/name', [EmployeeController::class, 'updateName']);
    Route::put('/employee/profile/nickname', [EmployeeController::class, 'updateNickname']);
    Route::put('/employee/profile/address', [EmployeeController::class, 'updateAddress']);
    Route::put('/employee/profile/contact', [EmployeeController::class, 'updateContact']);
    Route::put('/employee/profile/emergency-contact', [EmployeeController::class, 'updateEmergencyContact']);
    
    // Other profile updates (no edit limits)
    Route::put('/employee/profile/civil-status', [EmployeeController::class, 'updateCivilStatus']);
});
Route::post('/register', [ApplicantController::class, 'register']);

Route::get('/test', function () {
    return response()->json(['message' => 'Laravel API is working']);
});

// Test database connection
Route::get('/test-db', function () {
    try {
        $users = \App\Models\User::count();
        $leaves = \App\Models\LeaveRequest::count();
        return response()->json([
            'message' => 'Database connection working',
            'users_count' => $users,
            'leave_requests_count' => $leaves
        ]);
    } catch (Exception $e) {
        return response()->json([
            'error' => 'Database connection failed',
            'message' => $e->getMessage()
        ], 500);
    }
});

//Leave Requests
// Public routes for testing (should be moved to authenticated routes in production)
Route::post('/leave-requests', [LeaveRequestController::class, 'store']); // employee
Route::get('/leave-requests', [LeaveRequestController::class, 'index']); // hr assistant
Route::get('/leave-requests/stats', [LeaveRequestController::class, 'getStats']); // hr stats
Route::get('/leave-requests/check-eligibility', [LeaveRequestController::class, 'checkEligibility']); // test eligibility check
Route::get('/leave-types', [LeaveRequestController::class, 'getLeaveTypes']); // get available leave types


// Temporary route for testing employee profile data (remove in production)
Route::get('/employee-profile-test/{userId?}', [LeaveRequestController::class, 'getEmployeeProfileTest']); // test profile data

// Employee-specific leave routes (authenticated)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/employee/profile-data', [LeaveRequestController::class, 'getEmployeeProfile']); // Get profile data for form
    Route::get('/leave-requests/my-requests', [LeaveRequestController::class, 'myRequests']); // Employee's own requests
    Route::get('/leave-requests/my-balance', [LeaveRequestController::class, 'getLeaveBalance']); // Employee leave balance
    Route::get('/leave-requests/check-eligibility', [LeaveRequestController::class, 'checkEligibility']); // Check if employee can submit new request
});

//Cash Advances
// Temporarily allow without auth for testing
Route::post('/cash-advances', [CashAdvanceController::class, 'store']); // employee
Route::get('/cash-advances', [CashAdvanceController::class, 'index']); // hr assistant
Route::get('/cash-advances/stats', [CashAdvanceController::class, 'stats']); // hr stats
Route::get('/cash-advances/{id}', [CashAdvanceController::class, 'show']); // view specific request
Route::put('/cash-advances/{id}/approve', [CashAdvanceController::class, 'approve']); // approve
Route::put('/cash-advances/{id}/reject', [CashAdvanceController::class, 'reject']); // reject

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/leave-requests/{id}', [LeaveRequestController::class, 'show']); // view specific leave
    Route::put('/leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']); // hr approve
    Route::put('/leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']); // hr reject
    Route::put('/leave-requests/{id}/terms', [LeaveRequestController::class, 'updateTermsAndCategory']); // hr set terms/category
    
    // Manager-specific routes
    Route::put('/leave-requests/{id}/manager-approve', [LeaveRequestController::class, 'managerApprove']); // manager approve
    Route::put('/leave-requests/{id}/manager-reject', [LeaveRequestController::class, 'managerReject']); // manager reject
    Route::get('/leave-requests/manager-pending', [LeaveRequestController::class, 'getManagerPendingRequests']); // manager pending requests
    Route::get('/leave-requests/hr-pending', [LeaveRequestController::class, 'getHRPendingRequests']); // hr pending requests
});


Route::middleware(['auth:sanctum', 'role:HR Assistant'])->group(function () {
    Route::get('/evaluations', [EmployeeEvaluationController::class, 'index']);
    Route::post('/evaluations', [EmployeeEvaluationController::class, 'store']);
    Route::get('/evaluations/{id}', [EmployeeEvaluationController::class, 'show']);
    Route::put('/evaluations/{id}', [EmployeeEvaluationController::class, 'update']);
    Route::delete('/evaluations/{id}', [EmployeeEvaluationController::class, 'destroy']);
});



Route::middleware(['auth:sanctum'])->group(function () {
    
    // Evaluation Form Management (HR Assistant)
    Route::prefix('evaluation-administration')->group(function () {
        Route::get('/', [EvaluationAdministrationController::class, 'index']);
        Route::post('/', [EvaluationAdministrationController::class, 'store']);
        Route::get('/{id}', [EvaluationAdministrationController::class, 'show']);
        Route::put('/{id}', [EvaluationAdministrationController::class, 'update']);
        Route::delete('/{id}', [EvaluationAdministrationController::class, 'destroy']);
        Route::put('/{id}/toggle-status', [EvaluationAdministrationController::class, 'toggleStatus']);
        Route::post('/{id}/duplicate', [EvaluationAdministrationController::class, 'duplicate']);
        Route::get('/active/forms', [EvaluationAdministrationController::class, 'getActiveForms']);
    });

    // Cash Advance Management
    Route::prefix('cash-advances')->group(function () {
        // Employee routes (submit request and view own requests)
        Route::post('/', [CashAdvanceController::class, 'store']); // Submit cash advance request
        Route::get('/my-requests', [CashAdvanceController::class, 'userRequests']); // Get user's own requests
        
        // HR Assistant routes (manage all requests)
        Route::get('/', [CashAdvanceController::class, 'index']); // List all requests with filters
        Route::get('/stats', [CashAdvanceController::class, 'stats']); // Dashboard statistics
        Route::get('/{id}', [CashAdvanceController::class, 'show']); // View specific request details
        Route::put('/{id}/approve', [CashAdvanceController::class, 'approve']); // Approve request
        Route::put('/{id}/reject', [CashAdvanceController::class, 'reject']); // Reject request
    });
});
