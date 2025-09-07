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
Route::post('/register', [ApplicantController::class, 'register']);

Route::get('/test', function () {
    return response()->json(['message' => 'Laravel API is working']);
});

//Leave Requests
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']); // employee
    Route::get('/leave-requests', [LeaveRequestController::class, 'index']); // hr assistant
    Route::get('/leave-requests/stats', [LeaveRequestController::class, 'getStats']); // hr stats
    Route::get('/leave-requests/{id}', [LeaveRequestController::class, 'show']); // view specific leave
    Route::put('/leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']); // hr approve
    Route::put('/leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']); // hr reject
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
});