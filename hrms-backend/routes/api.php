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
use App\Http\Controllers\Api\holidayController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PayrollPeriodController;
use App\Http\Controllers\Api\TaxTitleController;
use App\Http\Controllers\Api\DeductionTitleController;
use App\Http\Controllers\Api\BenefitController;
use App\Http\Controllers\Api\EmployeeTaxAssignmentController;
use App\Http\Controllers\Api\EmployeeDeductionAssignmentController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\EmployeeLeaveLimitController;
use App\Http\Controllers\Api\OvertimeRequestController;
use App\Http\Controllers\InterviewController;


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
    Route::delete('/employees/{id}', [EmployeeController::class, 'destroy']);
});


Route::get('/employees', [EmployeeController::class, 'index']);
Route::get('/employees/missing-profiles', [EmployeeController::class, 'missingProfiles']);
Route::post('/employees/fix-missing-profiles', [EmployeeController::class, 'fixMissingProfiles']);
Route::post('/employees', [EmployeeController::class, 'store']);

Route::post('/login', [AuthController::class, 'login'])->name('login');
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
    Route::post('/applications/{id}/accept-offer', [ApplicationController::class, 'acceptOffer']);
    Route::post('/applications/{id}/decline-offer', [ApplicationController::class, 'declineOffer']);
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


