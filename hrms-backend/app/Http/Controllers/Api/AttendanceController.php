<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceEditRequest;
use App\Models\EmployeeProfile;
use App\Models\AttendanceImport;
use App\Services\AttendanceImportService;
use App\Models\User;
use DateTime;
use DatePeriod;
use DateInterval;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Carbon\Carbon;
use Exception;

class AttendanceController extends Controller
{
    protected $importService;

    public function __construct(AttendanceImportService $importService)
    {
        $this->importService = $importService;
    }

    /**
     * Get attendance dashboard data
     */
    public function dashboard(Request $request): JsonResponse
    {
        try {
            $dateFrom = $request->get('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $dateTo = $request->get('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));
            $search = $request->get('search');
            $status = $request->get('status');
            $hasImports = AttendanceImport::query()->exists();

            // Employee-centric view to include employees with no records in the range (only active employees)
            // Get Applicant role ID dynamically to avoid hardcoding
            $applicantRoleId = \App\Models\Role::where('name', 'Applicant')->value('id');
            
            $employeesQuery = EmployeeProfile::query()
                ->select('employee_profiles.id', 'employee_profiles.employee_id', 'employee_profiles.first_name', 'employee_profiles.last_name', 'employee_profiles.position', 'employee_profiles.department')
                ->join('users', 'users.id', '=', 'employee_profiles.user_id')
                ->where('users.role_id', '!=', $applicantRoleId) // Exclude Applicants
                ->where(function($q) {
                    $q->whereNull('employee_profiles.status')
                      ->orWhere('employee_profiles.status', 'active');
                });

            if ($search) {
                $employeesQuery->where(function($q) use ($search) {
                    $q->where('employee_profiles.first_name', 'LIKE', "%{$search}%")
                      ->orWhere('employee_profiles.last_name', 'LIKE', "%{$search}%")
                      ->orWhere('employee_profiles.position', 'LIKE', "%{$search}%")
                      ->orWhere('employee_profiles.department', 'LIKE', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 50);
            $employeesPage = $employeesQuery
                ->orderBy('employee_profiles.last_name')
                ->orderBy('employee_profiles.first_name')
                ->paginate($perPage);

            $employeeIds = collect($employeesPage->items())->pluck('id')->all();

            // Find latest attendance per employee within range
            $attendanceQuery = Attendance::whereBetween('date', [$dateFrom, $dateTo])
                ->whereDate('date', '>=', '2000-01-01')
                ->whereIn('employee_id', $employeeIds);

            if ($status && $status !== 'all') {
                $attendanceQuery->where('status', $status);
            }

            $attendances = $attendanceQuery
                ->orderBy('date', 'desc')
                ->orderBy('clock_in', 'desc')
                ->get();

            $latestByEmployee = [];
            foreach ($attendances as $row) {
                if (!isset($latestByEmployee[$row->employee_id])) {
                    $latestByEmployee[$row->employee_id] = $row;
                }
            }

            // Map to response items, filling gaps with "No record"
            $recentAttendanceItems = [];
            if ($hasImports) {
                foreach ($employeesPage->items() as $emp) {
                    $latest = $latestByEmployee[$emp->id] ?? null;
                    if (!$latest) { continue; }
                    $recentAttendanceItems[] = [
                        'employee' => [
                            'id' => $emp->id,
                            'employee_id' => $emp->employee_id,
                            'first_name' => $emp->first_name,
                            'last_name' => $emp->last_name,
                            'position' => $emp->position,
                            'department' => $emp->department,
                        ],
                        'date' => $latest->date?->toDateString(),
                        'clock_in' => $latest->clock_in?->format('H:i:s'),
                        'clock_out' => $latest->clock_out?->format('H:i:s'),
                        'total_hours' => (float) ($latest->total_hours ?? 0),
                        'status' => $latest->status,
                        'remarks' => $latest->remarks ?? null,
                    ];
                }
            }

            // If there are imports but no records in the selected range, auto-adjust to latest import period
            $autoAdjusted = false;
            if ($hasImports && empty($recentAttendanceItems)) {
                $latestImport = AttendanceImport::orderBy('created_at', 'desc')->first();
                if ($latestImport) {
                    $autoAdjusted = true;
                    $dateFrom = $latestImport->period_start;
                    $dateTo = $latestImport->period_end;

                    $attendanceQuery = Attendance::whereBetween('date', [$dateFrom, $dateTo])
                        ->whereDate('date', '>=', '2000-01-01')
                        ->whereIn('employee_id', $employeeIds);
                    if ($status && $status !== 'all') {
                        $attendanceQuery->where('status', $status);
                    }
                    $attendances = $attendanceQuery
                        ->orderBy('date', 'desc')
                        ->orderBy('clock_in', 'desc')
                        ->get();
                    $latestByEmployee = [];
                    foreach ($attendances as $row) {
                        if (!isset($latestByEmployee[$row->employee_id])) {
                            $latestByEmployee[$row->employee_id] = $row;
                        }
                    }
                    $recentAttendanceItems = [];
                    foreach ($employeesPage->items() as $emp) {
                        $latest = $latestByEmployee[$emp->id] ?? null;
                        if (!$latest) { continue; }
                        $recentAttendanceItems[] = [
                            'employee' => [
                                'id' => $emp->id,
                                'employee_id' => $emp->employee_id,
                                'first_name' => $emp->first_name,
                                'last_name' => $emp->last_name,
                                'position' => $emp->position,
                                'department' => $emp->department,
                            ],
                            'date' => $latest->date?->toDateString(),
                            'clock_in' => $latest->clock_in?->format('H:i:s'),
                            'clock_out' => $latest->clock_out?->format('H:i:s'),
                            'total_hours' => (float) ($latest->total_hours ?? 0),
                            'status' => $latest->status,
                            'remarks' => $latest->remarks ?? null,
                        ];
                    }
                }
            }

            // Attendance summary statistics - count only active employees (not terminated or resigned)
            // Get all active employees (excluding applicants, terminated, and resigned)
            // Get Applicant role ID dynamically to avoid hardcoding
            $applicantRoleId = \App\Models\Role::where('name', 'Applicant')->value('id');
            
            $activeEmployees = User::where('role_id', '!=', $applicantRoleId)
                ->whereHas('employeeProfile', function($query) {
                    $query->where(function($q) {
                        $q->whereNull('employee_profiles.status')
                          ->orWhere('employee_profiles.status', 'active');
                    });
                })
                ->with('employeeProfile')
                ->get();

            $totalEmployees = $activeEmployees->count();
            $totalWorkDays = 0;
            $presentCount = 0;
            $absentCount = 0;
            $lateCount = 0;
            $onLeaveCount = 0;
            $holidayNoWorkCount = 0;
            $undertimeCount = 0;
            $overtimeCount = 0;

            // Get attendance records for all employees in the date range
            $attendanceRecords = Attendance::whereBetween('date', [$dateFrom, $dateTo])
                ->whereDate('date', '>=', '2000-01-01')
                ->get();

            // Group attendance by employee and date
            $attendanceByEmployeeAndDate = [];
            foreach ($attendanceRecords as $record) {
                $attendanceByEmployeeAndDate[$record->employee_id][$record->date->format('Y-m-d')] = $record;
            }

            // Loop through each day in the date range
            $currentDate = new DateTime($dateFrom);
            $endDate = new DateTime($dateTo);
            $dateRange = new DatePeriod($currentDate, new DateInterval('P1D'), $endDate->modify('+1 day'));

            $dates = [];
            foreach ($dateRange as $date) {
                $dates[] = $date->format('Y-m-d');
            }

            // For recent attendance items, take the latest record for each employee
            $recentAttendanceItems = [];
            foreach ($activeEmployees as $employee) {
                $latestRecord = null;
                $employeeId = $employee->id;
                
                // Find the latest attendance record for this employee in the date range
                if (isset($attendanceByEmployeeAndDate[$employeeId])) {
                    $employeeRecords = $attendanceByEmployeeAndDate[$employeeId];
                    krsort($employeeRecords); // Sort by date descending
                    $latestRecord = reset($employeeRecords);
                }

                if ($latestRecord) {
                    $recentAttendanceItems[] = [
                        'employee' => [
                            'id' => $employeeId,
                            'employee_id' => $employee->employee_id,
                            'first_name' => $employee->first_name,
                            'last_name' => $employee->last_name,
                            'position' => $employee->position,
                            'department' => $employee->department,
                        ],
                        'date' => $latestRecord->date?->toDateString(),
                        'clock_in' => $latestRecord->clock_in?->format('H:i:s'),
                        'clock_out' => $latestRecord->clock_out?->format('H:i:s'),
                        'total_hours' => (float) ($latestRecord->total_hours ?? 0),
                        'status' => $latestRecord->status,
                        'remarks' => $latestRecord->remarks ?? null,
                    ];
                }
            }

            // Sort recent attendance by date descending and take first 10
            usort($recentAttendanceItems, function($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });
            $recentAttendanceItems = array_slice($recentAttendanceItems, 0, 10);

            // Count attendance statuses - only count actual records, don't assume absences
            foreach ($attendanceRecords as $record) {
                switch ($record->status) {
                    case 'Present':
                        $presentCount++;
                        break;
                    case 'Late':
                        $lateCount++;
                        $presentCount++; // Late is also considered present
                        break;
                    case 'Undertime':
                        $undertimeCount++;
                        $presentCount++; // Undertime is also considered present
                        break;
                    case 'Overtime':
                        $overtimeCount++;
                        $presentCount++; // Overtime is also considered present
                        break;
                    case 'On Leave':
                        $onLeaveCount++;
                        break;
                    case 'Holiday (No Work)':
                        $holidayNoWorkCount++;
                        break;
                    case 'Holiday (Worked)':
                        $presentCount++;
                        break;
                    case 'Absent':
                        $absentCount++;
                        break;
                }
            }


            $totalRecords = $presentCount + $absentCount + $onLeaveCount + $holidayNoWorkCount;

            // Get daily attendance summary for chart (without search/status filters)
            $dailySummary = Attendance::selectRaw('date, status, COUNT(*) as count')
                ->whereBetween('date', [$dateFrom, $dateTo])
                ->whereDate('date', '>=', '2000-01-01')
                ->groupBy('date', 'status')
                ->orderBy('date')
                ->get()
                ->groupBy('date');

            return response()->json([
                'success' => true,
                'data' => [
                    'statistics' => [
                        'total_employees' => $totalEmployees,
                        'total_work_days' => $totalWorkDays,
                        'total_records' => $totalRecords,
                        'present_count' => $presentCount,
                        'absent_count' => $absentCount,
                        'late_count' => $lateCount,
                        'on_leave_count' => $onLeaveCount,
                        'undertime_count' => $undertimeCount,
                        'overtime_count' => $overtimeCount,
                        'holiday_no_work_count' => $holidayNoWorkCount,
                        'attendance_rate' => $totalRecords > 0 ? round(($presentCount / $totalRecords) * 100, 1) : 0,
                        'overtime' => $overtimeCount,
                        'undertime' => $undertimeCount,
                        'on_leave' => $onLeaveCount
                    ],
                    'recent_attendance' => $recentAttendanceItems,
                    'pagination' => [
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => count($recentAttendanceItems),
                        'total' => count($recentAttendanceItems)
                    ],
                    'daily_summary' => $dailySummary,
                    'date_range' => [
                        'from' => $dateFrom,
                        'to' => $dateTo
                    ],
                    'filters' => [
                        'search' => $search,
                        'status' => $status
                    ],
                    'has_imports' => $hasImports,
                    'auto_adjusted_to_latest_import' => $autoAdjusted
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load dashboard data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export attendance report as CSV
     */
    public function export(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'status' => 'nullable|in:Present,Absent,Late,On Leave,Holiday (No Work),Holiday (Worked),Overtime,Undertime'
        ]);

        $fileName = 'attendance_report_' . ($validated['date_from'] ?? 'from') . '_to_' . ($validated['date_to'] ?? 'to') . '.csv';

        $callback = function() use ($validated) {
            $handle = fopen('php://output', 'w');

            // CSV Headers
            fputcsv($handle, [
                'Employee ID', 'Employee Name', 'Department', 'Position', 'Date',
                'Clock In', 'Clock Out', 'Break Out', 'Break In',
                'Total Hours', 'Overtime Hours', 'Undertime Hours', 'Status', 'Remarks'
            ]);

            $query = Attendance::with(['employee' => function($q) {
                $q->select('id', 'employee_id', 'first_name', 'last_name', 'position', 'department');
            }])
            ->whereBetween('date', [$validated['date_from'], $validated['date_to']])
            ->orderBy('date')
            ->orderBy('employee_id');

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            $query->chunk(1000, function($rows) use ($handle) {
                foreach ($rows as $row) {
                    $employee = $row->employee;
                    $employeeName = trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''));

                    fputcsv($handle, [
                        $employee->employee_id ?? $employee->id ?? '',
                        $employeeName,
                        $employee->department ?? '',
                        $employee->position ?? '',
                        $row->date?->toDateString(),
                        $row->clock_in ? $row->clock_in->format('H:i:s') : '',
                        $row->clock_out ? $row->clock_out->format('H:i:s') : '',
                        $row->break_out ? $row->break_out->format('H:i:s') : '',
                        $row->break_in ? $row->break_in->format('H:i:s') : '',
                        number_format((float) $row->total_hours, 2, '.', ''),
                        number_format((float) $row->overtime_hours, 2, '.', ''),
                        number_format((float) $row->undertime_hours, 2, '.', ''),
                        $row->status,
                        $row->remarks ?? ''
                    ]);
                }
            });

            fclose($handle);
        };

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
        ];

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Get attendance records with filtering and pagination
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Attendance::with(['employee' => function($q) {
                $q->select('id', 'employee_id', 'first_name', 'last_name', 'position', 'department');
            }]);

            // Apply filters
            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('date', [$request->date_from, $request->date_to]);
            }

            // Filter out invalid dates (before 2000-01-01)
            $query->whereDate('date', '>=', '2000-01-01');

            if ($request->has('employee_id')) {
                $query->where('employee_id', $request->employee_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->whereHas('employee', function($q) use ($search) {
                    $q->where('first_name', 'LIKE', "%{$search}%")
                      ->orWhere('last_name', 'LIKE', "%{$search}%");
                });
            }

            // Apply sorting
            $sortBy = $request->get('sort_by', 'date');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Paginate results
            $perPage = $request->get('per_page', 50);
            $attendance = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $attendance
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate import file and detect period
     */
    public function validateImport(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid file. Please upload a valid Excel or CSV file.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Store uploaded file temporarily
            $file = $request->file('file');
            $filename = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('temp/attendance', $filename, 'local');
            $fullPath = Storage::disk('local')->path($filePath);

            // Detect period from file
            $periodInfo = $this->importService->detectPeriodFromFile($fullPath);
            
            if (!$periodInfo) {
                Storage::disk('local')->delete($filePath);
                return response()->json([
                    'success' => false,
                    'message' => 'Could not detect date range from file. Please ensure the file has a Punch Date column with valid dates.'
                ], 400);
            }

            // Check for overlapping imports
            $hasOverlap = $this->importService->checkOverlappingImport(
                $periodInfo['period_start'],
                $periodInfo['period_end']
            );

            // Clean up temporary file
            Storage::disk('local')->delete($filePath);

            return response()->json([
                'success' => true,
                'data' => [
                    'period_start' => $periodInfo['period_start'],
                    'period_end' => $periodInfo['period_end'],
                    'total_dates' => $periodInfo['total_dates'],
                    'has_overlap' => $hasOverlap,
                    'warning' => $hasOverlap ? 'An import already exists for this period. Proceeding will update existing records.' : null
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import attendance from Excel file
     */
    public function import(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
                'period_start' => 'required|date',
                'period_end' => 'required|date|after_or_equal:period_start',
                'import_type' => 'nullable|in:weekly,monthly,custom'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid file. Please upload a valid Excel or CSV file.',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Store uploaded file temporarily
            $file = $request->file('file');
            $filename = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('temp/attendance', $filename, 'local');
            $fullPath = Storage::disk('local')->path($filePath);

            // Check if file exists before importing
            if (!file_exists($fullPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Uploaded file not found on server. Please check storage permissions.',
                    'error' => 'File not found: ' . $fullPath
                ], 500);
            }

            // Calculate the number of days between start and end dates
            $startDate = new \DateTime($request->period_start);
            $endDate = new \DateTime($request->period_end);
            $interval = $startDate->diff($endDate);
            $dayDiff = $interval->days + 1; // +1 to include both start and end dates
            
            // If the date range is more than 14 days, consider it a monthly import
            $importType = $dayDiff > 14 ? 'monthly' : 'weekly';
            
            // Import data using the service with options
            $results = $this->importService->importFromExcel($fullPath, [
                'period_start' => $request->period_start,
                'period_end' => $request->period_end,
                'import_type' => $importType, // Use the calculated import type
                'filename' => $file->getClientOriginalName(),
                'user_id' => Auth::id()
            ]);

            // Clean up temporary file after import
            Storage::disk('local')->delete($filePath);

            // Get import record
            $importRecord = $this->importService->getImportRecord();

            // If import service returns errors, show them
            if (isset($results['errors']) && count($results['errors']) > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Import failed. Some rows could not be imported.',
                    'errors' => array_slice($results['errors'], 0, 10),
                    'data' => $results,
                    'import_id' => $importRecord ? $importRecord->id : null
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Import completed successfully',
                'data' => [
                    'summary' => $results,
                    'imported' => $results['success'],
                    'failed' => $results['failed'],
                    'skipped' => $results['skipped'],
                    'absent_marked' => $results['absent_marked'] ?? 0,
                    'errors' => array_slice($results['errors'], 0, 10),
                    'import_id' => $importRecord ? $importRecord->id : null,
                    'import_record' => $importRecord
                ]
            ]);

        } catch (Exception $e) {
            // Surface the underlying error message to help users fix their file
            return response()->json([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
                'error' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Get import template headers
     */
    public function getImportTemplate(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'headers' => AttendanceImportService::getExpectedHeaders(),
                'instructions' => [
                    'Use the Biometric ID as the primary identifier for employees',
                    'Date format should be YYYY-MM-DD (e.g., 2024-01-15)',
                    'Time format should be HH:MM or HH:MM:SS (e.g., 08:30 or 17:30:00)',
                    'Break times are optional but helpful for accurate calculations',
                    'Status will be automatically calculated based on clock in time'
                ]
            ]
        ]);
    }

    /**
     * Create new attendance record
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'employee_id' => 'required|exists:employee_profiles,id',
                'date' => 'required|date',
                'clock_in' => 'nullable|date_format:H:i:s',
                'clock_out' => 'nullable|date_format:H:i:s',
                'break_out' => 'nullable|date_format:H:i:s',
                'break_in' => 'nullable|date_format:H:i:s',
                'status' => 'required|in:Present,Absent,Late,On Leave,Holiday (No Work),Holiday (Worked),Overtime,Undertime',
                'remarks' => 'nullable|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if attendance already exists for this employee and date
            $existingAttendance = Attendance::where('employee_id', $request->employee_id)
                ->where('date', $request->date)
                ->first();

            if ($existingAttendance) {
                return response()->json([
                    'success' => false,
                    'message' => 'Attendance record already exists for this employee on this date'
                ], 409);
            }

            $attendance = new Attendance();
            $attendance->fill($request->all());
            
            // Calculate total hours if times are provided
            if ($attendance->clock_in && $attendance->clock_out) {
                $attendance->total_hours = $attendance->calculateTotalHours();
                $attendance->overtime_hours = $attendance->calculateOvertimeHours();
                $attendance->undertime_hours = $attendance->calculateUndertimeHours();
                
                // Auto-determine status based on total hours if not manually set
                if (!$request->has('status') || empty($request->status)) {
                    $attendance->status = $attendance->determineStatus();
                }
            }

            $attendance->save();

            return response()->json([
                'success' => true,
                'message' => 'Attendance record created successfully',
                'data' => $attendance->load('employee')
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update attendance record
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $attendance = Attendance::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'clock_in' => 'nullable|date_format:H:i:s',
                'clock_out' => 'nullable|date_format:H:i:s',
                'break_out' => 'nullable|date_format:H:i:s',
                'break_in' => 'nullable|date_format:H:i:s',
                'status' => 'sometimes|in:Present,Absent,Late,On Leave,Holiday (No Work),Holiday (Worked),Overtime,Undertime',
                'remarks' => 'nullable|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $attendance->fill($request->all());
            
            // Recalculate hours if times changed
            if ($attendance->clock_in && $attendance->clock_out) {
                $attendance->total_hours = $attendance->calculateTotalHours();
                $attendance->overtime_hours = $attendance->calculateOvertimeHours();
                $attendance->undertime_hours = $attendance->calculateUndertimeHours();
                
                // Auto-determine status based on total hours if not manually set
                if (!$request->has('status') || empty($request->status)) {
                    $attendance->status = $attendance->determineStatus();
                }
            }

            $attendance->save();

            return response()->json([
                'success' => true,
                'message' => 'Attendance record updated successfully',
                'data' => $attendance->load('employee')
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete attendance record
     */
    public function destroy($id): JsonResponse
    {
        try {
            $attendance = Attendance::findOrFail($id);
            $attendance->delete();

            return response()->json([
                'success' => true,
                'message' => 'Attendance record deleted successfully'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete attendance record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get import history
     */
    public function importHistory(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 20);
            $status = $request->get('status');

            $query = AttendanceImport::with('importer:id,first_name,last_name,email')
                ->orderBy('created_at', 'desc');

            if ($status) {
                $query->where('status', $status);
            }

            $imports = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $imports->items(), // Return items array directly
                'pagination' => [
                    'current_page' => $imports->currentPage(),
                    'last_page' => $imports->lastPage(),
                    'per_page' => $imports->perPage(),
                    'total' => $imports->total()
                ]
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch import history',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single import details
     */
    public function importDetails($id): JsonResponse
    {
        try {
            $import = AttendanceImport::with('importer:id,first_name,last_name,email')
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $import
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Import record not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Delete import record
     */
    public function deleteImport($id): JsonResponse
    {
        try {
            $import = AttendanceImport::findOrFail($id);
            $import->delete();

            return response()->json([
                'success' => true,
                'message' => 'Import record deleted successfully'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete import record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employee's own attendance records
     */
    public function myRecords(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();

            if (!$employeeProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found'
                ], 404);
            }

            $query = Attendance::where('employee_id', $employeeProfile->id);

            // Apply date filters
            if ($request->has('date_from') && $request->has('date_to')) {
                $query->whereBetween('date', [$request->date_from, $request->date_to]);
            }

            // Filter out invalid dates
            $query->whereDate('date', '>=', '2000-01-01');

            $records = $query->orderBy('date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $records
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit attendance edit request
     */
    public function requestEdit(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'date' => 'required|date|before_or_equal:today',
                'requested_time_in' => 'nullable|date_format:H:i',
                'requested_time_out' => 'nullable|date_format:H:i',
                'reason' => 'required|string|max:500',
                'images' => 'required|array|min:1|max:2',
                'images.*' => 'required|image|mimes:jpeg,jpg,png,gif|max:5120' // 5MB max per image
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = Auth::user();
            $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();

            if (!$employeeProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found'
                ], 404);
            }

            // Check if there's already a pending request for this date
            $existingRequest = AttendanceEditRequest::where('employee_id', $employeeProfile->id)
                ->where('date', $request->date)
                ->where('status', 'pending')
                ->first();

            if ($existingRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a pending edit request for this date'
                ], 409);
            }

            // Upload images
            $imagePaths = [];
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $index => $image) {
                    $path = $image->store('attendance_edit_proofs', 'public');
                    $imagePaths[] = $path;
                }
            }

            // Get current attendance record if exists
            $currentRecord = Attendance::where('employee_id', $employeeProfile->id)
                ->where('date', $request->date)
                ->first();

            // Create edit request
            $editRequest = AttendanceEditRequest::create([
                'employee_id' => $employeeProfile->id,
                'requested_by_user_id' => $user->id,
                'date' => $request->date,
                'current_time_in' => $currentRecord?->clock_in,
                'current_time_out' => $currentRecord?->clock_out,
                'requested_time_in' => $request->requested_time_in ? $request->requested_time_in . ':00' : null,
                'requested_time_out' => $request->requested_time_out ? $request->requested_time_out . ':00' : null,
                'reason' => $request->reason,
                'proof_images' => $imagePaths,
                'status' => 'pending'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Edit request submitted successfully',
                'data' => $editRequest
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit edit request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance edit requests (HR only)
     */
    public function getEditRequests(Request $request): JsonResponse
    {
        try {
            $query = AttendanceEditRequest::with([
                'employee:id,employee_id,first_name,last_name,position',
                'requestedBy:id,first_name,last_name',
                'reviewedBy:id,first_name,last_name'
            ]);

            // Filter by status
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $requests = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $requests
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch edit requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve attendance edit request
     */
    public function approveEditRequest($id): JsonResponse
    {
        try {
            $editRequest = AttendanceEditRequest::findOrFail($id);

            if ($editRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This request has already been processed'
                ], 400);
            }

            // Find or create attendance record
            $attendance = Attendance::where('employee_id', $editRequest->employee_id)
                ->where('date', $editRequest->date)
                ->first();

            if (!$attendance) {
                // Create new attendance record
                $attendance = new Attendance();
                $attendance->employee_id = $editRequest->employee_id;
                $attendance->date = $editRequest->date;
            }

            // Update with requested times
            if ($editRequest->requested_time_in) {
                $attendance->clock_in = $editRequest->requested_time_in;
            }
            if ($editRequest->requested_time_out) {
                $attendance->clock_out = $editRequest->requested_time_out;
            }

            // Recalculate hours and status
            if ($attendance->clock_in && $attendance->clock_out) {
                $attendance->total_hours = $attendance->calculateTotalHours();
                $attendance->overtime_hours = $attendance->calculateOvertimeHours();
                $attendance->undertime_hours = $attendance->calculateUndertimeHours();
                $attendance->status = $attendance->determineStatus();
            }

            $attendance->remarks = 'Updated via edit request';
            $attendance->save();

            // Update edit request status
            $editRequest->status = 'approved';
            $editRequest->reviewed_by_user_id = Auth::id();
            $editRequest->reviewed_at = now();
            $editRequest->save();

            return response()->json([
                'success' => true,
                'message' => 'Edit request approved and attendance record updated',
                'data' => $editRequest
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to approve request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reject attendance edit request
     */
    public function rejectEditRequest(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rejection reason is required',
                    'errors' => $validator->errors()
                ], 422);
            }

            $editRequest = AttendanceEditRequest::findOrFail($id);

            if ($editRequest->status !== 'pending') {
                return response()->json([
                    'success' => false,
                    'message' => 'This request has already been processed'
                ], 400);
            }

            // Update edit request status
            $editRequest->status = 'rejected';
            $editRequest->rejection_reason = $request->rejection_reason;
            $editRequest->reviewed_by_user_id = Auth::id();
            $editRequest->reviewed_at = now();
            $editRequest->save();

            return response()->json([
                'success' => true,
                'message' => 'Edit request rejected',
                'data' => $editRequest
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get employee's own edit requests
     */
    public function myEditRequests(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();

            if (!$employeeProfile) {
                return response()->json([
                    'success' => false,
                    'message' => 'Employee profile not found'
                ], 404);
            }

            $query = AttendanceEditRequest::where('employee_id', $employeeProfile->id);

            // Filter by status if provided
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $requests = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $requests
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch edit requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}