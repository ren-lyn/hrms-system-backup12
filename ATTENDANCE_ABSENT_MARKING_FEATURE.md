# Attendance Absent Marking Feature

## Overview
This feature automatically marks employees as absent when they don't have attendance records in the imported attendance file for the specified period.

## Implementation Date
October 19, 2025

## How It Works

### 1. Import Flow
When an HR Assistant imports an attendance record:
1. The system processes all attendance records from the uploaded file
2. After processing, it compares the imported records against all active employees
3. For each employee who doesn't have an attendance record for a working day in the import period, the system automatically creates an attendance record with status "Absent"

### 2. Smart Status Detection
The system intelligently determines the correct status based on:

- **Working Days**: Only marks employees as absent on their scheduled working days (based on their shift)
- **Holidays**: If the date is a holiday, marks as "Holiday (No Work)" instead of "Absent"
- **Approved Leaves**: If the employee has an approved leave request for that date, marks as "On Leave" instead of "Absent"
- **Non-Working Days**: Does not create records for days that are not in the employee's working schedule

### 3. Employee Filtering
The system only processes active employees:
- Excludes applicants (role_id = 5)
- Only includes employees with valid employee profiles
- Considers all employees who should be working during the import period

## Technical Details

### Modified Files

#### Backend
1. **`app/Services/AttendanceImportService.php`**
   - Added `markAbsentEmployees()` method
   - Updated `importFromExcel()` to call absent marking after processing imports
   - Added `absent_marked` field to import results tracking
   - Updated `resetResults()` method

2. **`app/Http/Controllers/Api/AttendanceController.php`**
   - Updated import response to include `absent_marked` count

#### Frontend
3. **`src/components/HrAssistant/AttendanceDashboard.js`**
   - Updated import success message to display count of employees marked as absent

### Key Method: `markAbsentEmployees()`

```php
protected function markAbsentEmployees($periodStart, $periodEnd)
{
    // 1. Get all active employees (exclude applicants)
    // 2. Generate all dates in the import period
    // 3. For each employee and each date:
    //    - Check if attendance record exists
    //    - If not, check if it's a working day
    //    - Determine appropriate status (Absent/Holiday/On Leave)
    //    - Create attendance record with status
    // 4. Track count of absent records created
}
```

### Database Impact
- Creates new `attendances` records with:
  - `employee_id`: The employee's ID
  - `date`: The date they were absent
  - `status`: "Absent", "Holiday (No Work)", or "On Leave"
  - `clock_in`, `clock_out`: NULL
  - `total_hours`: 0
  - `remarks`: "Auto-marked during import"

## Usage Example

### Before Import
- File contains attendance for 50 out of 100 employees
- Import period: October 14-18, 2025 (5 working days)

### After Import
- 50 employees have attendance records from the file
- 50 employees are automatically marked as absent for each working day they're missing
- If an employee has approved leave on Oct 16, they're marked "On Leave" instead of "Absent"
- If Oct 17 is a holiday, employees are marked "Holiday (No Work)" instead of "Absent"

### Import Summary
```
Import completed successfully!

Imported: 250
Failed: 0
Skipped: 5
Marked as Absent: 245
```

## Benefits

1. **Complete Attendance Records**: Ensures every employee has an attendance record for every working day
2. **Accurate Reporting**: Makes it easy to identify who was absent vs. who was present
3. **Automated Process**: Eliminates manual work of marking absences
4. **Smart Detection**: Respects holidays, leaves, and shift schedules
5. **Audit Trail**: All auto-marked records include a remark indicating they were auto-generated

## Configuration

No additional configuration is required. The feature automatically activates when:
- An attendance file is imported
- The import includes `period_start` and `period_end` dates

## Logging

The system logs detailed information about the absent marking process:
- Total active employees processed
- Total dates in the period
- Each employee marked as absent with their status
- Total absent records created
- Any errors encountered during the process

Check Laravel logs for detailed information:
```
storage/logs/laravel.log
```

## Future Enhancements

Potential improvements for future versions:
1. Option to enable/disable auto-absent marking
2. Configurable status for auto-marked records
3. Bulk edit capability for auto-marked absences
4. Email notifications to employees marked as absent
5. Integration with biometric device data to verify absences
