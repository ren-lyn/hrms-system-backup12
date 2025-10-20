# Holiday Type Column Guide

## Overview
The attendance import system now supports a **"Holiday Type"** column in Excel/CSV files. This column allows you to explicitly mark specific dates as holidays during the import process.

## Implementation Date
October 19, 2025

## How to Use

### Excel/CSV File Format

Add a column named **"Holiday Type"** (case-insensitive) to your attendance import file. The system will recognize any of these variations:
- `Holiday Type`
- `holiday_type`
- `HOLIDAY TYPE`
- `holiday type`

### Column Behavior

#### When Holiday Type is Specified
If the "Holiday Type" column contains any value (not empty), the system will:
1. Mark the date as a holiday
2. Determine the status based on whether the employee worked:
   - **If clock_in/time_in exists**: Status = `Holiday (Worked)`
   - **If no clock_in/time_in**: Status = `Holiday (No Work)`

#### When Holiday Type is Empty
If the "Holiday Type" column is empty or not provided:
- The system falls back to checking the holidays table in the database
- Normal status determination logic applies (Present, Absent, Late, etc.)

### Example Excel File

| Employee ID | Name | Date | Time-in | Time-out | Holiday Type | Status |
|-------------|------|------|---------|----------|--------------|--------|
| 1001 | John Doe | 2025-10-15 | 08:00 | 17:00 | | Present |
| 1001 | John Doe | 2025-10-16 | | | Regular Holiday | Holiday (No Work) |
| 1001 | John Doe | 2025-10-17 | 08:00 | 17:00 | Special Holiday | Holiday (Worked) |
| 1002 | Jane Smith | 2025-10-16 | 08:00 | 17:00 | Regular Holiday | Holiday (Worked) |

### Holiday Type Values

You can use any value in the Holiday Type column. Common examples:
- `Regular Holiday`
- `Special Holiday`
- `Special Non-Working Holiday`
- `Legal Holiday`
- `Company Holiday`
- `RH` (Regular Holiday)
- `SH` (Special Holiday)
- Or any custom text

**Note**: The actual value doesn't affect the status determination. The system only checks if the column has any value (not empty) to identify it as a holiday.

## Status Priority Logic

The system determines attendance status in this order:

1. **Imported Status Column** (if provided and valid)
   - Uses the status from the "Status" column if present

2. **Holiday Type Column** (if provided and not empty)
   - Marks as `Holiday (Worked)` or `Holiday (No Work)`

3. **System Holiday Check** (from holidays table)
   - Checks if the date is registered as a holiday in the system

4. **Approved Leave Check**
   - Checks if employee has approved leave for that date

5. **Normal Status Determination**
   - Present, Late, Absent, Undertime, Overtime, etc.

## Benefits

1. **Flexibility**: Mark holidays on-the-fly without updating the holidays table
2. **Override System Holidays**: Can mark specific dates as holidays even if not in the system
3. **Per-Employee Holidays**: Different employees can have different holiday types on the same date
4. **Audit Trail**: The holiday type value is preserved in the system for reference

## Technical Details

### Modified Files
- `app/Services/AttendanceImportService.php`
  - Updated `processAggregatedPunchData()` to capture holiday_type
  - Updated `processEmployeeDayPunchGroup()` to pass holiday_type
  - Updated `determineEnhancedStatus()` to check holiday_type
  - Updated `getExpectedHeaders()` to include holiday_type

### Database Storage
The holiday type value itself is not stored in the database. The system uses it during import to determine the attendance status, which is then stored in the `status` field of the `attendances` table.

## Example Scenarios

### Scenario 1: Regular Working Day
```
Date: 2025-10-15
Holiday Type: (empty)
Time-in: 08:00
Time-out: 17:00
Result: Status = "Present"
```

### Scenario 2: Holiday - Employee Did Not Work
```
Date: 2025-10-16
Holiday Type: "Regular Holiday"
Time-in: (empty)
Time-out: (empty)
Result: Status = "Holiday (No Work)"
```

### Scenario 3: Holiday - Employee Worked
```
Date: 2025-10-16
Holiday Type: "Special Holiday"
Time-in: 08:00
Time-out: 17:00
Result: Status = "Holiday (Worked)"
```

### Scenario 4: Status Column Takes Priority
```
Date: 2025-10-17
Holiday Type: "Regular Holiday"
Status: "On Leave"
Time-in: (empty)
Time-out: (empty)
Result: Status = "On Leave" (Status column takes priority)
```

## Best Practices

1. **Consistency**: Use consistent holiday type values across your organization
2. **Documentation**: Document what each holiday type code means
3. **Validation**: Verify the imported data after upload to ensure correct status assignment
4. **Backup**: Keep a copy of your original import file for reference

## Troubleshooting

### Issue: Holiday Type not being recognized
**Solution**: Ensure the column header is exactly "Holiday Type" (case-insensitive, spaces/dashes converted to underscores internally)

### Issue: Status not showing as Holiday
**Solution**: Check that:
1. The Holiday Type column has a value (not empty)
2. The column header is spelled correctly
3. Check the import logs for any errors

### Issue: Wrong holiday status
**Solution**: 
- If employee worked but shows "Holiday (No Work)", check that Time-in/clock_in has a value
- If employee didn't work but shows "Holiday (Worked)", check that Time-in/clock_in is empty

## API Response

After import, the response includes the holiday information in the attendance records:

```json
{
  "success": true,
  "message": "Import completed successfully",
  "data": {
    "imported": 150,
    "failed": 0,
    "skipped": 5,
    "absent_marked": 50
  }
}
```

## Backward Compatibility

The Holiday Type column is **optional**. Existing import files without this column will continue to work as before. The system will use the holidays table and normal status determination logic.
