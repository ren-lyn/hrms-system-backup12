<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\JobPostingController;
use App\Http\Controllers\Api\ApplicantController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\EmployeeEvaluationController;
use App\Http\Controllers\Api\EvaluationAdministrationController;
use App\Http\Controllers\API\ManagerEvaluationController;
use App\Http\Controllers\Api\CashAdvanceController;
use App\Http\Controllers\HrCalendarController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationStreamController;
use App\Http\Controllers\ManagerDisciplinaryController;
use App\Http\Controllers\HRDisciplinaryController;
use App\Http\Controllers\EmployeeDisciplinaryController;
use App\Http\Controllers\Api\ManagerController;
use App\Http\Controllers\Api\holidayController;
use App\Http\Controllers\Api\HolidayController as ApiHolidayController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PayrollPeriodController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\TaxTitleController;
use App\Http\Controllers\Api\DeductionTitleController;
use App\Http\Controllers\Api\EmployeeLeaveLimitController;
use App\Http\Controllers\Api\OvertimeRequestController;
use App\Http\Controllers\InterviewController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\PositionController;
use App\Http\Controllers\Api\SecuritySettingsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\PasswordChangeRequestController;
use App\Http\Controllers\Api\SecurityAlertController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\DocumentController;


Route::middleware(['auth:sanctum', 'role:HR Assistant,HR Staff'])->group(function () {
    Route::get('/job-postings', [JobPostingController::class, 'index']);
    Route::post('/job-postings', [JobPostingController::class, 'store']);
    Route::put('/job-postings/{id}', [JobPostingController::class, 'update']);
    Route::delete('/job-postings/{id}', [JobPostingController::class, 'destroy']);
    Route::put('/job-postings/{id}/toggle', [JobPostingController::class, 'toggleStatus']);
    Route::get('/job-postings/salary-ranges', [JobPostingController::class, 'getSalaryRanges']);
    Route::put('/applications/{id}/status', [ApplicationController::class, 'updateStatus']);
    
    
    // Interview routes for HR Staff and HR Assistant
    Route::get('/interviews', [\App\Http\Controllers\Api\InterviewController::class, 'index']);
    Route::post('/interviews', [\App\Http\Controllers\Api\InterviewController::class, 'store']);
    Route::get('/interviews/{id}', [\App\Http\Controllers\Api\InterviewController::class, 'show']);
    Route::put('/interviews/{id}', [\App\Http\Controllers\Api\InterviewController::class, 'update']);
    Route::delete('/interviews/{id}', [\App\Http\Controllers\Api\InterviewController::class, 'destroy']);
    
    // User interview routes for applicants (moved outside HR middleware)
    
    // Test notification route (for debugging)
    Route::post('/test-interview-notification', [\App\Http\Controllers\Api\InterviewController::class, 'testNotification']);
});
Route::get('/public/job-postings', [JobPostingController::class, 'getPublicJobPostings']);
Route::get('/public/job-postings/salary-ranges', [JobPostingController::class, 'getSalaryRanges']);

// Applicant interview routes (accessible to authenticated applicants)
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/interviews/user/{user_id}', [\App\Http\Controllers\Api\InterviewController::class, 'getUserInterviewsByUserId']);
    Route::get('/user-interviews', [\App\Http\Controllers\Api\InterviewController::class, 'getUserInterviews']);
    Route::get('/user-interviews-by-user-id', [\App\Http\Controllers\Api\InterviewController::class, 'getUserInterviewsByUserId']);
    Route::get('/interviews', [\App\Http\Controllers\Api\InterviewController::class, 'index']); // For debugging
});

// Route::middleware(['auth:sanctum', 'role:HR Assistant'])->group(function () {
//     Route::put('/employees/{id}', [EmployeeController::class, 'update']);
//     Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
// });

Route::middleware(['auth:sanctum'])->group(function () {
    Route::put('/employees/{id}', [EmployeeController::class, 'update']);
    Route::put('/employees/{id}/terminate', [EmployeeController::class, 'terminate']);
    Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
});


Route::get('/employees', [EmployeeController::class, 'index']);
Route::get('/employees/missing-profiles', [EmployeeController::class, 'missingProfiles']);
Route::post('/employees/fix-missing-profiles', [EmployeeController::class, 'fixMissingProfiles']);
Route::post('/employees', [EmployeeController::class, 'store']);

