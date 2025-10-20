<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\EmployeeProfile;
use App\Models\AttendanceImport;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Exception;

class AttendanceImportService
{
    protected $importResults = [
        'success' => 0,
        'failed' => 0,
        'errors' => [],
        'skipped' => 0,
        'absent_marked' => 0
    ];

    protected $importRecord = null;
    protected $periodStart = null;
    protected $periodEnd = null;

    /**
     * Import attendance data from Excel/CSV file
     */
    public function importFromExcel($filePath, $options = [])
    {
        try {
            $this->resetResults();
            
            // Extract options
            $periodStart = $options['period_start'] ?? null;
            $periodEnd = $options['period_end'] ?? null;
            $importType = $options['import_type'] ?? 'weekly';
            $filename = $options['filename'] ?? basename($filePath);
            $userId = $options['user_id'] ?? null;

            // Create import record
            $this->importRecord = AttendanceImport::create([
                'filename' => $filename,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'import_type' => $importType,
                'status' => 'processing',
                'imported_by' => $userId
            ]);

            $fileExtension = pathinfo($filePath, PATHINFO_EXTENSION);

            if (strtolower($fileExtension) === 'csv') {
                $this->importFromCsv($filePath);
            } else {
                // Verify file exists and is readable
                if (!file_exists($filePath) || !is_readable($filePath)) {
                    throw new Exception('File not found or not readable: ' . $filePath);
                }

                // Use PhpSpreadsheet directly to avoid Laravel Excel temp file issues
                $spreadsheet = IOFactory::load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                // Get raw values (not formatted) to avoid locale-specific formatting issues
                // Parameters: nullValue, calculateFormulas, formatData, returnCellRef
                $rows = $worksheet->toArray(null, true, false, false);
                
                if (count($rows) < 2) {
                    $this->importResults['errors'][] = 'Excel file is empty or missing data rows.';
                    return $this->importResults;
                }
                
                // First row is headers (normalize: lowercase, trim, replace spaces and dashes with underscores)
                $headers = array_map(function($header) {
                    return strtolower(str_replace([' ', '-'], '_', trim((string) $header)));
                }, $rows[0]);

                // Log the original headers for debugging
                Log::info('Original headers from row 0:', $rows[0]);
                Log::info('Normalized headers:', $headers);

                // Use the same logic as detectPeriodFromFile to find the correct header row
                $headerRowIndex = 0;
                $actualHeaders = $rows[0]; // Keep original headers for data mapping
                $normalizedHeaders = $headers;

                // Check if first row has our expected columns
                $hasExpectedColumns = false;
                $candidates = [
                    'date', 'punch_date', 'attendance_date', 'work_date',
                    'employee_id', 'person_id', 'biometric_id', 'emp_id',
                    'person_name', 'employee_name', 'name', 'full_name',
                    'attendance_record', 'time_in', 'time_out', 'clock_in', 'clock_out',
                    'verify_type', 'status', 'timezone', 'source', 'day'
                ];
                foreach ($candidates as $cand) {
                    if (in_array($cand, $normalizedHeaders)) {
                        $hasExpectedColumns = true;
                        break;
                    }
                }
                
                Log::info('Has expected columns in first row: ' . ($hasExpectedColumns ? 'YES' : 'NO'));
                
                // If first row doesn't have expected columns, look for them in other rows
                if (!$hasExpectedColumns) {
                    Log::info('Searching for headers in other rows...');
                    for ($i = 1; $i < min(10, count($rows)); $i++) {
                        $testHeaders = array_map(function($h) {
                            return strtolower(str_replace([' ', '-'], '_', trim((string) $h)));
                        }, $rows[$i]);
                        
                        Log::info("Checking row {$i} headers: " . json_encode($testHeaders));
                        
                        foreach ($candidates as $cand) {
                            if (in_array($cand, $testHeaders)) {
                                $headerRowIndex = $i;
                                $actualHeaders = $rows[$i];
                                $normalizedHeaders = $testHeaders;
                                Log::info("Found headers in row {$i}");
                                break 2;
                            }
                        }
                    }
                }
                
                // If still no expected columns found, try to use the first row anyway
                if (!$hasExpectedColumns) {
                    Log::warning('No expected columns found, using first row as headers anyway');
                    $hasExpectedColumns = true; // Force it to proceed
                }

                // Collect all raw punch data using the correct headers
                // Start from row after header row since actual data starts there
                $rawPunches = [];
                for ($i = $headerRowIndex + 1; $i < count($rows); $i++) {
                    $rowData = [];
                    foreach ($actualHeaders as $index => $header) {
                        // Use normalized header names for consistent access
                        $normalizedHeader = strtolower(str_replace([' ', '-'], '_', trim((string) $header)));
                        $rowData[$normalizedHeader] = $rows[$i][$index] ?? '';
                    }
                    $rawPunches[] = $rowData;
                }
                
                Log::info('Collected ' . count($rawPunches) . ' raw punch records');

                // Process aggregated punches (group by employee and date)
                $this->processAggregatedPunchData($rawPunches);
            }

            // Mark employees as absent if they have no attendance record in the imported period
            if ($periodStart && $periodEnd) {
                $this->markAbsentEmployees($periodStart, $periodEnd);
            }

            // Update import record with results
            $this->updateImportRecord();

            return $this->importResults;
        } catch (Exception $e) {
            Log::error('Attendance Import Error: ' . $e->getMessage());
            
            // Mark import as failed
            if ($this->importRecord) {
                $this->importRecord->markAsFailed([
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
            
            throw new Exception('Failed to import attendance data: ' . $e->getMessage());
        }
    }

    /**
     * Import from CSV file
     */
    protected function importFromCsv($filePath)
    {
        $file = fopen($filePath, 'r');
        $headers = [];
        $rowIndex = 0;
        $rawPunches = [];

        while (($data = fgetcsv($file, 1000, ",")) !== false) {
            if ($rowIndex === 0) {
                // Store headers (normalize: lowercase, trim, replace spaces and dashes with underscores)
                $headers = array_map(function($header) {
                    return strtolower(str_replace([' ', '-'], '_', trim((string) $header)));
                }, $data);
                $rowIndex++;
                continue;
            }

            // Convert array data to associative array
            $rowData = [];
            foreach ($headers as $index => $header) {
                $rowData[$header] = $data[$index] ?? '';
            }

            // Collect raw punch data
            $rawPunches[] = $rowData;
            $rowIndex++;
        }

        fclose($file);
        
        // Process aggregated punches (group by employee and date)
        $this->processAggregatedPunchData($rawPunches);
    }


    /**
     * Find employee by Person ID with fallback to name matching
     */
    protected function findEmployeeByPersonId($personId, $personName = null)
    {
        Log::info("Finding employee with Person ID: {$personId}, Name: {$personName}");
        
        if ($personId) {
            // First try to find by person_id in existing attendance records
            $attendance = Attendance::where('employee_biometric_id', $personId)->first();
            if ($attendance && $attendance->employee) {
                Log::info("Found employee via attendance record: " . $attendance->employee->id);
                return $attendance->employee;
            }
            
            // Try to match person_id with employee profile ID or other fields
            $employee = EmployeeProfile::where('id', $personId)
                ->orWhere('sss', 'LIKE', "%{$personId}%")
                ->orWhere('employee_id', $personId)
                ->first();
            
            if ($employee) {
                Log::info("Found employee via profile lookup: " . $employee->id . " (employee_id: " . $employee->employee_id . ")");
                return $employee;
            } else {
                Log::warning("No employee found with Person ID: {$personId}");
            }
        }

        // Fallback: try match by employee name
        if ($personName) {
            Log::info("Trying to find employee by name: {$personName}");
            $employee = $this->findEmployeeByName($personName);
            if ($employee) {
                Log::info("Found employee by name: " . $employee->id);
                return $employee;
            } else {
                Log::warning("No employee found with name: {$personName}");
            }
        }

        Log::warning("No employee found for Person ID: {$personId}, Name: {$personName}");
        return null;
    }

    /**
     * Process aggregated punch data - groups punches by employee and date
     */
    protected function processAggregatedPunchData($rawPunches)
    {
        // Group punches by employee and date
        $groupedPunches = [];
        
        Log::info('Processing ' . count($rawPunches) . ' raw punch records');
        
        foreach ($rawPunches as $index => $punchData) {
            Log::info("Processing raw punch row {$index}", [
                'person_id' => $punchData['person_id'] ?? 'N/A',
                'person_name' => $punchData['person_name'] ?? 'N/A',
                'punch_date' => $punchData['punch_date'] ?? $punchData['date'] ?? 'N/A',
                'attendance_record' => $punchData['attendance_record'] ?? 'N/A'
            ]);
            // Skip empty rows or header rows
            $hasPersonId = (!empty($punchData['person_id']) && 
                           $punchData['person_id'] !== 'Person ID' && 
                           strtolower((string) $punchData['person_id']) !== 'person id') ||
                          (!empty($punchData['biometric_id']) && 
                           $punchData['biometric_id'] !== 'Biometric ID' && 
                           strtolower((string) $punchData['biometric_id']) !== 'biometric id');
            $hasEmployeeId = (!empty($punchData['employee_id']) && 
                             $punchData['employee_id'] !== 'Employee ID' && 
                             strtolower((string) $punchData['employee_id']) !== 'employee id') ||
                            (!empty($punchData['emp_id']) && 
                             $punchData['emp_id'] !== 'Emp ID' && 
                             strtolower((string) $punchData['emp_id']) !== 'emp id');
            $hasPersonName = (!empty($punchData['person_name']) && 
                             strtolower((string) $punchData['person_name']) !== 'person name') ||
                            (!empty($punchData['employee_name']) && 
                             strtolower((string) $punchData['employee_name']) !== 'employee name') ||
                            (!empty($punchData['name']) && 
                             strtolower((string) $punchData['name']) !== 'name') ||
                            (!empty($punchData['full_name']) && 
                             strtolower((string) $punchData['full_name']) !== 'full name');
            $hasDate = (!empty($punchData['date']) && 
                       $punchData['date'] !== 'Date' && 
                       strtolower((string) $punchData['date']) !== 'date') ||
                      (!empty($punchData['punch_date']) && 
                       $punchData['punch_date'] !== 'Punch Date' && 
                       strtolower((string) $punchData['punch_date']) !== 'punch date') ||
                      (!empty($punchData['attendance_date']) && 
                       $punchData['attendance_date'] !== 'Attendance Date' && 
                       strtolower((string) $punchData['attendance_date']) !== 'attendance date') ||
                      (!empty($punchData['work_date']) && 
                       $punchData['work_date'] !== 'Work Date' && 
                       strtolower((string) $punchData['work_date']) !== 'work date');
            
            // Check if this row contains header values
            $isHeaderRow = false;
            $headerValues = [
                'person id', 'person name', 'employee id', 'employee name', 'name', 'full name',
                'date', 'punch date', 'attendance date', 'work date',
                'time in', 'time out', 'clock in', 'clock out', 'attendance record',
                'status', 'verify type', 'timezone', 'source', 'day', 'total hours'
            ];
            
            foreach ($punchData as $key => $value) {
                $normalizedValue = strtolower(trim((string) $value));
                if (in_array($normalizedValue, $headerValues)) {
                    $isHeaderRow = true;
                    break;
                }
            }
            
            if ($isHeaderRow || (!$hasPersonId && !$hasEmployeeId && !$hasPersonName && !$hasDate)) {
                Log::warning("Skipping row {$index}: isHeader={$isHeaderRow}, hasPersonId={$hasPersonId}, hasDate={$hasDate}", [
                    'row_data' => $punchData
                ]);
                $this->importResults['skipped']++;
                continue;
            }

            // Parse date
            $dateValue = $punchData['date'] ?? 
                        $punchData['punch_date'] ?? 
                        $punchData['attendance_date'] ?? 
                        $punchData['work_date'] ?? 
                        null;
            $date = $this->parseDate($dateValue);
            
            if (!$date) {
                $this->importResults['failed']++;
                $identifier = $punchData['person_id'] ?? $punchData['employee_id'] ?? 'Unknown';
                $this->importResults['errors'][] = "Invalid date format for ID: {$identifier}";
                continue;
            }

            // Check if we have separate time_in/time_out columns or attendance_record
            $timeIn = $this->parseTime($punchData['time_in'] ?? null);
            $timeOut = $this->parseTime($punchData['time_out'] ?? null);
            $attendanceRecord = $this->parseTime($punchData['attendance_record'] ?? null);
            
            // Create unique key for employee-date combination
            $personId = $punchData['person_id'] ?? $punchData['biometric_id'] ?? $punchData['employee_id'] ?? $punchData['emp_id'] ?? 'unknown';
            $personName = $punchData['person_name'] ?? $punchData['employee_name'] ?? $punchData['name'] ?? $punchData['full_name'] ?? null;
            $dateKey = $date->format('Y-m-d');
            $key = "{$personId}_{$dateKey}";

            if (!isset($groupedPunches[$key])) {
                $groupedPunches[$key] = [
                    'person_id' => $personId,
                    'person_name' => $personName,
                    'date' => $date,
                    'punches' => [],
                    'time_in' => null,
                    'time_out' => null,
                    'verify_type' => $punchData['verify_type'] ?? null,
                    'timezone' => $punchData['timezone'] ?? null,
                    'source' => $punchData['source'] ?? null,
                    'status' => $punchData['status'] ?? null,
                    'holiday_type' => $punchData['holiday_type'] ?? null,
                    'row_data' => $punchData
                ];
            }

            // If we have separate time_in/time_out columns, use them directly
            if ($timeIn || $timeOut) {
                if ($timeIn) {
                    $groupedPunches[$key]['time_in'] = $timeIn;
                }
                if ($timeOut) {
                    $groupedPunches[$key]['time_out'] = $timeOut;
                }
            } elseif ($attendanceRecord) {
                // Add punch time to the group for aggregation
                Log::info("Adding punch for {$personId} on {$dateKey}: {$attendanceRecord}");
                $groupedPunches[$key]['punches'][] = $attendanceRecord;
            }
        }

        Log::info('Grouped into ' . count($groupedPunches) . ' employee-date combinations');

        // Process each employee-date group
        foreach ($groupedPunches as $group) {
            $this->processEmployeeDayPunchGroup($group);
        }
    }

    /**
     * Process punches for a single employee on a single day
     */
    protected function processEmployeeDayPunchGroup($group)
    {
        try {
            // Find employee
            $employee = $this->findEmployee($group['row_data']);
            
            if (!$employee) {
                $this->importResults['failed']++;
                $this->importResults['errors'][] = "Employee not found (ID: {$group['person_id']}, Name: {$group['person_name']})";
                Log::warning('Employee not found during import', [
                    'person_id' => $group['person_id'],
                    'person_name' => $group['person_name']
                ]);
                return;
            }

            // Determine clock_in and clock_out
            $clockIn = null;
            $clockOut = null;

            // If we have explicit time_in/time_out, use them
            if ($group['time_in'] || $group['time_out']) {
                $clockIn = $group['time_in'];
                $clockOut = $group['time_out'];
            } elseif (!empty($group['punches'])) {
                // Log punches before sorting
                Log::info('Raw punches before sorting for employee ' . $employee->id, [
                    'punches' => $group['punches']
                ]);
                
                // Sort punches chronologically by converting to Carbon timestamps
                usort($group['punches'], function($a, $b) {
                    try {
                        $timeA = Carbon::parse($a);
                        $timeB = Carbon::parse($b);
                        return $timeA->timestamp - $timeB->timestamp;
                    } catch (Exception $e) {
                        // Fallback to string comparison if parsing fails
                        return strcmp($a, $b);
                    }
                });
                
                $clockIn = $group['punches'][0]; // First punch = Time In
                $clockOut = end($group['punches']); // Last punch = Time Out
                
                Log::info('Aggregated punches for employee ' . $employee->id . ' on ' . $group['date']->format('Y-m-d'), [
                    'total_punches' => count($group['punches']),
                    'all_punches_sorted' => $group['punches'],
                    'first_punch_time_in' => $clockIn,
                    'last_punch_time_out' => $clockOut
                ]);
            }

            // Prepare attendance data
            $attendanceData = [
                'employee_id' => $employee->id,
                'employee_biometric_id' => $group['person_id'],
                'date' => $group['date']->format('Y-m-d'),
                'clock_in' => $clockIn,
                'clock_out' => $clockOut,
                'break_out' => null,
                'break_in' => null,
                'remarks' => $group['holiday_type'] ?? $group['verify_type'] ?? $group['source'] ?? null,
            ];

            // Calculate total hours if both times are present
            if ($clockIn && $clockOut) {
                $attendanceData['total_hours'] = $this->calculateWorkingHours($clockIn, $clockOut, null, null);
                $attendanceData['overtime_hours'] = max(0, $attendanceData['total_hours'] - 8);
                $attendanceData['undertime_hours'] = max(0, 8 - $attendanceData['total_hours']);
            } else {
                $attendanceData['total_hours'] = 0;
                $attendanceData['overtime_hours'] = 0;
                $attendanceData['undertime_hours'] = 0;
            }

            // Determine status using enhanced logic
            $attendanceData['status'] = $this->determineEnhancedStatus(
                $employee,
                $group['date'],
                $clockIn,
                $clockOut,
                $attendanceData['total_hours'],
                $group['status'],
                $group['holiday_type']
            );

            // Create or update attendance record
            $this->createOrUpdateAttendance($attendanceData);

            $this->importResults['success']++;
            Log::info('Attendance record imported successfully', [
                'employee_id' => $employee->id,
                'date' => $group['date']->format('Y-m-d'),
                'clock_in' => $clockIn,
                'clock_out' => $clockOut,
                'total_punches' => count($group['punches'])
            ]);

        } catch (Exception $e) {
            $this->importResults['failed']++;
            $this->importResults['errors'][] = "Error processing employee day punches: " . $e->getMessage();
            Log::error('Employee day processing error: ' . $e->getMessage(), ['group' => $group ?? null, 'exception' => $e]);
        }
    }

    /**
     * Mark employees as absent if they have no attendance record in the imported period
     */
    protected function markAbsentEmployees($periodStart, $periodEnd)
    {
        try {
            Log::info("Marking absent employees for period: {$periodStart} to {$periodEnd}");
            
            // Get all active employees (exclude applicants - role_id 5)
            $allEmployees = EmployeeProfile::join('users', 'users.id', '=', 'employee_profiles.user_id')
                ->where('users.role_id', '!=', 5)
                ->select('employee_profiles.*')
                ->get();
            
            Log::info("Total active employees: " . $allEmployees->count());
            
            // Generate all dates in the period
            $startDate = Carbon::parse($periodStart);
            $endDate = Carbon::parse($periodEnd);
            $dates = [];
            
            for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                $dates[] = $date->format('Y-m-d');
            }
            
            Log::info("Total dates in period: " . count($dates));
            
            $absentCount = 0;
            
            // For each employee, check each date
            foreach ($allEmployees as $employee) {
                foreach ($dates as $dateStr) {
                    $date = Carbon::parse($dateStr);
                    
                    // Check if employee has attendance record for this date
                    $hasAttendance = Attendance::where('employee_id', $employee->id)
                        ->where('date', $dateStr)
                        ->exists();
                    
                    if (!$hasAttendance) {
                        // Check if it's a working day for the employee's shift
                        $dayOfWeek = $date->dayOfWeekIso; // 1 = Monday, 7 = Sunday
                        $shift = $employee->shift;
                        
                        // Only mark as absent if it's a working day
                        if ($shift && $shift->isWorkingDay($dayOfWeek)) {
                            // Check if it's a holiday
                            $isHoliday = Holiday::isHolidayDate($date);
                            
                            // Check if employee has approved leave
                            $hasApprovedLeave = LeaveRequest::where('employee_id', $employee->id)
                                ->where('from', '<=', $date)
                                ->where('to', '>=', $date)
                                ->where('status', 'approved')
                                ->exists();
                            
                            // Determine status
                            $status = 'Absent';
                            if ($isHoliday) {
                                $status = 'Holiday (No Work)';
                            } elseif ($hasApprovedLeave) {
                                $status = 'On Leave';
                            }
                            
                            // Create absent record
                            $attendanceData = [
                                'employee_id' => $employee->id,
                                'employee_biometric_id' => null,
                                'date' => $dateStr,
                                'clock_in' => null,
                                'clock_out' => null,
                                'break_out' => null,
                                'break_in' => null,
                                'total_hours' => 0,
                                'overtime_hours' => 0,
                                'undertime_hours' => 0,
                                'status' => $status,
                                'remarks' => 'Auto-marked during import'
                            ];
                            
                            $this->createOrUpdateAttendance($attendanceData);
                            $absentCount++;
                            
                            Log::info("Marked employee {$employee->id} ({$employee->first_name} {$employee->last_name}) as {$status} on {$dateStr}");
                        }
                    }
                }
            }
            
            Log::info("Total absent records created: {$absentCount}");
            
            // Update import results to include absent count
            $this->importResults['absent_marked'] = $absentCount;
            
        } catch (Exception $e) {
            Log::error('Error marking absent employees: ' . $e->getMessage());
            $this->importResults['errors'][] = "Error marking absent employees: " . $e->getMessage();
        }
    }

    /**
     * Determine enhanced attendance status with comprehensive logic
     */
    protected function determineEnhancedStatus($employee, $date, $clockIn, $clockOut, $totalHours, $importedStatus = null, $holidayType = null)
    {
        // If status is provided in the import, try to use it first
        if ($importedStatus) {
            $normalizedStatus = $this->normalizeStatusFromFile($importedStatus, $holidayType, $clockIn, $clockOut);
            if ($normalizedStatus) {
                return $normalizedStatus;
            }
        }

        // Check if holiday_type column is provided in the import
        if ($holidayType && !empty(trim($holidayType))) {
            // If holiday_type is specified, determine status based on whether they worked
            return $clockIn ? 'Holiday (Worked)' : 'Holiday (No Work)';
        }

        // Check if it's a holiday in the system
        if (Holiday::isHolidayDate($date)) {
            return $clockIn ? 'Holiday (Worked)' : 'Holiday (No Work)';
        }

        // Check if employee has approved leave
        $hasApprovedLeave = LeaveRequest::where('employee_id', $employee->id)
            ->where('from', '<=', $date)
            ->where('to', '>=', $date)
            ->where('status', 'approved')
            ->exists();

        if ($hasApprovedLeave) {
            return 'On Leave';
        }

        // Check if it's a working day for the employee's shift
        $dayOfWeek = $date->dayOfWeekIso; // 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
        $shift = $employee->shift;
        
        if (!$shift || !$shift->isWorkingDay($dayOfWeek)) {
            return 'Absent'; // Not a working day
        }

        // If no clock in/out times, mark as absent
        if (!$clockIn || !$clockOut) {
            return 'Absent';
        }

        // Determine status based on clock in/out times
        $clockInTime = Carbon::parse($clockIn);
        $clockOutTime = Carbon::parse($clockOut);
        $standardIn = Carbon::parse('08:00:00');
        $standardOut = Carbon::parse('17:00:00');
        $overtimeThreshold = Carbon::parse('18:00:00'); // 6 PM

        // Check if clocked in late (after 8:00 AM)
        $isLate = $clockInTime->gt($standardIn);
        
        // Check if clocked out early (before 5:00 PM)
        $isEarlyOut = $clockOutTime->lt($standardOut);
        
        // Check if clocked in at 9 AM or later
        $isTooLate = $clockInTime->gte(Carbon::parse('09:00:00'));
        
        // Check if clocked out at 6 PM or later (overtime)
        $isOvertime = $clockOutTime->gte($overtimeThreshold);

        Log::info('Determining status based on clock times', [
            'employee_id' => $employee->id,
            'date' => $date->format('Y-m-d'),
            'clock_in' => $clockIn,
            'clock_out' => $clockOut,
            'is_late' => $isLate,
            'is_early_out' => $isEarlyOut,
            'is_too_late' => $isTooLate,
            'is_overtime' => $isOvertime
        ]);

        // Determine status based on combinations
        if ($isOvertime && !$isLate && !$isEarlyOut) {
            Log::info('Status: Overtime');
            return 'Overtime';
        } elseif ($isTooLate) {
            Log::info('Status: Undertime (clocked in 9am+)');
            return 'Undertime';
        } elseif ($isEarlyOut) {
            Log::info('Status: Undertime (clocked out early)');
            return 'Undertime';
        } elseif ($isLate) {
            Log::info('Status: Late');
            return 'Late';
        } else {
            Log::info('Status: Present');
            return 'Present';
        }
    }

    /**
     * Determine attendance status using shift information
     */
    protected function determineStatusWithShift($employee, $date, $clockIn, $clockOut, $totalHours)
    {
        // Check if it's a holiday
        if (Holiday::isHolidayDate($date)) {
            return $clockIn ? 'Holiday (Worked)' : 'Holiday (No Work)';
        }

        // Check if employee has approved leave
        $hasApprovedLeave = LeaveRequest::where('employee_id', $employee->id)
            ->where('from', '<=', $date)
            ->where('to', '>=', $date)
            ->where('status', 'approved')
            ->exists();

        if ($hasApprovedLeave) {
            return 'On Leave';
        }

        // Check if it's a working day for the employee's shift
        $dayOfWeek = $date->dayOfWeekIso; // 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
        $shift = $employee->shift;
        
        if (!$shift || !$shift->isWorkingDay($dayOfWeek)) {
            return 'Absent'; // Not a working day
        }

        // If no clock in/out times, mark as absent
        if (!$clockIn || !$clockOut) {
            return 'Absent';
        }

        // Determine status based on clock in/out times
        $clockInTime = Carbon::parse($clockIn);
        $clockOutTime = Carbon::parse($clockOut);
        $standardIn = Carbon::parse('08:00:00');
        $standardOut = Carbon::parse('17:00:00');
        $overtimeThreshold = Carbon::parse('18:00:00'); // 6 PM

        // Check if clocked in late (after 8:00 AM)
        $isLate = $clockInTime->gt($standardIn);
        
        // Check if clocked out early (before 5:00 PM)
        $isEarlyOut = $clockOutTime->lt($standardOut);
        
        // Check if clocked in at 9 AM or later
        $isTooLate = $clockInTime->gte(Carbon::parse('09:00:00'));
        
        // Check if clocked out at 6 PM or later (overtime)
        $isOvertime = $clockOutTime->gte($overtimeThreshold);

        // Determine status based on combinations
        if ($isOvertime && !$isLate && !$isEarlyOut) {
            return 'Overtime';
        } elseif ($isTooLate) {
            return 'Undertime';
        } elseif ($isEarlyOut) {
            return 'Undertime';
        } elseif ($isLate) {
            return 'Late';
        } else {
            return 'Present';
        }
    }

    /**
     * Find employee by name (handles "First Middle Last" and "Last, First [Middle]")
     */
    protected function findEmployeeByName($personName)
    {
        $fullName = trim(preg_replace('/\s+/', ' ', (string) $personName));
        $normalizedFull = mb_strtolower($fullName);

        // Try to extract first/last name tokens
        $first = null; $last = null;
        if (strpos($fullName, ',') !== false) {
            // Format: "Last, First [Middle]"
            $parts = array_map('trim', explode(',', $fullName, 2));
            if (count($parts) >= 2) {
                $last = $parts[0];
                $firstParts = explode(' ', $parts[1]);
                $first = $firstParts[0];
            }
        } else {
            // Format: "First [Middle] Last"
            $parts = explode(' ', $fullName);
            if (count($parts) >= 2) {
                $first = $parts[0];
                $last = end($parts);
            }
        }

        // Try exact full name match first
        $employee = EmployeeProfile::whereRaw("LOWER(CONCAT(first_name, ' ', last_name)) = ?", [$normalizedFull])
            ->orWhereRaw("LOWER(CONCAT(last_name, ', ', first_name)) = ?", [$normalizedFull])
            ->first();

        if ($employee) {
            return $employee;
        }

        // Try first/last name combination if we extracted them
        if ($first && $last) {
            $employee = EmployeeProfile::whereRaw("LOWER(first_name) = ? AND LOWER(last_name) = ?", [
                mb_strtolower($first), mb_strtolower($last)
            ])->first();

            if ($employee) {
                return $employee;
            }
        }

        return null;
    }

    /**
     * Find employee by Person ID, Employee ID, or fallback to employee name
     */
    protected function findEmployee($rowData)
    {
        $personId = $rowData['person_id'] ?? $rowData['biometric_id'] ?? null;
        $employeeId = $rowData['employee_id'] ?? $rowData['emp_id'] ?? null;
        $personName = $rowData['person_name'] ?? 
                     $rowData['employee_name'] ?? 
                     $rowData['name'] ?? 
                     $rowData['full_name'] ?? 
                     null;

        // Try employee_id first (new column)
        if ($employeeId) {
            $employee = EmployeeProfile::where('employee_id', $employeeId)->first();
            if ($employee) {
                return $employee;
            }
        }

        // Try person_id (legacy column)
        if ($personId) {
            // First try to find by person_id in existing attendance records
            $attendance = Attendance::where('employee_biometric_id', $personId)->first();
            if ($attendance && $attendance->employee) {
                return $attendance->employee;
            }
            
            // Try to match person_id with employee profile ID or other fields
            $employee = EmployeeProfile::where('id', $personId)
                ->orWhere('sss', 'LIKE', "%{$personId}%")
                ->orWhere('employee_id', $personId)
                ->first();
            
            if ($employee) {
                return $employee;
            }
        }

        // Fallback: try match by employee name (handles "First Middle Last" and "Last, First [Middle]")
        if ($personName) {
            $fullName = trim(preg_replace('/\s+/', ' ', (string) $personName));
            $normalizedFull = mb_strtolower($fullName);

            // Try to extract first/last name tokens
            $first = null; $last = null;
            if (strpos($fullName, ',') !== false) {
                // Format: Last, First [Middle]
                [$lastTok, $rest] = array_map('trim', explode(',', $fullName, 2));
                $firstTok = trim(explode(' ', trim($rest))[0] ?? '');
                $first = $firstTok ?: null;
                $last = $lastTok ?: null;
            } else {
                // Format: First [Middle ...] Last
                $parts = preg_split('/\s+/', $fullName);
                if (count($parts) >= 2) {
                    $first = $parts[0];
                    $last = $parts[count($parts) - 1];
                }
            }

            $query = EmployeeProfile::query();
            $query->where(function($q) use ($normalizedFull, $first, $last) {
                // Strict equals on normalized full name (various orders)
                $q->whereRaw('LOWER(CONCAT(TRIM(first_name), " ", TRIM(last_name))) = ?', [$normalizedFull])
                  ->orWhereRaw('LOWER(CONCAT(TRIM(last_name), " ", TRIM(first_name))) = ?', [$normalizedFull])
                  ->orWhereRaw('LOWER(CONCAT(TRIM(last_name), ", ", TRIM(first_name))) = ?', [$normalizedFull]);
                // Strict equals on tokens when both present
                if ($first && $last) {
                    $q->orWhere(function($q2) use ($first, $last) {
                        $q2->whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower($first)])
                           ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower($last)]);
                    })->orWhere(function($q2) use ($first, $last) {
                        $q2->whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower($last)])
                           ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower($first)]);
                    });
                }
            });

            if (!empty($rowData['department'])) {
                $query->whereRaw('LOWER(TRIM(department)) = ?', [mb_strtolower((string) $rowData['department'])]);
            }
            if (!empty($rowData['position'])) {
                $query->whereRaw('LOWER(TRIM(position)) = ?', [mb_strtolower((string) $rowData['position'])]);
            }

            $matches = $query->get();
            $match = $matches->count() === 1 ? $matches->first() : null;
            if ($match) {
                return $match;
            }

            // Fallback 2: search users table for name match, create profile if missing
            $user = \App\Models\User::query()
                ->whereRaw('LOWER(CONCAT(TRIM(first_name), " ", TRIM(last_name))) = ?', [$normalizedFull])
                ->orWhereRaw('LOWER(CONCAT(TRIM(last_name), " ", TRIM(first_name))) = ?', [$normalizedFull])
                ->first();
            if ($user) {
                $profile = $user->employeeProfile;
                if (!$profile) {
                    $profile = $user->employeeProfile()->create([
                        'first_name' => $user->first_name,
                        'last_name' => $user->last_name,
                        'email' => $user->email,
                        'position' => $rowData['position'] ?? null,
                        'department' => $rowData['department'] ?? null,
                        'employment_status' => 'Full Time',
                        'hire_date' => now()->subDays(120)->toDateString(),
                    ]);
                }
                return $profile;
            }
        }

        return null;
    }

    /**
     * Parse date from various formats
     */
    protected function parseDate($dateString)
    {
        try {
            if (empty($dateString) && $dateString !== 0 && $dateString !== '0') {
                return null;
            }

            // Log the input for debugging
            Log::info("Parsing date: " . $dateString . " (type: " . gettype($dateString) . ")");

            // Handle Excel serial numbers (numeric values)
            if (is_numeric($dateString)) {
                // Excel's serialized date starts at 1899-12-30 for PhpSpreadsheet's helper
                // Using PhpSpreadsheet to avoid off-by-one across leap-year edge cases
                $excelEpoch = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $dateString);
                $result = Carbon::instance($excelEpoch);
                // Ensure we're working with the date in UTC to avoid timezone issues
                $result = $result->utc()->startOfDay();
                Log::info("Parsed as Excel serial number: " . $result->format('Y-m-d'));
                return $result;
            }

            // Try different date formats - prioritize MM/DD/YYYY since that's what your file uses
            $formats = [
                'm/d/Y',      // MM/DD/YYYY (your file format)
                'm/d/y',      // MM/DD/YY
                'Y-m-d',      // YYYY-MM-DD
                'd/m/Y',      // DD/MM/YYYY
                'd/m/y',      // DD/MM/YY
                'Y-m-d H:i:s', // YYYY-MM-DD HH:MM:SS
                'm/d/Y H:i:s', // MM/DD/YYYY HH:MM:SS
                'n/j/Y',      // M/D/YYYY (single digit month/day)
                'n/j/y',      // M/D/YY
            ];

            foreach ($formats as $format) {
                try {
                $date = Carbon::createFromFormat($format, $dateString);
                if ($date !== false) {
                        // Ensure we're working with the date in UTC to avoid timezone issues
                        $date = $date->utc()->startOfDay();
                        Log::info("Parsed with format {$format}: " . $date->format('Y-m-d'));
                        return $date;
                    }
                } catch (Exception $e) {
                    // Continue to next format
                    continue;
                }
            }

            // Try Carbon's flexible parsing as last resort
            try {
                $result = Carbon::parse($dateString);
                // Ensure we're working with the date in UTC to avoid timezone issues
                $result = $result->utc()->startOfDay();
                Log::info("Parsed with Carbon flexible parsing: " . $result->format('Y-m-d'));
                return $result;
            } catch (Exception $e) {
                Log::warning("Failed to parse date with Carbon: " . $e->getMessage());
                return null;
            }
            
        } catch (Exception $e) {
            Log::error("Date parsing error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Parse time from string
     */
    protected function parseTime($timeString)
    {
        try {
            if ((empty($timeString) && $timeString !== 0 && $timeString !== '0') || $timeString === '--' || strtolower((string) $timeString) === 'n/a') {
                return null;
            }

            // Handle malformed date strings (e.g., "1月1日" which is Excel date formatting issue)
            // These occur when Excel time values are incorrectly read as dates
            $timeStringStr = (string) $timeString;
            if (preg_match('/[月日年]/', $timeStringStr) || preg_match('/^[0-9]{1,2}\/[0-9]{1,2}$/', $timeStringStr)) {
                // This is likely a date that should be a time - skip it and log warning
                Log::warning("Skipping malformed time value (appears to be date): {$timeStringStr}");
                return null;
            }

            // Handle Excel time serials (fraction of a day)
            if (is_numeric($timeString)) {
                $floatValue = (float) $timeString;
                
                // If the value is between 0 and 1, it's a time fraction
                if ($floatValue >= 0 && $floatValue < 1) {
                    $secondsInDay = 24 * 60 * 60;
                    $totalSeconds = (int) round($floatValue * $secondsInDay);
                    $hours = floor($totalSeconds / 3600);
                    $minutes = floor(($totalSeconds % 3600) / 60);
                    $seconds = $totalSeconds % 60;
                    return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
                }
                
                // If value is > 1, extract the fractional part (time component)
                if ($floatValue > 1) {
                    $timeFraction = $floatValue - floor($floatValue);
                    $secondsInDay = 24 * 60 * 60;
                    $totalSeconds = (int) round($timeFraction * $secondsInDay);
                    $hours = floor($totalSeconds / 3600);
                    $minutes = floor(($totalSeconds % 3600) / 60);
                    $seconds = $totalSeconds % 60;
                    return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
                }
            }

            // Try to parse as regular time string (HH:MM:SS or HH:MM)
            return Carbon::parse($timeStringStr)->format('H:i:s');
        } catch (Exception $e) {
            Log::warning("Failed to parse time: {$timeString}, error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Prepare attendance data array
     */
    protected function prepareAttendanceData($rowData, $employee, $date)
    {
        // Parse attendance record time (this represents the punch time)
        $attendanceTime = $this->parseTime($rowData['attendance_record'] ?? null);
        
        // For the new format, we'll treat attendance_record as clock_in time
        // and set clock_out to null since we only have one time per record
        $clockIn = $attendanceTime;
        $clockOut = null;
        $breakOut = null;
        $breakIn = null;

        $data = [
            'employee_id' => $employee->id,
            'employee_biometric_id' => $rowData['person_id'] ?? null,
            'date' => $date,
            'clock_in' => $clockIn,
            'clock_out' => $clockOut,
            'break_out' => $breakOut,
            'break_in' => $breakIn,
            'remarks' => $rowData['verify_type'] ?? $rowData['source'] ?? null,
        ];

        // For single punch records, we can't calculate total hours
        // Set default values since we only have one time entry
        $data['total_hours'] = null;
        $data['overtime_hours'] = null;
        $data['undertime_hours'] = null;

        // Determine status based on punch time presence
        if ($clockIn) {
            $data['status'] = 'Present'; // Single punch indicates presence
        } else {
            $data['status'] = 'Absent'; // No punch time indicates absence
        }

        return $data;
    }

    /**
     * Normalize arbitrary status strings to supported enum values
     */
    protected function normalizeStatusFromFile(string $rawStatus, $holidayType = null, $clockIn = null, $clockOut = null): string
    {
        $s = trim(mb_strtolower($rawStatus));
        // exact allowed
        $allowed = [
            'present' => 'Present',
            'absent' => 'Absent',
            'late' => 'Late',
            'undertime' => 'Undertime',
            'overtime' => 'Overtime',
            'late (undertime)' => 'Late (Undertime)',
            'late (overtime)' => 'Late (Overtime)',
            'on leave' => 'On Leave',
            'holiday (no work)' => 'Holiday (No Work)',
            'holiday (worked)' => 'Holiday (Worked)'
        ];
        if (isset($allowed[$s])) {
            return $allowed[$s];
        }

        // common aliases
        $map = [
            'rd' => 'Holiday (No Work)',
            'restday' => 'Holiday (No Work)',
            'rest day' => 'Holiday (No Work)',
            'rest_day' => 'Holiday (No Work)',
            'off' => 'Holiday (No Work)',
            'day off' => 'Holiday (No Work)',
            'holiday' => ($clockIn || $clockOut) ? 'Holiday (Worked)' : 'Holiday (No Work)',
            'worked holiday' => 'Holiday (Worked)',
            'no work holiday' => 'Holiday (No Work)',
            'sl' => 'On Leave',
            'vl' => 'On Leave',
            'leave' => 'On Leave',
            'sick leave' => 'On Leave',
            'vacation leave' => 'On Leave',
        ];
        if (isset($map[$s])) {
            return $map[$s];
        }

        // holiday_type hint
        if (!empty($holidayType)) {
            return ($clockIn || $clockOut) ? 'Holiday (Worked)' : 'Holiday (No Work)';
        }

        // fallback
        return $this->determineStatus($clockIn, $clockOut, 0);
    }

    /**
     * Calculate working hours
     */
    protected function calculateWorkingHours($clockIn, $clockOut, $breakOut = null, $breakIn = null)
    {
        $start = Carbon::parse($clockIn);
        $end = Carbon::parse($clockOut);
        
        $totalMinutes = $end->diffInMinutes($start);
        
        // Subtract break time if available
        if ($breakOut && $breakIn) {
            $breakStart = Carbon::parse($breakOut);
            $breakEnd = Carbon::parse($breakIn);
            $breakMinutes = $breakEnd->diffInMinutes($breakStart);
            $totalMinutes -= $breakMinutes;
        }
        
        return round($totalMinutes / 60, 2);
    }

    /**
     * Determine attendance status
     */
    protected function determineStatus($clockIn, $clockOut, $totalHours)
    {
        if (!$clockIn) {
            return 'Absent';
        }

        $clockInTime = Carbon::parse($clockIn);
        $standardTime = Carbon::parse('08:00:00');
        
        $isLate = $clockInTime->gt($standardTime);
        
        // Check if overtime (clock out at 6 PM or later)
        if ($clockOut) {
            $clockOutTime = Carbon::parse($clockOut);
            $overtimeThreshold = Carbon::parse('18:00:00'); // 6 PM
            $isOvertime = $clockOutTime->gte($overtimeThreshold);
            
            if ($isLate && $isOvertime) {
                return 'Late (Overtime)';
            }
            
            if ($isOvertime) {
                return 'Overtime';
            }
        }

        if ($isLate) {
            return 'Late';
        }

        return 'Present';
    }

    /**
     * Determine status with holiday and approved leave context
     */
    protected function determineStatusWithContext($employeeId, $date, $clockIn, $clockOut, $totalHours)
    {
        // Holiday check
        $holiday = Holiday::isHolidayDate($date);
        if ($holiday) {
            if (!$clockIn && !$clockOut) {
                return 'Holiday (No Work)';
            }
            return 'Holiday (Worked)';
        }

        // Approved Leave check (status approved and date within range)
        $hasApprovedLeave = LeaveRequest::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->whereDate('from', '<=', $date)
            ->whereDate('to', '>=', $date)
            ->exists();
        if ($hasApprovedLeave) {
            return 'On Leave';
        }

        // Fallback to regular determination
        return $this->determineStatus($clockIn, $clockOut, $totalHours);
    }

    /**
     * Create or update attendance record
     */
    protected function createOrUpdateAttendance($data)
    {
        // Guard against invalid epoch placeholder dates
        if (isset($data['date']) && $data['date'] < '2000-01-01') {
            return; // skip creating obviously invalid 1970-era data
        }

        Attendance::updateOrCreate(
            [
                'employee_id' => $data['employee_id'],
                'date' => $data['date']
            ],
            $data
        );
    }

    /**
     * Reset import results
     */
    protected function resetResults()
    {
        $this->importResults = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
            'skipped' => 0,
            'absent_marked' => 0
        ];

    }

    /**
     * Update import record with results
     */
    protected function updateImportRecord()
    {
        if (!$this->importRecord) {
            return;
        }

        // Cap stored errors to avoid exceeding column limits
        $errors = $this->importResults['errors'] ?? [];
        $maxItems = 200; // store at most 200 error messages
        $maxLen = 255; // truncate long messages for storage
        if (is_array($errors)) {
            $errors = array_map(function($e) use ($maxLen) {
                $s = (string) $e;
                return mb_strlen($s) > $maxLen ? mb_substr($s, 0, $maxLen - 3) . '...' : $s;
            }, array_slice($errors, 0, $maxItems));
        }

        $this->importRecord->update([
            'total_rows' => $this->importResults['success'] + $this->importResults['failed'] + $this->importResults['skipped'],
            'successful_rows' => $this->importResults['success'],
            'failed_rows' => $this->importResults['failed'],
            'skipped_rows' => $this->importResults['skipped'],
            'errors' => $errors,
            'status' => 'completed',
            'completed_at' => now()
        ]);
    }

    /**
     * Check for overlapping imports
     */
    public function checkOverlappingImport($periodStart, $periodEnd)
    {
        return AttendanceImport::hasOverlappingImport($periodStart, $periodEnd);
    }

    /**
     * Get import record
     */
    public function getImportRecord()
    {
        return $this->importRecord;
    }

    /**
     * Detect period from file data
     */
    public function detectPeriodFromFile($filePath)
    {
        try {
            $fileExtension = pathinfo($filePath, PATHINFO_EXTENSION);
            $dates = [];

            if (strtolower($fileExtension) === 'csv') {
                $file = fopen($filePath, 'r');
                $headers = fgetcsv($file, 1000, ",");
                // Normalize headers: lowercase, trim, replace spaces/dashes with underscores
                $normalizedHeaders = array_map(function($h) {
                    $h = preg_replace('/^[\xEF\xBB\xBF]/', '', (string) $h); // strip BOM if present
                    return strtolower(str_replace([' ', '-'], '_', trim($h)));
                }, $headers ?: []);
                
                // Log headers for debugging
                Log::info('CSV Headers found:', $normalizedHeaders);
                
                $candidates = ['date', 'punch_date', 'attendance_date', 'work_date'];
                $dateIndex = null;
                foreach ($candidates as $cand) {
                    $idx = array_search($cand, $normalizedHeaders, true);
                    if ($idx !== false) { 
                        $dateIndex = $idx; 
                        Log::info("Found date column: {$cand} at index {$idx}");
                        break; 
                    }
                }
                
                if ($dateIndex === null) {
                    Log::warning('No date column found in CSV file');
                    fclose($file);
                    return null;
                }
                
                while (($data = fgetcsv($file, 1000, ",")) !== false) {
                    if ($dateIndex !== null && isset($data[$dateIndex]) && $data[$dateIndex] !== '') {
                        $dateValue = $data[$dateIndex];
                        Log::info("Processing date value: {$dateValue}");
                        $date = $this->parseDate($dateValue);
                        if ($date) {
                            $dates[] = $date;
                            Log::info("Parsed date: {$date}");
                        } else {
                            Log::warning("Failed to parse date: {$dateValue}");
                        }
                    }
                }
                fclose($file);
            } else {
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                // Get raw values (not formatted) to avoid locale-specific formatting issues
                $rows = $worksheet->toArray(null, true, false, false);
                
                // Log all rows for debugging
                Log::info('Excel file rows count: ' . count($rows));
                Log::info('First few rows:', array_slice($rows, 0, 5));
                
                if (count($rows) > 1) {
                    // Try to find the header row - look for common column names
                    $headerRowIndex = 0;
                    $headers = $rows[0];
                    $normalizedHeaders = array_map(function($h) {
                        return strtolower(str_replace([' ', '-'], '_', trim((string) $h)));
                    }, $headers);
                    
                    // Check if first row has our expected columns
                    $hasExpectedColumns = false;
                    $candidates = ['date', 'punch_date', 'employee_id', 'person_id', 'person_name', 'attendance_record', 'time_in', 'time_out'];
                    foreach ($candidates as $cand) {
                        if (in_array($cand, $normalizedHeaders)) {
                            $hasExpectedColumns = true;
                            break;
                        }
                    }
                    
                    // If first row doesn't have expected columns, look for them in other rows
                    if (!$hasExpectedColumns) {
                        for ($i = 1; $i < min(10, count($rows)); $i++) {
                            $testHeaders = array_map(function($h) {
                                return strtolower(str_replace([' ', '-'], '_', trim((string) $h)));
                            }, $rows[$i]);
                            
                            foreach ($candidates as $cand) {
                                if (in_array($cand, $testHeaders)) {
                                    $headerRowIndex = $i;
                                    $headers = $rows[$i];
                                    $normalizedHeaders = $testHeaders;
                                    Log::info("Found headers in row {$i}");
                                    break 2;
                                }
                            }
                        }
                    }
                    
                    // Log headers for debugging
                    Log::info('Excel Headers found:', $normalizedHeaders);
                    
                    $candidates = ['date', 'punch_date', 'attendance_date', 'work_date'];
                    $dateIndex = null;
                    foreach ($candidates as $cand) {
                        $idx = array_search($cand, $normalizedHeaders, true);
                        if ($idx !== false) { 
                            $dateIndex = $idx; 
                            Log::info("Found date column: {$cand} at index {$idx}");
                            break; 
                        }
                    }
                    
                    if ($dateIndex === null) {
                        Log::warning('No date column found in Excel file');
                        return null;
                    }
                    
                    // Start processing from row 3 (index 2) since actual data starts there
                    for ($i = 2; $i < count($rows); $i++) {
                        if ($dateIndex !== null && isset($rows[$i][$dateIndex]) && $rows[$i][$dateIndex] !== '') {
                            $dateValue = $rows[$i][$dateIndex];
                            Log::info("Processing date value: {$dateValue}");
                            $date = $this->parseDate($dateValue);
                            if ($date) {
                                $dates[] = $date;
                                Log::info("Parsed date: {$date}");
                            } else {
                                Log::warning("Failed to parse date: {$dateValue}");
                            }
                        }
                    }
                }
            }

            Log::info('Total dates found: ' . count($dates));

            if (empty($dates)) {
                Log::warning('No valid dates found in file');
                return null;
            }

            sort($dates);
            $result = [
                'period_start' => $dates[0],
                'period_end' => end($dates),
                'total_dates' => count($dates)
            ];
            
            Log::info('Period detection result:', $result);
            return $result;
        } catch (Exception $e) {
            Log::error('Period detection error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return null;
        }
    }

    /**
     * Get expected Excel headers
     */
    public static function getExpectedHeaders()
    {
        return [
            'employee_id' => 'Employee ID',
            'person_id' => 'Person ID (Legacy)',
            'name' => 'Name (First Name + Last Name)',
            'person_name' => 'Person Name (Legacy)',
            'date' => 'Date',
            'punch_date' => 'Punch Date (Legacy)',
            'day' => 'Day',
            'time_in' => 'Time-in',
            'time_out' => 'Time-out',
            'attendance_record' => 'Attendance Record (Legacy)',
            'status' => 'Status',
            'holiday_type' => 'Holiday Type',
            'verify_type' => 'Verify Type (Legacy)',
            'total_hours' => 'Total Hours',
            'timezone' => 'TimeZone (Legacy)',
            'source' => 'Source (Legacy)'
        ];
    }
}