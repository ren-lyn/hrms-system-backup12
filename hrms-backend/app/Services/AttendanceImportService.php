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
        'skipped' => 0
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
                $rows = $worksheet->toArray();
                
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
                // Start from row 2 (index 1) since actual data starts there (row 1 is headers)
                $rawPunches = [];
                for ($i = 1; $i < count($rows); $i++) {
                    $rowData = [];
                    foreach ($actualHeaders as $index => $header) {
                        // Use normalized header names for consistent access
                        $normalizedHeader = strtolower(str_replace([' ', '-'], '_', trim((string) $header)));
                        $rowData[$normalizedHeader] = $rows[$i][$index] ?? '';
                    }
                    $rawPunches[] = $rowData;
                }
                
                Log::info('Collected ' . count($rawPunches) . ' raw punch records');

                // Process each row individually
                foreach ($rawPunches as $rowData) {
                    $this->processRow($rowData);
                }
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
        
        // Process each row individually
        foreach ($rawPunches as $rowData) {
            $this->processRow($rowData);
        }
    }

    /**
     * Process each row from the Excel file
     */
    protected function processRow($row)
    {
        try {
            // Convert row to array for easier access
            if (is_object($row) && method_exists($row, 'toArray')) {
                $rowData = $row->toArray();
            } elseif (is_object($row)) {
                $rowData = (array) $row;
            } else {
                $rowData = $row;
            }
            
            // Log the row data for debugging
            Log::info('Processing row data:', $rowData);
            
            // Skip empty rows or header rows - check multiple possible column names
            $hasPersonId = (!empty($rowData['person_id']) && 
                           $rowData['person_id'] !== 'Person ID' && 
                           strtolower((string) $rowData['person_id']) !== 'person id') ||
                          (!empty($rowData['biometric_id']) && 
                           $rowData['biometric_id'] !== 'Biometric ID' && 
                           strtolower((string) $rowData['biometric_id']) !== 'biometric id');
            $hasEmployeeId = (!empty($rowData['employee_id']) && 
                             $rowData['employee_id'] !== 'Employee ID' && 
                             strtolower((string) $rowData['employee_id']) !== 'employee id') ||
                            (!empty($rowData['emp_id']) && 
                             $rowData['emp_id'] !== 'Emp ID' && 
                             strtolower((string) $rowData['emp_id']) !== 'emp id');
            $hasPersonName = (!empty($rowData['person_name']) && 
                             strtolower((string) $rowData['person_name']) !== 'person name') ||
                            (!empty($rowData['employee_name']) && 
                             strtolower((string) $rowData['employee_name']) !== 'employee name') ||
                            (!empty($rowData['name']) && 
                             strtolower((string) $rowData['name']) !== 'name') ||
                            (!empty($rowData['full_name']) && 
                             strtolower((string) $rowData['full_name']) !== 'full name');
            $hasDate = (!empty($rowData['date']) && 
                       $rowData['date'] !== 'Date' && 
                       strtolower((string) $rowData['date']) !== 'date') ||
                      (!empty($rowData['punch_date']) && 
                       $rowData['punch_date'] !== 'Punch Date' && 
                       strtolower((string) $rowData['punch_date']) !== 'punch date') ||
                      (!empty($rowData['attendance_date']) && 
                       $rowData['attendance_date'] !== 'Attendance Date' && 
                       strtolower((string) $rowData['attendance_date']) !== 'attendance date') ||
                      (!empty($rowData['work_date']) && 
                       $rowData['work_date'] !== 'Work Date' && 
                       strtolower((string) $rowData['work_date']) !== 'work date');
            
            // Check if this row contains header values (common header text)
            $isHeaderRow = false;
            $headerValues = [
                'person id', 'person name', 'employee id', 'employee name', 'name', 'full name',
                'date', 'punch date', 'attendance date', 'work date',
                'time in', 'time out', 'clock in', 'clock out', 'attendance record',
                'status', 'verify type', 'timezone', 'source', 'day', 'total hours'
            ];
            
            foreach ($rowData as $key => $value) {
                $normalizedValue = strtolower(trim((string) $value));
                if (in_array($normalizedValue, $headerValues)) {
                    $isHeaderRow = true;
                    break;
                }
            }
            
            // Also check for any non-empty data in the row
            $hasAnyData = false;
            foreach ($rowData as $key => $value) {
                if (!empty($value) && $value !== '' && $value !== null) {
                    $hasAnyData = true;
                    break;
                }
            }
            
            Log::info('Row validation - Person ID: ' . ($hasPersonId ? 'YES' : 'NO') . 
                     ', Employee ID: ' . ($hasEmployeeId ? 'YES' : 'NO') . 
                     ', Person Name: ' . ($hasPersonName ? 'YES' : 'NO') . 
                     ', Date: ' . ($hasDate ? 'YES' : 'NO') . 
                     ', Is Header Row: ' . ($isHeaderRow ? 'YES' : 'NO') . 
                     ', Has Any Data: ' . ($hasAnyData ? 'YES' : 'NO'));
            
            // Skip header rows or rows with no valid data
            if ($isHeaderRow || (!$hasPersonId && !$hasEmployeeId && !$hasPersonName && !$hasDate && !$hasAnyData)) {
                Log::warning('Skipping row - header row or no valid data found');
                $this->importResults['skipped']++;
                return;
            }

            // Find employee by biometric ID or employee ID
            $employee = $this->findEmployee($rowData);
            
            if (!$employee) {
                $this->importResults['failed']++;
                $identifier = $rowData['person_id'] ?? 'Unknown';
                $nameForMsg = isset($rowData['person_name']) ? (string) $rowData['person_name'] : 'N/A';
                $this->importResults['errors'][] = "Employee not found (ID: {$identifier}, Name: {$nameForMsg})";
                Log::warning('Employee not found during import', [
                    'person_id' => $rowData['person_id'] ?? null,
                    'person_name' => $rowData['person_name'] ?? null,
                    'row_data' => $rowData
                ]);
                return;
            }

            // Parse and validate date (check multiple possible date columns)
            $dateValue = $rowData['date'] ?? 
                        $rowData['punch_date'] ?? 
                        $rowData['attendance_date'] ?? 
                        $rowData['work_date'] ?? 
                        null;
            $date = $this->parseDate($dateValue);
            if (!$date) {
                $this->importResults['failed']++;
                $this->importResults['errors'][] = "Invalid date format for Person ID: {$rowData['person_id']}";
                return;
            }

            // Process punch data (first/last punch per day)
            $this->processPunchData($rowData, $employee, $date);

            $this->importResults['success']++;
            Log::info('Punch record processed successfully', [
                'employee_id' => $employee->id,
                'date' => $date,
                'punch_time' => $rowData['attendance_record'] ?? null
            ]);
            
        } catch (Exception $e) {
            $this->importResults['failed']++;
            $this->importResults['errors'][] = "Error processing row: " . $e->getMessage();
            Log::error('Row processing error: ' . $e->getMessage(), ['row' => $rowData ?? null, 'exception' => $e]);
        }
    }

    /**
     * Process raw punches by aggregating them per employee per day
     */
    protected function processAggregatedPunches($rawPunches)
    {
        // Group punches by employee and date
        $groupedPunches = [];
        
        Log::info('Processing ' . count($rawPunches) . ' raw punch records');
        
        foreach ($rawPunches as $index => $punchData) {
            Log::info("Processing punch record {$index}:", $punchData);
            
            // Skip empty rows or header rows
            $hasPersonId = !empty($punchData['Person ID']) && $punchData['Person ID'] !== 'Person ID';
            $hasPersonName = !empty($punchData['Person Name']) && strtolower((string) $punchData['Person Name']) !== 'person name';
            $hasPunchDate = !empty($punchData['Punch Date']) && $punchData['Punch Date'] !== 'Punch Date';

            Log::info("Record validation - Person ID: " . ($hasPersonId ? 'YES' : 'NO') . ", Person Name: " . ($hasPersonName ? 'YES' : 'NO') . ", Punch Date: " . ($hasPunchDate ? 'YES' : 'NO'));

            if (!$hasPersonId && !$hasPersonName && !$hasPunchDate) {
                Log::warning("Skipping record {$index} - no valid data found");
                $this->importResults['skipped']++;
                continue;
            }

            // Parse date and time
            $date = $this->parseDate($punchData['Punch Date']);
            $time = $this->parseTime($punchData['Attendance record']);
            
            if (!$date || !$time) {
                $this->importResults['failed']++;
                $this->importResults['errors'][] = "Invalid date or time format for Person ID: {$punchData['Person ID']}";
                continue;
            }

            // Create unique key for employee-date combination
            $personId = $punchData['Person ID'] ?? 'unknown';
            $dateKey = $date->format('Y-m-d');
            $key = "{$personId}_{$dateKey}";

            if (!isset($groupedPunches[$key])) {
                $groupedPunches[$key] = [
                    'person_id' => $personId,
                    'person_name' => $punchData['Person Name'] ?? null,
                    'date' => $date,
                    'punches' => [],
                    'verify_type' => $punchData['Verify Type'] ?? null,
                    'timezone' => $punchData['TimeZone'] ?? null,
                    'source' => $punchData['Source'] ?? null
                ];
            }

            // Add punch time to the group
            $groupedPunches[$key]['punches'][] = $time;
        }

        // Process each employee-date group
        foreach ($groupedPunches as $group) {
            $this->processEmployeeDayPunches($group);
        }
    }

    /**
     * Process punches for a single employee on a single day
     */
    protected function processEmployeeDayPunches($group)
    {
        try {
            // Find employee
            $employee = $this->findEmployeeByPersonId($group['person_id'], $group['person_name']);
            
            if (!$employee) {
                $this->importResults['failed']++;
                $this->importResults['errors'][] = "Employee not found (ID: {$group['person_id']}, Name: {$group['person_name']})";
                return;
            }

            // Sort punches by time to get first and last
            sort($group['punches']);
            $firstPunch = $group['punches'][0];
            $lastPunch = end($group['punches']);

            // Prepare attendance data
            $attendanceData = [
                'employee_id' => $employee->id,
                'employee_biometric_id' => $group['person_id'],
                'date' => $group['date']->format('Y-m-d'), // Ensure date is stored as Y-m-d format only
                'clock_in' => $firstPunch,
                'clock_out' => $lastPunch,
                'break_out' => null,
                'break_in' => null,
                'remarks' => $group['verify_type'] ?? $group['source'] ?? null,
                'total_hours' => $this->calculateWorkingHours($firstPunch, $lastPunch, null, null),
                'overtime_hours' => max(0, $this->calculateWorkingHours($firstPunch, $lastPunch, null, null) - 8),
                'undertime_hours' => max(0, 8 - $this->calculateWorkingHours($firstPunch, $lastPunch, null, null)),
                'status' => $this->determineStatusWithShift($employee, $group['date'], $firstPunch, $lastPunch, $this->calculateWorkingHours($firstPunch, $lastPunch, null, null))
            ];

            // Create or update attendance record
            $this->createOrUpdateAttendance($attendanceData);

            $this->importResults['success']++;
            Log::info('Attendance record imported successfully', [
                'employee_id' => $employee->id,
                'date' => $group['date'],
                'clock_in' => $firstPunch,
                'clock_out' => $lastPunch,
                'total_punches' => count($group['punches'])
            ]);

        } catch (Exception $e) {
            $this->importResults['failed']++;
            $this->importResults['errors'][] = "Error processing employee day punches: " . $e->getMessage();
            Log::error('Employee day processing error: ' . $e->getMessage(), ['group' => $group ?? null, 'exception' => $e]);
        }
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
     * Process punch data to create attendance records
     */
    protected function processPunchData($rowData, $employee, $date)
    {
        // Check if we have separate time-in and time-out columns
        $timeIn = $this->parseTime($rowData['time_in'] ?? null);
        $timeOut = $this->parseTime($rowData['time_out'] ?? null);
        
        // If no separate columns, use attendance_record as punch time
        if (!$timeIn && !$timeOut) {
            $punchTime = $this->parseTime($rowData['attendance_record']);
            if (!$punchTime) {
                return; // Skip invalid punch times
            }
            
            // Use updateOrCreate to handle duplicates properly
            $attendance = Attendance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'date' => $date->format('Y-m-d') // Ensure date is stored as Y-m-d format only
                ],
                [
                    'employee_biometric_id' => $rowData['person_id'] ?? $rowData['employee_id'] ?? null,
                    'remarks' => $rowData['status'] ?? $rowData['verify_type'] ?? null
                ]
            );

            // Determine if this is first punch (time-in) or last punch (time-out)
            if (!$attendance->clock_in) {
                // First punch of the day = time-in
                $attendance->clock_in = $punchTime;
            } else {
                // Subsequent punches = time-out (update if later)
                $currentClockOut = $attendance->clock_out ? Carbon::parse($attendance->clock_out) : null;
                $newPunchTime = Carbon::parse($punchTime);
                
                if (!$currentClockOut || $newPunchTime->gt($currentClockOut)) {
                    $attendance->clock_out = $punchTime;
                }
            }
        } else {
            // We have separate time-in and time-out columns
            $attendance = Attendance::updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'date' => $date->format('Y-m-d')
                ],
                [
                    'employee_biometric_id' => $rowData['person_id'] ?? $rowData['employee_id'] ?? null,
                    'clock_in' => $timeIn,
                    'clock_out' => $timeOut,
                    'remarks' => $rowData['status'] ?? $rowData['verify_type'] ?? null
                ]
            );
        }

        // Calculate total hours if both times are present
        if ($attendance->clock_in && $attendance->clock_out) {
            $attendance->total_hours = $this->calculateWorkingHours(
                $attendance->clock_in->format('H:i:s'),
                $attendance->clock_out->format('H:i:s')
            );
            $attendance->overtime_hours = max(0, $attendance->total_hours - 8);
            $attendance->undertime_hours = max(0, 8 - $attendance->total_hours);
        }

        // Determine status using enhanced logic
        $attendance->status = $this->determineEnhancedStatus(
            $employee,
            $date,
            $attendance->clock_in?->format('H:i:s'),
            $attendance->clock_out?->format('H:i:s'),
            $attendance->total_hours ?? 0,
            $rowData['status'] ?? null
        );

        $attendance->save();
    }

    /**
     * Determine enhanced attendance status with comprehensive logic
     */
    protected function determineEnhancedStatus($employee, $date, $clockIn, $clockOut, $totalHours, $importedStatus = null)
    {
        // If status is provided in the import, try to use it first
        if ($importedStatus) {
            $normalizedStatus = $this->normalizeStatusFromFile($importedStatus);
            if ($normalizedStatus) {
                return $normalizedStatus;
            }
        }

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

        // Check if late (after shift start time + grace period)
        $shiftStart = Carbon::parse($shift->start_time);
        $clockInTime = Carbon::parse($clockIn);
        $gracePeriod = 15; // 15 minutes grace period
        
        if ($clockInTime->gt($shiftStart->addMinutes($gracePeriod))) {
            // Check if also undertime
            if ($totalHours < 8) {
                return 'Late (Undertime)';
            }
            // Check if overtime
            if ($totalHours > 8) {
                return 'Late (Overtime)';
            }
            return 'Late';
        }

        // Check if undertime (less than 8 hours)
        if ($totalHours < 8) {
            return 'Undertime';
        }

        // Check if overtime (more than 8 hours)
        if ($totalHours > 8) {
            return 'Overtime';
        }

        return 'Present';
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

        // Check if late (after shift start time)
        $shiftStart = Carbon::parse($shift->start_time);
        $clockInTime = Carbon::parse($clockIn);
        
        if ($clockInTime->gt($shiftStart->addMinutes(15))) { // 15 minutes grace period
            return 'Late';
        }

        // Check if undertime (less than 8 hours)
        if ($totalHours < 8) {
            return 'Present'; // Still present but undertime
        }

        return 'Present';
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

            // Handle Excel time serials (fraction of a day)
            if (is_numeric($timeString)) {
                $secondsInDay = 24 * 60 * 60;
                $totalSeconds = (int) round(((float) $timeString - floor((float) $timeString)) * $secondsInDay);
                // Normalize to 0..86399
                $totalSeconds = ($totalSeconds % $secondsInDay + $secondsInDay) % $secondsInDay;
                $hours = floor($totalSeconds / 3600);
                $minutes = floor(($totalSeconds % 3600) / 60);
                $seconds = $totalSeconds % 60;
                return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
            }

            return Carbon::parse((string) $timeString)->format('H:i:s');
        } catch (Exception $e) {
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

        if ($clockInTime->gt($standardTime)) {
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
            'skipped' => 0
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
                $rows = $worksheet->toArray();
                
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
            'verify_type' => 'Verify Type (Legacy)',
            'total_hours' => 'Total Hours',
            'timezone' => 'TimeZone (Legacy)',
            'source' => 'Source (Legacy)'
        ];
    }
}