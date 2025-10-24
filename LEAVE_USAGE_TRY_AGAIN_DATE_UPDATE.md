# Leave Usage Indicator - "Try Again On [Date]" Feature

## Update Summary
Enhanced the leave usage indicator to display "**3/3**" when all leave requests are used and show a specific date when the employee can file their next leave request.

## What Changed

### Before
When an employee used all 3 leave requests:
- Display: "0/3 Leave Requests Used This Year"
- Message: "You have used all leave requests for this year"
- No information about when they can file again

### After
When an employee uses all 3 leave requests:
- Display: "**3/3 Leave Requests Used This Year**"
- Message: "You have used all leave requests for this year. **Try again on [Date]**"
- Clear guidance on next available filing date

## Next Available Date Logic

The system intelligently calculates the next available date based on two rules:

### 1. 7-Day Waiting Period Rule
If the employee has a recent leave that ended within the last 7 days:
- **Calculation:** Last leave end date + 8 days (7 full waiting days + 1)
- **Example:** If last leave ended on October 23, 2025 → Can file on October 31, 2025
- **Display:** "Try again on **October 31, 2025**"

### 2. Yearly Limit Rule
If the employee has used all 3 leave requests for the year:
- **Calculation:** January 1 of next year
- **Example:** If 3 leaves used in 2025 → Can file on January 1, 2026
- **Display:** "Try again on **January 1, 2026**"

### 3. Priority Logic
The system shows whichever date comes first:
- If waiting period applies AND yearly limit reached → Shows waiting period date
- If only yearly limit reached → Shows January 1 of next year
- If neither applies → No restriction message (null)

## Implementation Details

### Backend Changes
**File:** `hrms-backend/app/Http/Controllers/Api/LeaveRequestController.php`

**Method:** `getLeaveSummary()`

**Added Code:**
```php
// Calculate leave instances (yearly limit tracking)
$yearlyRequestCount = LeaveRequest::where('employee_id', $user->id)
    ->whereYear('created_at', $currentYear)
    ->count();

$remainingRequests = max(0, 3 - $yearlyRequestCount);

// Determine next available filing date
$nextAvailableDate = null;
$lastLeave = LeaveRequest::where('employee_id', $user->id)
    ->whereIn('status', ['pending', 'manager_approved', 'approved'])
    ->orderBy('to', 'desc')
    ->first();
    
if ($lastLeave) {
    $lastLeaveEndDate = Carbon::parse($lastLeave->to);
    $waitUntilDate = $lastLeaveEndDate->copy()->addDays(8); // 7 full waiting days + 1
    $today = Carbon::now()->startOfDay();
    
    // Only set next available date if still in waiting period
    if ($today->lt($waitUntilDate->startOfDay())) {
        $nextAvailableDate = $waitUntilDate->format('F j, Y');
    }
}

// If all 3 leaves used, next available is next year
if ($yearlyRequestCount >= 3 && !$nextAvailableDate) {
    $nextYear = Carbon::create($currentYear + 1, 1, 1);
    $nextAvailableDate = $nextYear->format('F j, Y');
}
```

**Response Structure:**
```json
{
  "leave_instances": {
    "total_allowed": 3,
    "used": 3,
    "remaining": 0,
    "next_available_date": "January 1, 2026"
  }
}
```

### Frontend Changes
**File:** `hrms-frontend/src/components/Employee/EmbeddedLeaveForm.js`

**Updated Code:**
```jsx
{leaveSummary?.leave_instances?.remaining === 0 && leaveSummary?.leave_instances?.next_available_date && (
  <span className="status-text">
    You have used all leave requests for this year. Try again on <strong>{leaveSummary.leave_instances.next_available_date}</strong>
  </span>
)}
```

## Visual Examples

### Example 1: Waiting Period Active
**Scenario:**
- Employee used 2 leaves
- Last leave ended: October 23, 2025
- Today: October 25, 2025

**Display:**
```
⚠ 2/3 Leave Requests Used This Year
   You have 1 leave request remaining
```

### Example 2: 3 Leaves Used, Waiting Period Active
**Scenario:**
- Employee used 3 leaves
- Last leave ended: October 23, 2025
- Today: October 25, 2025

**Display:**
```
✕ 3/3 Leave Requests Used This Year
   You have used all leave requests for this year. Try again on October 31, 2025
```

### Example 3: 3 Leaves Used, No Waiting Period
**Scenario:**
- Employee used 3 leaves
- Last leave ended: September 1, 2025
- Today: October 23, 2025

**Display:**
```
✕ 3/3 Leave Requests Used This Year
   You have used all leave requests for this year. Try again on January 1, 2026
```

## User Benefits

### Clear Expectations
✅ Employees know exactly when they can file their next leave  
✅ No guessing or manual calculation required  
✅ Reduces confusion about leave restrictions

### Better Planning
✅ Employees can plan ahead for future leave requests  
✅ Prevents unnecessary attempts to file when restricted  
✅ Improves user experience and reduces frustration

### Transparency
✅ System is transparent about leave limitations  
✅ Clear communication of rules (7-day waiting, yearly limit)  
✅ Builds trust in the system

## Testing Scenarios

### Test 1: First Leave of the Year
- **Action:** Employee has 0 leaves used
- **Expected:** Green indicator, "0/3 Leave Requests Used This Year"
- **Expected:** "You have 3 leave requests remaining"
- **Expected:** No "Try again" message

### Test 2: Third Leave Filed, Still in Waiting Period
- **Setup:** Employee files 3rd leave ending on October 23, 2025
- **Action:** Check on October 25, 2025 (2 days after)
- **Expected:** Red indicator, "3/3 Leave Requests Used This Year"
- **Expected:** "Try again on October 31, 2025"

### Test 3: Third Leave Filed, Waiting Period Passed
- **Setup:** Employee filed 3rd leave ending on September 1, 2025
- **Action:** Check on October 23, 2025 (52 days after)
- **Expected:** Red indicator, "3/3 Leave Requests Used This Year"
- **Expected:** "Try again on January 1, 2026"

### Test 4: New Year Reset
- **Setup:** Employee used 3 leaves in 2025
- **Action:** Check on January 1, 2026
- **Expected:** Green indicator, "0/3 Leave Requests Used This Year"
- **Expected:** "You have 3 leave requests remaining"

## Files Modified

### Backend
1. `hrms-backend/app/Http/Controllers/Api/LeaveRequestController.php`
   - Added leave_instances calculation
   - Added next_available_date logic
   - Updated getLeaveSummary() response

### Frontend
1. `hrms-frontend/src/components/Employee/EmbeddedLeaveForm.js`
   - Updated status message for 3/3 scenario
   - Added conditional display for next_available_date

### Documentation
1. `LEAVE_USAGE_INDICATOR_IMPLEMENTATION.md`
   - Updated with new "Try again on" feature
   - Added backend logic documentation
   - Updated test cases

## Summary

✅ **Shows "3/3"** when all leaves used  
✅ **Displays next filing date** based on waiting period or yearly reset  
✅ **Smart date calculation** handles multiple scenarios  
✅ **Improved user experience** with clear guidance  
✅ **No breaking changes** to existing functionality  

This enhancement provides employees with actionable information, reducing confusion and improving their ability to plan future leave requests effectively.

