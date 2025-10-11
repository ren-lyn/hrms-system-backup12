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

                // Process each data row
                for ($i = 1; $i < count($rows); $i++) {
                    $rowData = [];
                    foreach ($headers as $index => $header) {
                        $rowData[$header] = $rows[$i][$index] ?? '';
                    }
                    $this->processRow((object) $rowData);
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

            // Process the row
            $this->processRow((object) $rowData);
            $rowIndex++;
        }

        fclose($file);
        
        // Update import record with results
        $this->updateImportRecord();
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
            
            // Skip empty rows or header rows
            $hasBiometricId = !empty($rowData['biometric_id']) && $rowData['biometric_id'] !== 'Biometric ID';
            $hasEmployeeId = !empty($rowData['employee_id']) && $rowData['employee_id'] !== 'Employee ID';
            $hasEmployeeName = !empty($rowData['employee_name']) && strtolower((string) $rowData['employee_name']) !== 'employee name';

            if (!$hasBiometricId && !$hasEmployeeId && !$hasEmployeeName) {
                $this->importResults['skipped']++;
                return;
            }

            // Find employee by biometric ID or employee ID
            $employee = $this->findEmployee($rowData);
            
            if (!$employee) {
                $this->importResults['failed']++;
                $identifier = $rowData['biometric_id'] ?? $rowData['employee_id'] ?? 'Unknown';
                $nameForMsg = isset($rowData['employee_name']) ? (string) $rowData['employee_name'] : 'N/A';
                $this->importResults['errors'][] = "Employee not found (ID: {$identifier}, Name: {$nameForMsg})";
                Log::warning('Employee not found during import', [
                    'biometric_id' => $rowData['biometric_id'] ?? null,
                    'employee_id' => $rowData['employee_id'] ?? null,
                    'employee_name' => $rowData['employee_name'] ?? null,
                    'row_data' => $rowData
                ]);
                return;
            }

            // Parse and validate date
            $date = $this->parseDate($rowData['date']);
            if (!$date) {
                $this->importResults['failed']++;
                $this->importResults['errors'][] = "Invalid date format for Biometric ID: {$rowData['biometric_id']}";
                return;
            }

            // Create or update attendance record
            $attendanceData = $this->prepareAttendanceData($rowData, $employee, $date);
            $this->createOrUpdateAttendance($attendanceData);

            $this->importResults['success']++;
            Log::info('Attendance record imported successfully', [
                'employee_id' => $employee->id,
                'date' => $date,
                'status' => $attendanceData['status']
            ]);
            
        } catch (Exception $e) {
            $this->importResults['failed']++;
            $this->importResults['errors'][] = "Error processing row: " . $e->getMessage();
            Log::error('Row processing error: ' . $e->getMessage(), ['row' => $rowData ?? null, 'exception' => $e]);
        }
    }

    /**
     * Find employee by biometric ID or fallback to employee_id
     */
    protected function findEmployee($rowData)
    {
        $biometricId = $rowData['biometric_id'] ?? null;
        $employeeId = $rowData['employee_id'] ?? null;
        $employeeName = $rowData['employee_name'] ?? null;
        // Handle common misspelling/variant of position key
        if (!isset($rowData['position']) && isset($rowData['postion'])) {
            $rowData['position'] = $rowData['postion'];
        }

        if ($biometricId) {
            // First try to find by biometric_id in existing attendance records
            $attendance = Attendance::where('employee_biometric_id', $biometricId)->first();
            if ($attendance && $attendance->employee) {
                return $attendance->employee;
            }
            
            // Try to match biometric_id with employee profile ID or other fields
            $employee = EmployeeProfile::where('id', $biometricId)
                ->orWhere('sss', 'LIKE', "%{$biometricId}%")
                ->first();
            
            if ($employee) {
                return $employee;
            }
        }

        if ($employeeId) {
            return EmployeeProfile::find($employeeId);
        }

        // Fallback: try match by employee name (handles "First Middle Last" and "Last, First [Middle]")
        if ($employeeName) {
            $fullName = trim(preg_replace('/\s+/', ' ', (string) $employeeName));
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

            // Handle Excel serial numbers (numeric values)
            if (is_numeric($dateString)) {
                // Excel's serialized date starts at 1899-12-30 for PhpSpreadsheet's helper
                // Using PhpSpreadsheet to avoid off-by-one across leap-year edge cases
                $excelEpoch = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject((float) $dateString);
                return Carbon::instance($excelEpoch)->format('Y-m-d');
            }

            // Try different date formats
            $formats = [
                'Y-m-d',
                'm/d/Y',
                'd/m/Y',
                'Y-m-d H:i:s',
                'm/d/Y H:i:s'
            ];

            foreach ($formats as $format) {
                $date = Carbon::createFromFormat($format, $dateString);
                if ($date !== false) {
                    return $date->format('Y-m-d');
                }
            }

            // Try Carbon's flexible parsing as last resort
            return Carbon::parse($dateString)->format('Y-m-d');
            
        } catch (Exception $e) {
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
        $clockIn = $this->parseTime($rowData['clock_in'] ?? $rowData['time_in'] ?? null);
        $clockOut = $this->parseTime($rowData['clock_out'] ?? $rowData['time_out'] ?? null);
        $breakOut = $this->parseTime($rowData['break_out'] ?? $rowData['lunch_out'] ?? null);
        $breakIn = $this->parseTime($rowData['break_in'] ?? $rowData['lunch_in'] ?? null);

        $data = [
            'employee_id' => $employee->id,
            'employee_biometric_id' => $rowData['biometric_id'] ?? $rowData['employee_id'] ?? null,
            'date' => $date,
            'clock_in' => $clockIn,
            'clock_out' => $clockOut,
            'break_out' => $breakOut,
            'break_in' => $breakIn,
            'remarks' => $rowData['remarks'] ?? $rowData['notes'] ?? null,
        ];

        // Calculate total hours if times are available
        if ($clockIn && $clockOut) {
            $data['total_hours'] = $this->calculateWorkingHours($clockIn, $clockOut, $breakOut, $breakIn);
            $data['overtime_hours'] = max(0, $data['total_hours'] - 8);
            $data['undertime_hours'] = max(0, 8 - $data['total_hours']);
        }

        // Status precedence: explicit status from file (normalized) > holiday_type inference > contextual determination
        if (!empty($rowData['status'])) {
            $data['status'] = $this->normalizeStatusFromFile((string) $rowData['status'], $rowData['holiday_type'] ?? null, $clockIn, $clockOut);
        } elseif (!empty($rowData['holiday_type'])) {
            // If holiday_type provided, decide based on presence of time
            if (!$clockIn && !$clockOut) {
                $data['status'] = 'Holiday (No Work)';
            } else {
                $data['status'] = 'Holiday (Worked)';
            }
        } else {
            $data['status'] = $this->determineStatusWithContext($employee->id, $date, $clockIn, $clockOut, $data['total_hours'] ?? 0);
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
                $candidates = ['date', 'attendance_date', 'work_date'];
                $dateIndex = null;
                foreach ($candidates as $cand) {
                    $idx = array_search($cand, $normalizedHeaders, true);
                    if ($idx !== false) { $dateIndex = $idx; break; }
                }
                
                while (($data = fgetcsv($file, 1000, ",")) !== false) {
                    if ($dateIndex !== null && isset($data[$dateIndex]) && $data[$dateIndex] !== '') {
                        $date = $this->parseDate($data[$dateIndex]);
                        if ($date) {
                            $dates[] = $date;
                        }
                    }
                }
                fclose($file);
            } else {
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                $rows = $worksheet->toArray();
                
                if (count($rows) > 1) {
                    $headers = $rows[0];
                    $normalizedHeaders = array_map(function($h) {
                        return strtolower(str_replace([' ', '-'], '_', trim((string) $h)));
                    }, $headers);
                    $candidates = ['date', 'attendance_date', 'work_date'];
                    $dateIndex = null;
                    foreach ($candidates as $cand) {
                        $idx = array_search($cand, $normalizedHeaders, true);
                        if ($idx !== false) { $dateIndex = $idx; break; }
                    }
                    
                    for ($i = 1; $i < count($rows); $i++) {
                        if ($dateIndex !== null && isset($rows[$i][$dateIndex]) && $rows[$i][$dateIndex] !== '') {
                            $date = $this->parseDate($rows[$i][$dateIndex]);
                            if ($date) {
                                $dates[] = $date;
                            }
                        }
                    }
                }
            }

            if (empty($dates)) {
                return null;
            }

            sort($dates);
            return [
                'period_start' => $dates[0],
                'period_end' => end($dates),
                'total_dates' => count($dates)
            ];
        } catch (Exception $e) {
            Log::error('Period detection error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get expected Excel headers
     */
    public static function getExpectedHeaders()
    {
        return [
            'employee_name' => 'Employee Name',
            'position' => 'Position (Optional)',
            'department' => 'Department (Optional)',
            'date' => 'Date',
            'day' => 'Day (Optional)',
            'time_in' => 'Time-In',
            'time_out' => 'Time-Out',
            'status' => 'Status (Optional)',
            'holiday_type' => 'Holiday Type (Optional)',
            'break_out' => 'Break Out (Optional)',
            'break_in' => 'Break In (Optional)',
            'remarks' => 'Remarks (Optional)',
            'biometric_id' => 'Biometric ID (Optional)',
            'employee_id' => 'Employee ID (Optional)'
        ];
    }
}