Route::post('/login', [AuthController::class, 'login'])->name('login');
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->get('/auth/user', [AuthController::class, 'user']);
Route::middleware('auth:sanctum')->get('/user', [AuthController::class, 'user']); // Alias for /auth/user

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
// Password change request (public or authenticated)
Route::post('/password-change-requests', [PasswordChangeRequestController::class, 'store']);


// Debug routes for manager evaluation (temporary)
Route::get('/debug/employees', function () {
    $employees = \App\Models\User::with(['employeeProfile', 'role'])
        ->whereHas('role', function($query) {
            $query->where('name', 'Employee');
        })
        ->get();
    return response()->json([
        'count' => $employees->count(),
        'employees' => $employees->map(function($emp) {
            return [
                'id' => $emp->id,
                'name' => $emp->name,
                'email' => $emp->email,
                'role' => $emp->role->name ?? 'No role',
                'profile' => $emp->employeeProfile ? [
                    'employee_id' => $emp->employeeProfile->employee_id,
                    'department' => $emp->employeeProfile->department,
                    'position' => $emp->employeeProfile->position,
                ] : null
            ];
        })
    ]);
});

Route::get('/debug/active-form', function () {
    $activeForm = \App\Models\EvaluationForm::with('questions')
        ->where('status', 'Active')
        ->latest()
        ->first();
    return response()->json([
        'found' => $activeForm ? true : false,
        'form' => $activeForm ? [
            'id' => $activeForm->id,
            'title' => $activeForm->title,
            'status' => $activeForm->status,
            'questions_count' => $activeForm->questions->count()
        ] : null,
        'all_forms' => \App\Models\EvaluationForm::select('id', 'title', 'status')->get()
    ]);
});


// Public job postings (for applicants to view)
Route::get('/public/job-postings', [JobPostingController::class, 'getPublicJobPostings']);

// Application routes
Route::middleware('auth:sanctum')->group(function () {
    // Applicant routes
    Route::post('/applications', [ApplicationController::class, 'store']);
    
    // HR routes
    Route::get('/applications', [ApplicationController::class, 'index']);
    Route::get('/applications/job/{jobId}', [ApplicationController::class, 'getByJobPosting']);
    Route::put('/applications/{id}/status', [ApplicationController::class, 'updateStatus']);
    Route::post('/applications/{id}/schedule-interview', [ApplicationController::class, 'scheduleInterview']);
    Route::post('/applications/schedule-batch-interviews', [ApplicationController::class, 'scheduleBatchInterviews']);
    Route::post('/applications/{id}/send-offer', [ApplicationController::class, 'sendOffer']);
    Route::get('/applications/{id}/resume', [ApplicationController::class, 'downloadResume']);
    Route::get('/applications/stats', [ApplicationController::class, 'getStats']);
    Route::get('/applications/status-updates/{since?}', [ApplicationController::class, 'getStatusUpdates']);
    
    // Applicant routes
    Route::get('/my-applications', [ApplicationController::class, 'myApplications']);
    Route::get('/applications/{id}/job-offer', [ApplicationController::class, 'getJobOffer']);
    Route::post('/applications/{id}/accept-offer', [ApplicationController::class, 'acceptOffer']);
    Route::post('/applications/{id}/decline-offer', [ApplicationController::class, 'declineOffer']);
    
    // Document Management Routes
    Route::prefix('applications/{applicationId}/documents')->group(function () {
        // Document Requirements (HR only)
        Route::middleware(['role:HR Assistant,HR Staff'])->group(function () {
            Route::get('/requirements', [DocumentController::class, 'getRequirements']);
            Route::post('/requirements', [DocumentController::class, 'createRequirement']);
            Route::put('/requirements/{requirementId}', [DocumentController::class, 'updateRequirement']);
            Route::delete('/requirements/{requirementId}', [DocumentController::class, 'deleteRequirement']);
        });
        
        // Document Submissions
        Route::get('/submissions', [DocumentController::class, 'getSubmissions']);
        Route::post('/requirements/{requirementId}/upload', [DocumentController::class, 'uploadSubmission']);
        Route::post('/submit', [DocumentController::class, 'submitDocuments']);
        Route::get('/check-approved', [DocumentController::class, 'checkAllApproved']);
        Route::get('/submissions/{submissionId}/download', [DocumentController::class, 'downloadSubmission']);
        Route::delete('/submissions/{submissionId}', [DocumentController::class, 'deleteSubmission']);
        
        // Review submissions (HR only)
        Route::middleware(['role:HR Assistant,HR Staff'])->group(function () {
            Route::put('/submissions/{submissionId}/review', [DocumentController::class, 'reviewSubmission']);
        });
    });
});

