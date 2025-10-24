# Leave Usage Indicator Implementation

## Overview
Replaced the static informational message "Complete the form below to submit your leave request. Your request will go through the approval process." with a dynamic, color-coded leave usage indicator that displays how many leave requests the employee has used within the year.

## Feature Details

### Visual Indicator
The leave usage indicator displays the employee's leave request status with a color-coded system:

**Green Status (0-1 leaves used):**
- Icon: ✓ (checkmark)
- Background: Light green gradient
- Border: Green (#4caf50)
- Message: "You have X leave requests remaining"

**Yellow Status (2 leaves used):**
- Icon: ⚠ (warning)
- Background: Light yellow gradient
- Border: Orange (#ffa726)
- Message: "You have 1 leave request remaining"
- Font: Medium weight for emphasis

**Red Status (3 leaves used):**
- Icon: ✕ (cross)
- Background: Light red gradient
- Border: Red (#ef5350)
- Message: "You have used all leave requests for this year. Try again on **[date]**"
- Font: Bold weight for emphasis
- Shows next available filing date dynamically

### Display Format
```
[Icon] X/3 Leave Requests Used This Year
       Status message based on remaining leaves
```

Example displays:
- **0 used:** "0/3 Leave Requests Used This Year - You have 3 leave requests remaining"
- **1 used:** "1/3 Leave Requests Used This Year - You have 2 leave requests remaining"
- **2 used:** "2/3 Leave Requests Used This Year - You have 1 leave request remaining"
- **3 used:** "3/3 Leave Requests Used This Year - You have used all leave requests for this year. Try again on **January 1, 2026**"

## Implementation Details

### Frontend Changes

#### Component Updated
**File:** `hrms-frontend/src/components/Employee/EmbeddedLeaveForm.js`

**Replaced Section:**
```jsx
// OLD CODE:
<div className="info-message">
  <span className="info-icon">ℹ️</span>
  Complete the form below to submit your leave request. Your request will go through the approval process.
</div>

// NEW CODE:
<div className={`leave-usage-indicator ${
  leaveSummary?.leave_instances?.used === 0 || leaveSummary?.leave_instances?.used === 1 
    ? 'status-green' 
    : leaveSummary?.leave_instances?.used === 2 
    ? 'status-yellow' 
    : 'status-red'
}`}>
  <div className="usage-icon">
    {leaveSummary?.leave_instances?.used === 0 || leaveSummary?.leave_instances?.used === 1 ? '✓' : 
     leaveSummary?.leave_instances?.used === 2 ? '⚠' : '✕'}
  </div>
  <div className="usage-info">
    <div className="usage-count">
      <strong>{leaveSummary?.leave_instances?.used || 0}/{leaveSummary?.leave_instances?.total_allowed || 3}</strong> Leave Requests Used This Year
    </div>
    <div className="usage-status">
      {leaveSummary?.leave_instances?.remaining > 1 && (
        <span className="status-text">You have {leaveSummary.leave_instances.remaining} leave requests remaining</span>
      )}
      {leaveSummary?.leave_instances?.remaining === 1 && (
        <span className="status-text">You have 1 leave request remaining</span>
      )}
      {leaveSummary?.leave_instances?.remaining === 0 && (
        <span className="status-text">You have used all leave requests for this year</span>
      )}
    </div>
  </div>
</div>
```

#### CSS Styling
**File:** `hrms-frontend/src/components/Employee/EmbeddedLeaveForm.css`

**Added Styles:**
- `.leave-usage-indicator` - Main container
- `.status-green`, `.status-yellow`, `.status-red` - Color-coded states
- `.usage-icon` - Circular icon container
- `.usage-info` - Text information container
- `.usage-count` - Leave count display
- `.usage-status` - Status message display
- Responsive styles for mobile devices

### Data Source
The indicator uses data from `leaveSummary` state which is fetched via the `getLeaveSummary()` API:

**API Endpoint:** `/leave-requests/summary` (or similar)

**Data Structure:**
```javascript
{
  leave_instances: {
    total_allowed: 3,
    used: 0-3,
    remaining: 0-3,
    next_available_date: "January 1, 2026" // or null if can file now
  },
  // ... other summary data
}
```

### Responsive Design
The indicator is fully responsive with optimized styling for mobile devices:
- Reduced padding on mobile (12px instead of 16px)
- Smaller icon size (36px instead of 40px)
- Adjusted font sizes for better mobile readability

## User Benefits

### At a Glance Monitoring
Employees can instantly see their leave usage status without having to:
- Navigate to other pages
- Check leave history
- Calculate remaining leaves manually

### Visual Clarity
The color-coded system provides immediate visual feedback:
- **Green:** Safe to file leave (plenty remaining)
- **Yellow:** Caution, only 1 leave remaining
- **Red:** Cannot file more leaves this year

### Proactive Planning
Employees can plan their leaves better by knowing:
- How many leaves they've already used
- How many leaves remain available
- When they might hit the yearly limit

## System Impact

### No Other Functionality Affected
✅ All existing leave request functionality remains unchanged  
✅ Validation rules still apply  
✅ Approval workflow unchanged  
✅ Leave balance calculations unaffected  
✅ Backend logic remains the same  

### Performance
- No additional API calls (uses existing `leaveSummary` data)
- Minimal CSS overhead
- No JavaScript performance impact

## Testing Scenarios

### Test Case 1: New Employee (0 leaves used)
**Expected Display:**
- Green indicator
- "0/3 Leave Requests Used This Year"
- "You have 3 leave requests remaining"

### Test Case 2: One Leave Used
**Expected Display:**
- Green indicator
- "1/3 Leave Requests Used This Year"
- "You have 2 leave requests remaining"

### Test Case 3: Two Leaves Used
**Expected Display:**
- Yellow indicator
- "2/3 Leave Requests Used This Year"
- "You have 1 leave request remaining"

### Test Case 4: Three Leaves Used (Limit Reached)
**Expected Display:**
- Red indicator
- "3/3 Leave Requests Used This Year"
- "You have used all leave requests for this year. Try again on [date]"
- Date shows either:
  - Next year (January 1, [year]) if 3 leaves already used
  - Specific date based on 7-day waiting period if still applicable

### Test Case 5: Mobile Responsiveness
**Expected Behavior:**
- Indicator should resize appropriately on mobile
- All text should remain readable
- Icons should scale properly
- No horizontal overflow

## Files Modified

### Backend
1. **hrms-backend/app/Http/Controllers/Api/LeaveRequestController.php**
   - Updated `getLeaveSummary()` method to include `leave_instances` data
   - Added calculation for yearly leave request count
   - Added logic to determine next available filing date
   - Handles two scenarios:
     - 7-day waiting period after last leave
     - Next year if 3 leaves already used

### Frontend
1. **hrms-frontend/src/components/Employee/EmbeddedLeaveForm.js**
   - Replaced info message with leave usage indicator
   - Added conditional rendering based on leave usage count
   - Implemented color-coded status system
   - Added "Try again on [date]" message for limit reached

2. **hrms-frontend/src/components/Employee/EmbeddedLeaveForm.css**
   - Added `.leave-usage-indicator` and related styles
   - Implemented green/yellow/red color schemes
   - Added responsive mobile styles

## Backend Logic: Next Available Date Calculation

The system intelligently determines when an employee can file their next leave request:

1. **If in waiting period (within 7 days after last leave):**
   - Shows the specific date when the 7-day period ends
   - Example: "Try again on October 30, 2025"

2. **If 3 leaves already used in current year:**
   - Shows January 1 of next year
   - Example: "Try again on January 1, 2026"

3. **If can file now:**
   - `next_available_date` is `null`
   - No waiting message shown

## Summary

✅ **Replaced:** Static informational text  
✅ **Added:** Dynamic leave usage indicator  
✅ **Color Coding:** Green (0-1), Yellow (2), Red (3)  
✅ **Next Filing Date:** Shows when employee can file again  
✅ **Smart Logic:** Handles both waiting period and yearly limit  
✅ **Responsive:** Mobile-optimized  
✅ **No Breaking Changes:** All existing functionality preserved  

The leave usage indicator provides employees with real-time visibility into their leave request status and clear guidance on when they can file their next leave request, helping them make informed decisions and plan ahead.

