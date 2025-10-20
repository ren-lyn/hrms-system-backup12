# Attendance Status Logic Update

## Overview
Updated the attendance status determination logic to correctly identify Present, Late, and Overtime statuses based on actual clock in/out times rather than total hours worked.

## Update Date
October 19, 2025

## Problem Fixed
**Previous Issue**: The system was marking employees as "Undertime" even when they clocked in and out on time, because it was checking total hours worked (which might be less than 8 hours due to breaks or calculation differences).

**Solution**: Changed the logic to:
1. Mark as **Present** when employees clock in and out on time
2. Mark as **Overtime** only when clock out time is **6 PM (18:00) or later**
3. Removed the undertime status based on total hours

## New Status Determination Logic

### Status Priority

1. **Holiday Check** (if Holiday Type column or system holiday)
   - With clock in: `Holiday (Worked)`
   - Without clock in: `Holiday (No Work)`

2. **Leave Check** (if approved leave exists)
   - Status: `On Leave`

3. **Absent Check** (if no clock in or clock out)
   - Status: `Absent`

4. **Late & Overtime Combination**
   - Clock in > Shift Start + 15 min grace period
   - Clock out >= 6:00 PM
   - Status: `Late (Overtime)`

5. **Late Only**
   - Clock in > Shift Start + 15 min grace period
   - Clock out < 6:00 PM
   - Status: `Late`

6. **Overtime Only**
   - Clock in <= Shift Start + 15 min grace period
   - Clock out >= 6:00 PM
   - Status: `Overtime`

7. **Present** (default for on-time attendance)
   - Clock in <= Shift Start + 15 min grace period
   - Clock out < 6:00 PM
   - Status: `Present`

## Examples

### Example 1: On-Time, Regular Hours
```
Shift: 8:00 AM - 5:00 PM
Clock In: 8:00 AM
Clock Out: 5:00 PM
Status: Present ✓
```

### Example 2: On-Time, With Overtime
```
Shift: 8:00 AM - 5:00 PM
Clock In: 8:00 AM
Clock Out: 6:30 PM
Status: Overtime ✓
```

### Example 3: Late, Regular Hours
```
Shift: 8:00 AM - 5:00 PM
Clock In: 8:30 AM (late by 30 min)
Clock Out: 5:00 PM
Status: Late ✓
```

### Example 4: Late, With Overtime
```
Shift: 8:00 AM - 5:00 PM
Clock In: 8:30 AM (late by 30 min)
Clock Out: 6:30 PM
Status: Late (Overtime) ✓
```

### Example 5: On-Time, Left Early (Previously showed Undertime)
```
Shift: 8:00 AM - 5:00 PM
Clock In: 8:00 AM
Clock Out: 4:30 PM
Status: Present ✓ (Now correctly marked as Present)
```

## Key Changes

### Before
- Status was based on **total hours worked**
- Employees with < 8 hours = "Undertime"
- Employees with > 8 hours = "Overtime"
- This caused issues when breaks or time calculations resulted in slightly less than 8 hours

### After
- Status is based on **actual clock in/out times**
- Clock in after grace period = "Late"
- Clock out at 6 PM or later = "Overtime"
- On-time clock in/out = "Present" (regardless of total hours)

## Overtime Threshold

**Overtime is determined by clock out time:**
- Clock out **before 6:00 PM** → Not overtime
- Clock out **at or after 6:00 PM** → Overtime

This is a fixed threshold that applies to all employees regardless of their shift.

## Grace Period

**15 minutes grace period** for clock in:
- Shift starts at 8:00 AM
- Grace period until 8:15 AM
- Clock in at 8:16 AM or later = Late

## Modified Files

1. **`app/Services/AttendanceImportService.php`**
   - Updated `determineEnhancedStatus()` method
   - Updated `determineStatusWithShift()` method
   - Updated `determineStatus()` method

## Benefits

1. **Accurate Status**: Employees are correctly marked as Present when they work their shift
2. **Clear Overtime**: Overtime is based on actual end time (6 PM threshold)
3. **No False Undertime**: Removed incorrect undertime status based on total hours
4. **Consistent Logic**: All status determination methods use the same logic

## Testing Scenarios

### Test Case 1: Regular Day
```
Input:
- Clock In: 08:00
- Clock Out: 17:00
Expected: Present
```

### Test Case 2: Overtime Day
```
Input:
- Clock In: 08:00
- Clock Out: 18:30
Expected: Overtime
```

### Test Case 3: Late Arrival
```
Input:
- Clock In: 08:20
- Clock Out: 17:00
Expected: Late
```

### Test Case 4: Late with Overtime
```
Input:
- Clock In: 08:20
- Clock Out: 18:30
Expected: Late (Overtime)
```

### Test Case 5: Early Leave (Previously Problematic)
```
Input:
- Clock In: 08:00
- Clock Out: 16:30
Expected: Present (No longer marked as Undertime)
```

## Important Notes

1. **Total Hours Still Calculated**: The system still calculates total hours, overtime hours, and undertime hours for payroll purposes, but these don't affect the status determination.

2. **Break Time**: Break time is subtracted from total hours calculation but doesn't affect status.

3. **Shift-Based**: Late detection is based on the employee's shift start time, not a fixed time.

4. **Overtime Threshold**: The 6 PM overtime threshold is currently fixed. If you need different overtime rules per shift, this can be customized.

## Future Enhancements

Potential improvements:
1. Configurable overtime threshold per shift
2. Different grace periods per employee or shift
3. Undertime status based on early clock out (if needed)
4. Half-day status for significant early departures

## Backward Compatibility

This change affects how statuses are determined during import. Existing attendance records are not affected. New imports will use the updated logic.