Route::get('/test', function () {
    return response()->json(['message' => 'Laravel API is working']);
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
Route::delete('/leave-requests/clear-my-requests', [LeaveRequestController::class, 'clearMyLeaveRequests']); // clear all leave requests for testing


// Employee-specific leave routes (authenticated)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/employee/profile-data', [LeaveRequestController::class, 'getEmployeeProfile']); // Get profile data for form
    Route::get('/leave-requests/my-requests', [LeaveRequestController::class, 'myRequests']); // Employee's own requests
    Route::get('/leave-requests/my-balance', [LeaveRequestController::class, 'getLeaveBalance']); // Employee leave balance
    Route::get('/leave-requests/my-summary', [LeaveRequestController::class, 'getLeaveSummary']); // Employee leave summary with automatic payment status
    Route::get('/leave-requests/check-eligibility', [LeaveRequestController::class, 'checkEligibility']); // Check if employee can submit new request
    Route::get('/leave-requests/{id}/download-pdf', [LeaveRequestController::class, 'downloadPdf']); // Download leave request as PDF
});

//Cash Advances
// Temporarily allow without auth for testing
Route::post('/cash-advances', [CashAdvanceController::class, 'store']); // employee
Route::get('/cash-advances', [CashAdvanceController::class, 'index']); // hr assistant
Route::get('/cash-advances/stats', [CashAdvanceController::class, 'stats']); // hr stats
Route::get('/cash-advances/{id}', [CashAdvanceController::class, 'show']); // view specific request
Route::put('/cash-advances/{id}/approve', [CashAdvanceController::class, 'approve']); // approve
Route::put('/cash-advances/{id}/reject', [CashAdvanceController::class, 'reject']); // reject
Route::put('/cash-advances/{id}/money-received-status', [CashAdvanceController::class, 'updateMoneyReceivedStatus']); // update money received status

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']); // employee
    Route::get('/leave-requests', [LeaveRequestController::class, 'index']); // hr assistant
    Route::get('/leave-requests/stats', [LeaveRequestController::class, 'getStats']); // hr stats
    Route::get('/leave-requests/{id}', [LeaveRequestController::class, 'show']); // view specific leave
    Route::get('/leave-requests/{id}/attachment', [LeaveRequestController::class, 'serveAttachment']); // serve attachment file
    Route::put('/leave-requests/{id}/approve', [LeaveRequestController::class, 'approve']); // hr approve
    Route::put('/leave-requests/{id}/reject', [LeaveRequestController::class, 'reject']); // hr reject
    Route::put('/leave-requests/{id}/confirm-rejection', [LeaveRequestController::class, 'confirmManagerRejection']); // hr confirm manager rejection
    Route::put('/leave-requests/{id}/terms', [LeaveRequestController::class, 'updateTermsAndCategory']); // hr set terms/category
    
    // Manager-specific routes
    Route::put('/leave-requests/{id}/manager-approve', [LeaveRequestController::class, 'managerApprove']); // manager approve
    Route::put('/leave-requests/{id}/manager-reject', [LeaveRequestController::class, 'managerReject']); // manager reject
    Route::get('/leave-requests/manager-pending', [LeaveRequestController::class, 'getManagerPendingRequests']); // manager pending requests
    Route::get('/leave-requests/hr-pending', [LeaveRequestController::class, 'getHRPendingRequests']); // hr pending requests
    
    // Leave Tracker API
    Route::get('/leave-tracker', [LeaveRequestController::class, 'getLeaveTrackerData']); // get employee leave tracker data

    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::get('/notifications/stream', [NotificationStreamController::class, 'stream']);


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

    // Manager Evaluation Routes
    Route::prefix('manager-evaluations')->group(function () {
        Route::get('/active-form', [ManagerEvaluationController::class, 'getActiveForm']);
        Route::get('/employees', [ManagerEvaluationController::class, 'getEmployees']);
        Route::post('/start/{employeeId}', [ManagerEvaluationController::class, 'startEvaluation']);
        Route::post('/submit/{evaluationId}', [ManagerEvaluationController::class, 'submitEvaluation']);
        Route::get('/result/{evaluationId}', [ManagerEvaluationController::class, 'getEvaluationResult']);
        Route::get('/result/{evaluationId}/pdf', [ManagerEvaluationController::class, 'downloadPdf']);
        Route::get('/employee/{employeeId}/results', [ManagerEvaluationController::class, 'getEmployeeResults']);
        Route::get('/my-evaluations', [ManagerEvaluationController::class, 'getMyEvaluations']);
    });

    // Employee Evaluation Routes - For employees to view their own evaluations
    Route::prefix('employee-evaluations')->group(function () {
        Route::get('/my-evaluations', [ManagerEvaluationController::class, 'getMyEvaluationResults']); // Get employee's own evaluations
        Route::get('/{evaluationId}', [ManagerEvaluationController::class, 'getEvaluationResultForEmployee']); // View specific evaluation result
        Route::get('/{evaluationId}/pdf', [ManagerEvaluationController::class, 'downloadPdfForEmployee']); // Download evaluation PDF
    });

    // Cash Advance Management
    Route::prefix('cash-advances')->group(function () {
        // Employee routes (submit request and view own requests)
        Route::post('/', [CashAdvanceController::class, 'store']); // Submit cash advance request
        Route::get('/my-requests', [CashAdvanceController::class, 'userRequests']); // Get user's own requests
        Route::get('/my-stats', [CashAdvanceController::class, 'userStats']); // Get user's cash advance statistics
        Route::get('/{id}/download-pdf', [CashAdvanceController::class, 'downloadPDF']); // Download cash advance form as PDF
        
        // HR Assistant routes (manage all requests)
        Route::get('/', [CashAdvanceController::class, 'index']); // List all requests with filters
        Route::get('/stats', [CashAdvanceController::class, 'stats']); // Dashboard statistics
        Route::get('/{id}', [CashAdvanceController::class, 'show']); // View specific request details
        Route::put('/{id}/approve', [CashAdvanceController::class, 'approve']); // Approve request
        Route::put('/{id}/reject', [CashAdvanceController::class, 'reject']); // Reject request
    });
    
    // HR Calendar Management
    Route::prefix('hr-calendar')->group(function () {
        Route::get('/', [HrCalendarController::class, 'index']); // List events
        Route::post('/', [HrCalendarController::class, 'store']); // Create event
        Route::get('/todays-events', [HrCalendarController::class, 'todaysEvents']); // Today's events
        Route::get('/upcoming', [HrCalendarController::class, 'upcomingEvents']); // Upcoming events
        Route::get('/check-availability', [HrCalendarController::class, 'checkHrAvailability']); // Check if HR is available
        Route::get('/employees', [HrCalendarController::class, 'getEmployees']); // Get employees for invitations
        Route::get('/{id}', [HrCalendarController::class, 'show']); // View specific event
        Route::put('/{id}', [HrCalendarController::class, 'update']); // Update event
        Route::delete('/{id}', [HrCalendarController::class, 'destroy']); // Delete event
        Route::put('/{id}/cancel', [HrCalendarController::class, 'cancel']); // Cancel event
        Route::put('/{id}/complete', [HrCalendarController::class, 'complete']); // Complete event
    });

    // Holiday Management
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('holidays')->group(function () {
		Route::get('/', [HolidayController::class, 'index']);
		Route::post('/', [HolidayController::class, 'store']);
		Route::put('/{id}', [HolidayController::class, 'update']);
		Route::delete('/{id}', [HolidayController::class, 'destroy']);
    });

     // Public Holidays from Google (read-only, available to all authenticated users)
    Route::get('/holidays/google', [ApiHolidayController::class, 'google']);


    // OT Management Routes
    Route::prefix('ot-requests')->middleware('auth:sanctum')->group(function () {
        // Employee routes
        Route::post('/validate-hours', [OvertimeRequestController::class, 'validateHours']); // Validate OT hours against attendance
        Route::get('/', [OvertimeRequestController::class, 'index']);
        Route::post('/', [OvertimeRequestController::class, 'store']);
        Route::get('/statistics', [OvertimeRequestController::class, 'getStatistics']);
        
        // Admin-only routes (must come before /{id} routes)
        Route::middleware(['role:HR Assistant,HR Staff'])->group(function () {
            Route::get('/all', [OvertimeRequestController::class, 'getAll']);
            Route::put('/{id}/status', [OvertimeRequestController::class, 'updateStatus']);
        });
        
        // Parameterized routes (must come after specific routes)
        Route::get('/{id}', [OvertimeRequestController::class, 'show']);
        Route::put('/{id}', [OvertimeRequestController::class, 'update']);
        Route::delete('/{id}', [OvertimeRequestController::class, 'destroy']);
        
        // Image serving route (accessible to employees, managers, and HR)
        Route::get('/{id}/proof-image/{imageIndex}', [OvertimeRequestController::class, 'getProofImage']);
    });


    
    // Payroll Period Routes (must be BEFORE main payroll routes)
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll-periods')->group(function () {
        Route::get('/', [PayrollPeriodController::class, 'index']);
        Route::post('/', [PayrollPeriodController::class, 'store']);
        Route::get('/{payrollPeriod}', [PayrollPeriodController::class, 'show']);
        Route::put('/{payrollPeriod}', [PayrollPeriodController::class, 'update']);
        Route::delete('/{payrollPeriod}', [PayrollPeriodController::class, 'destroy']);
    });

    // Payroll Management Routes
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll')->group(function () {
        Route::get('/', [PayrollController::class, 'index']);
        Route::post('/generate', [PayrollController::class, 'generate']);
    });

    // Deduction Title Management Routes
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('deduction-titles')->group(function () {
        Route::get('/', [DeductionTitleController::class, 'index']);
        Route::post('/', [DeductionTitleController::class, 'store']);
        Route::get('/{id}', [DeductionTitleController::class, 'show']);
        Route::put('/{id}', [DeductionTitleController::class, 'update']);
        Route::delete('/{id}', [DeductionTitleController::class, 'destroy']);
        
        // Employee assignment routes
        Route::get('/{id}/employees', [DeductionTitleController::class, 'getAssignedEmployees']);
        Route::get('/{id}/available-employees', [DeductionTitleController::class, 'getAvailableEmployees']);
        Route::post('/{id}/assign', [DeductionTitleController::class, 'assignToEmployees']);
        Route::post('/{id}/remove', [DeductionTitleController::class, 'removeFromEmployees']);
        Route::put('/{id}/assignments/{assignmentId}', [DeductionTitleController::class, 'updateAssignment']);
    });

    // Tax Title Management Routes
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('tax-titles')->group(function () {
        Route::get('/', [TaxTitleController::class, 'index']);
        Route::post('/', [TaxTitleController::class, 'store']);
        Route::get('/{id}', [TaxTitleController::class, 'show']);
        Route::put('/{id}', [TaxTitleController::class, 'update']);
        Route::delete('/{id}', [TaxTitleController::class, 'destroy']);
        
        // Employee assignment routes
        Route::get('/{id}/employees', [TaxTitleController::class, 'getAssignedEmployees']);
        Route::get('/{id}/available-employees', [TaxTitleController::class, 'getAvailableEmployees']);
        Route::post('/{id}/assign', [TaxTitleController::class, 'assignToEmployees']);
        Route::post('/{id}/remove', [TaxTitleController::class, 'removeFromEmployees']);
        Route::put('/{id}/assignments/{assignmentId}', [TaxTitleController::class, 'updateAssignment']);
    });

    // Report Generation Routes
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('reports')->group(function () {
        Route::get('/departments', [ReportController::class, 'getDepartments']);
        Route::get('/positions', [ReportController::class, 'getPositions']);
        Route::get('/performance', [ReportController::class, 'getPerformanceReport']);
        Route::get('/performance/download', [ReportController::class, 'downloadPerformanceReportPDF']);
    });

    // Employee Calendar Management
    Route::prefix('employee-calendar')->group(function () {
        Route::get('/', [HrCalendarController::class, 'employeeCalendar']); // Get employee's calendar
        Route::post('/{eventId}/respond', [HrCalendarController::class, 'respondToInvitation']); // Respond to invitation
    });

    // Disciplinary Management Routes
    
    // Manager Routes - Category and Report Management
    Route::middleware(['role:Manager'])->prefix('manager/disciplinary')->group(function () {
        // Disciplinary Categories
        Route::get('/categories', [ManagerDisciplinaryController::class, 'getCategories']);
        Route::post('/categories', [ManagerDisciplinaryController::class, 'createCategory']);
        Route::put('/categories/{id}', [ManagerDisciplinaryController::class, 'updateCategory']);
        Route::delete('/categories/{id}', [ManagerDisciplinaryController::class, 'deleteCategory']);
        
        // Disciplinary Reports
        Route::get('/reports', [ManagerDisciplinaryController::class, 'getReports']);
        Route::post('/reports', [ManagerDisciplinaryController::class, 'createReport']);
        Route::get('/reports/{id}', [ManagerDisciplinaryController::class, 'getReport']);
        Route::put('/reports/{id}', [ManagerDisciplinaryController::class, 'updateReport']);
        
        // Investigation Management
        Route::get('/investigations', [ManagerDisciplinaryController::class, 'getAssignedInvestigations']);
        Route::get('/investigations/{id}', [ManagerDisciplinaryController::class, 'getInvestigation']);
        Route::post('/investigations/{id}/submit', [ManagerDisciplinaryController::class, 'submitInvestigation']);
        
        // Helper endpoints
        Route::get('/employees', [ManagerDisciplinaryController::class, 'getEmployees']);
        Route::post('/check-previous-violations', [ManagerDisciplinaryController::class, 'checkPreviousViolations']);
    });
    
    // Manager Routes - Attendance and OT Management
    Route::middleware(['role:Manager'])->prefix('manager')->group(function () {
        // Attendance Records (View Only)
        Route::get('/attendance/records', [ManagerController::class, 'getAttendanceRecords']);
        
        // OT Request Management
        Route::get('/ot-requests', [ManagerController::class, 'getOTRequests']);
        Route::post('/ot-requests/{id}/approve', [ManagerController::class, 'approveOTRequest']);
        Route::post('/ot-requests/{id}/reject', [ManagerController::class, 'rejectOTRequest']);
    });
    
    // Test route for debugging
    Route::middleware(['auth:sanctum'])->get('/test-auth', function(Request $request) {
        return response()->json([
            'user' => $request->user() ? $request->user()->name : 'No user',
            'role' => $request->user() && $request->user()->role ? $request->user()->role->name : 'No role'
        ]);
    });
    
    // HR Assistant Routes - Two Tab Interface
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('hr/disciplinary')->group(function () {
        
        // TAB 1: DISCIPLINARY ACTION ADMINISTRATION
        // Category CRUD Operations
        Route::get('/categories', [HRDisciplinaryController::class, 'getCategories']);
        Route::post('/categories', [HRDisciplinaryController::class, 'createCategory']);
        Route::get('/categories/{id}', [HRDisciplinaryController::class, 'getCategory']);
        Route::put('/categories/{id}', [HRDisciplinaryController::class, 'updateCategory']);
        Route::delete('/categories/{id}', [HRDisciplinaryController::class, 'deleteCategory']);
        Route::patch('/categories/{id}/toggle-status', [HRDisciplinaryController::class, 'toggleCategoryStatus']);
        
        // TAB 2: REPORTED INFRACTIONS/VIOLATIONS
        // Enhanced Report Management with Filtering
        Route::get('/reports', [HRDisciplinaryController::class, 'getAllReports']);
        Route::get('/reports/{id}', [HRDisciplinaryController::class, 'getReport']);
        Route::post('/reports/{id}/review', [HRDisciplinaryController::class, 'markReportAsReviewed']);
        Route::get('/reports/statistics', [HRDisciplinaryController::class, 'getReportStatistics']);
        
        // DISCIPLINARY ACTIONS MANAGEMENT
        // Issue Actions and Handle Verdicts
        Route::post('/actions', [HRDisciplinaryController::class, 'issueAction']);
        Route::get('/actions', [HRDisciplinaryController::class, 'getAllActions']);
        Route::post('/actions/{id}/verdict', [HRDisciplinaryController::class, 'issueVerdict']);
        Route::get('/actions/{id}/pdf', [HRDisciplinaryController::class, 'downloadActionPdf']);
        
        // HELPER ENDPOINTS
        // Get available investigators/managers
        Route::get('/investigators', [HRDisciplinaryController::class, 'getAvailableInvestigators']);
    });
    
    // Employee Routes - View Actions and Submit Explanations
    Route::middleware(['role:Employee'])->prefix('employee/disciplinary')->group(function () {
        Route::get('/actions', [EmployeeDisciplinaryController::class, 'getMyActions']);
        Route::get('/actions/{id}', [EmployeeDisciplinaryController::class, 'getAction']);
        Route::post('/actions/{id}/explanation', [EmployeeDisciplinaryController::class, 'submitExplanation']);
        Route::get('/actions/{id}/pdf', [EmployeeDisciplinaryController::class, 'downloadPdf']);
        Route::get('/dashboard/stats', [EmployeeDisciplinaryController::class, 'getDashboardStats']);
    });

    // Attendance Management Routes (HR Only)
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('attendance')->group(function () {
        Route::get('/dashboard', [AttendanceController::class, 'dashboard']); // Dashboard data
        Route::get('/export', [AttendanceController::class, 'export']); // Export CSV report
        Route::get('/', [AttendanceController::class, 'index']); // List attendance with filters
        Route::post('/', [AttendanceController::class, 'store']); // Create attendance record
        Route::put('/{id}', [AttendanceController::class, 'update']); // Update attendance record
        Route::delete('/{id}', [AttendanceController::class, 'destroy']); // Delete attendance record
        
        // Import routes
        Route::post('/import/validate', [AttendanceController::class, 'validateImport']); // Validate file and detect period
        Route::post('/import', [AttendanceController::class, 'import']); // Import from Excel
        Route::get('/import/template', [AttendanceController::class, 'getImportTemplate']); // Get template info
        Route::get('/import/history', [AttendanceController::class, 'importHistory']); // Import history
        Route::get('/import/{id}', [AttendanceController::class, 'importDetails']); // Import details
        Route::delete('/import/{id}', [AttendanceController::class, 'deleteImport']); // Delete import record
        
        // Edit request management routes
        Route::get('/edit-requests', [AttendanceController::class, 'getEditRequests']); // Get all edit requests
        Route::post('/edit-requests/{id}/approve', [AttendanceController::class, 'approveEditRequest']); // Approve request
        Route::post('/edit-requests/{id}/reject', [AttendanceController::class, 'rejectEditRequest']); // Reject request
    });

    // Employee Attendance Routes (All authenticated users)
    Route::prefix('attendance')->group(function () {
        Route::get('/my-records', [AttendanceController::class, 'myRecords']); // Get own attendance records
        Route::post('/request-edit', [AttendanceController::class, 'requestEdit']); // Submit edit request
        Route::get('/my-edit-requests', [AttendanceController::class, 'myEditRequests']); // Get own edit requests
    });

    // Admin Routes
Route::middleware(['auth:sanctum', 'role:Admin'])->group(function () {
    // User Management
    Route::apiResource('users', UserController::class);
    Route::put('/users/{id}/reset-password', [UserController::class, 'resetPassword']);
    
    // Role Management
    Route::apiResource('roles', RoleController::class);
    
    // Department Management
    Route::apiResource('departments', DepartmentController::class);
    
    // Position Management
    Route::apiResource('positions', PositionController::class);
    
    // Security Settings
    Route::get('/security-settings', [SecuritySettingsController::class, 'index']);
    Route::put('/security-settings', [SecuritySettingsController::class, 'update']);
    
    // Audit Logs
    Route::get('/audit-logs', [AuditLogController::class, 'index']);

    // Security Alerts feature removed (routes disabled)
    
    // Employee Profiles (Admin access)
    Route::get('/employee-profiles', [EmployeeController::class, 'index']);
    Route::post('/employee-profiles', [EmployeeController::class, 'store']);
    Route::get('/employee-profiles/{id}', [EmployeeController::class, 'show']);
    Route::put('/employee-profiles/{id}', [EmployeeController::class, 'update']);
    Route::delete('/employee-profiles/{id}', [EmployeeController::class, 'destroy']);
});

});