Route::middleware('auth:sanctum')->group(function () {
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']); // employee
    Route::get('/leave-requests', [LeaveRequestController::class, 'index']); // hr assistant
    Route::get('/leave-requests/stats', [LeaveRequestController::class, 'getStats']); // hr stats
    Route::get('/leave-requests/{id}', [LeaveRequestController::class, 'show']); // view specific leave
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

    // OT Management Routes
    Route::prefix('ot-requests')->middleware('auth:sanctum')->group(function () {
        // Employee routes
        Route::get('/', [OvertimeRequestController::class, 'index']);
        Route::post('/', [OvertimeRequestController::class, 'store']);
        Route::get('/{id}', [OvertimeRequestController::class, 'show']);
        Route::put('/{id}', [OvertimeRequestController::class, 'update']);
        Route::delete('/{id}', [OvertimeRequestController::class, 'destroy']);
        Route::get('/statistics', [OvertimeRequestController::class, 'getStatistics']);
        
        // Admin-only routes
        Route::middleware(['role:HR Assistant,HR Staff'])->group(function () {
            Route::get('/all', [OvertimeRequestController::class, 'getAll']);
            Route::put('/{id}/status', [OvertimeRequestController::class, 'updateStatus']);
        });
    });

    // Enhanced Payroll Management Routes
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll')->group(function () {
        // Main payroll routes
        Route::get('/', [PayrollController::class, 'index']);
        Route::post('/', [PayrollController::class, 'store']);
        Route::get('/{payroll}', [PayrollController::class, 'show']);
        Route::put('/{payroll}', [PayrollController::class, 'update']);
        Route::delete('/{payroll}', [PayrollController::class, 'destroy']);
        Route::post('/generate', [PayrollController::class, 'generate']);
        Route::get('/attendance-summary', [PayrollController::class, 'attendanceSummary']);
        Route::get('/export', [PayrollController::class, 'export']);
        Route::get('/reports/generate', [PayrollController::class, 'generateReport']);
        Route::post('/{payroll}/process', [PayrollController::class, 'process']);
        
        // Employee payslip routes
        Route::get('/employee/{employeeId}/payslip/{periodId}', [PayrollController::class, 'getEmployeePayslip']);
        Route::get('/employee/{employeeId}/payslip/{periodId}/export', [PayrollController::class, 'exportEmployeePayslip']);
    });

    // Payroll Periods Management
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll/periods')->group(function () {
        Route::get('/', [PayrollPeriodController::class, 'index']);
        Route::post('/', [PayrollPeriodController::class, 'store']);
        Route::get('/active', [PayrollPeriodController::class, 'active']);
        Route::get('/current', [PayrollPeriodController::class, 'current']);
        Route::get('/{payrollPeriod}', [PayrollPeriodController::class, 'show']);
        Route::put('/{payrollPeriod}', [PayrollPeriodController::class, 'update']);
        Route::delete('/{payrollPeriod}', [PayrollPeriodController::class, 'destroy']);
    });

    // Tax Titles Management
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll/tax-titles')->group(function () {
        Route::get('/', [TaxTitleController::class, 'index']);
        Route::post('/', [TaxTitleController::class, 'store']);
        Route::get('/active', [TaxTitleController::class, 'active']);
        Route::get('/{taxTitle}', [TaxTitleController::class, 'show']);
        Route::put('/{taxTitle}', [TaxTitleController::class, 'update']);
        Route::delete('/{taxTitle}', [TaxTitleController::class, 'destroy']);
        Route::post('/{taxTitle}/toggle', [TaxTitleController::class, 'toggle']);
    });

    // Deduction Titles Management
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll/deduction-titles')->group(function () {
        Route::get('/', [DeductionTitleController::class, 'index']);
        Route::post('/', [DeductionTitleController::class, 'store']);
        Route::get('/active', [DeductionTitleController::class, 'active']);
        Route::get('/{deductionTitle}', [DeductionTitleController::class, 'show']);
        Route::put('/{deductionTitle}', [DeductionTitleController::class, 'update']);
        Route::delete('/{deductionTitle}', [DeductionTitleController::class, 'destroy']);
        Route::post('/{deductionTitle}/toggle', [DeductionTitleController::class, 'toggle']);
    });

    // Benefits Management
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll/benefits')->group(function () {
        Route::get('/', [BenefitController::class, 'index']);
        Route::post('/', [BenefitController::class, 'store']);
        Route::get('/active', [BenefitController::class, 'active']);
        Route::get('/{benefit}', [BenefitController::class, 'show']);
        Route::put('/{benefit}', [BenefitController::class, 'update']);
        Route::delete('/{benefit}', [BenefitController::class, 'destroy']);
        Route::post('/{benefit}/toggle', [BenefitController::class, 'toggle']);
    });

    // Employee Tax Assignments
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll/employee-tax-assignments')->group(function () {
        Route::get('/', [EmployeeTaxAssignmentController::class, 'index']);
        Route::post('/', [EmployeeTaxAssignmentController::class, 'store']);
        Route::get('/{employeeTaxAssignment}', [EmployeeTaxAssignmentController::class, 'show']);
        Route::put('/{employeeTaxAssignment}', [EmployeeTaxAssignmentController::class, 'update']);
        Route::delete('/{employeeTaxAssignment}', [EmployeeTaxAssignmentController::class, 'destroy']);
        Route::post('/{employeeTaxAssignment}/toggle', [EmployeeTaxAssignmentController::class, 'toggle']);
        Route::get('/employee/{employee}', [EmployeeTaxAssignmentController::class, 'getEmployeeTaxes']);
        Route::get('/tax/{taxTitle}', [EmployeeTaxAssignmentController::class, 'getTaxEmployees']);
    });

    // Employee Deduction Assignments
    Route::middleware(['role:HR Assistant,HR Staff'])->prefix('payroll/employee-deduction-assignments')->group(function () {
        Route::get('/', [EmployeeDeductionAssignmentController::class, 'index']);
        Route::post('/', [EmployeeDeductionAssignmentController::class, 'store']);
        Route::get('/{employeeDeductionAssignment}', [EmployeeDeductionAssignmentController::class, 'show']);
        Route::put('/{employeeDeductionAssignment}', [EmployeeDeductionAssignmentController::class, 'update']);
        Route::delete('/{employeeDeductionAssignment}', [EmployeeDeductionAssignmentController::class, 'destroy']);
        Route::post('/{employeeDeductionAssignment}/toggle', [EmployeeDeductionAssignmentController::class, 'toggle']);
        Route::get('/employee/{employee}', [EmployeeDeductionAssignmentController::class, 'getEmployeeDeductions']);
        Route::get('/deduction/{deductionTitle}', [EmployeeDeductionAssignmentController::class, 'getDeductionEmployees']);
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

    // Attendance Management Routes
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
    });
});