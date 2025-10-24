# Automatic Leave Payment System Implementation

## Overview
This document describes the implementation of the automatic leave payment determination system in the HRMS. The system now automatically determines whether a leave request will be "With Pay" or "Without Pay" based on the employee's leave history and predefined rules.

## Functional Requirements Implemented

### 1. Automatic Leave Type Assignment
- **Rule**: Each employee is entitled to 3 leave instances per year
- **First Leave Instance**: With Pay (up to 7 days)
- **Second & Third Instances**: Without Pay
- **Implementation**: System tracks approved leave instances (not total days) per calendar year

### 2. Leave Duration Logic
- **Rule**: If leave duration exceeds 7 days:
  - First 7 days: With Pay
  - Remaining days: Without Pay
- **Employee Notification**: System displays clear messages about payment status during submission

### 3. Active Leave Restriction
- **Rule**: Employee cannot file another leave until current leave end date has passed
- **Implementation**: System checks for active/pending leaves before allowing submission
- **Validation**: Backend validates and prevents duplicate/overlapping leaves

### 4. Employee Awareness
- **Leave Summary Display**: Shows comprehensive leave status including:
  - Leave instances used/remaining for the year
  - Next leave payment status
  - Active leave information
  - Payment rules and restrictions
- **Real-time Updates**: Leave summary refreshes after each submission

### 5. Automatic Tracking
- **Backend Tracking**: System automatically tracks:
  - Number of leave instances per year
  - Leave payment terms
  - Active leave status
  - Leave history

---

## Backend Changes

### 1. LeaveRequest Model (`hrms-backend/app/Models/LeaveRequest.php`)

#### New Methods Added:

**`calculateAutomaticPaymentTerms($employeeId, $requestedDays, $currentYear)`**
- Calculates payment terms based on leave history
- Returns:
  - `with_pay_days`: Number of days that will be paid
  - `without_pay_days`: Number of days that will be unpaid
  - `terms`: 'with PAY' or 'without PAY'
  - `message`: Informational message for employee
  - `is_first_leave`: Boolean flag
  - `is_split`: Boolean flag (for leaves > 7 days)

**Logic Flow:**
```
1. Count approved leave instances for current year
2. Determine leave instance number (1st, 2nd, or 3rd)
3. If 1st leave:
   - If ≤ 7 days: All paid
   - If > 7 days: First 7 paid, rest unpaid
4. If 2nd or 3rd leave: All unpaid
```

**`checkActiveLeave($employeeId)`**
- Checks if employee has active leave (not yet ended)
- Returns:
  - `has_active_leave`: Boolean
  - `leave`: LeaveRequest object or null
  - `message`: Restriction message

### 2. LeaveRequestController (`hrms-backend/app/Http/Controllers/Api/LeaveRequestController.php`)

#### Modified Methods:

**`store(Request $request)`**
- Added active leave check before allowing submission
- Calls `calculateAutomaticPaymentTerms()` to determine payment status
- Automatically sets `terms` field (no longer "TBD by HR")
- Automatically sets `leave_category` ("First Leave" or "Additional Leave")
- Returns payment terms message in response

**Key Changes:**
```php
// Check for active leave
$activeLeavCheck = LeaveRequest::checkActiveLeave($user->id);
if ($activeLeavCheck['has_active_leave']) {
    return response()->json(['error' => $activeLeavCheck['message']], 422);
}

// Calculate automatic payment terms
$paymentTerms = LeaveRequest::calculateAutomaticPaymentTerms($user->id, $totalDays);

// Set terms automatically
$leaveRequest->terms = $paymentTerms['terms'];
$leaveRequest->leave_category = $paymentTerms['is_first_leave'] ? 'First Leave' : 'Additional Leave';
```

#### New API Endpoint:

**`getLeaveSummary()` - Route: `/api/leave-requests/my-summary`**

Returns comprehensive leave information:
```json
{
  "year": 2025,
  "leave_instances": {
    "total_allowed": 3,
    "used": 0,
    "remaining": 3
  },
  "payment_status": {
    "next_leave_will_be": "with PAY (up to 7 days)",
    "message": "Your first leave of the year will be paid...",
    "can_file_leave": true,
    "restriction_message": null
  },
  "active_leave": {
    "exists": false
  },
  "leaves_this_year": [...],
  "rules": {
    "1": "You can file up to 3 leave requests per year",
    "2": "Your first leave instance will be with pay (up to 7 days)",
    ...
  }
}
```

### 3. API Routes (`hrms-backend/routes/api.php`)

Added new route:
```php
Route::get('/leave-requests/my-summary', [LeaveRequestController::class, 'getLeaveSummary']);
```

---

## Frontend Changes

### 1. API Service (`hrms-frontend/src/api/leave.js`)

Added new API function:
```javascript
export const getLeaveSummary = () => API.get('/leave-requests/my-summary');
```

### 2. Leave Forms

#### EmbeddedLeaveForm (`hrms-frontend/src/components/Employee/EmbeddedLeaveForm.js`)

**New State Variables:**
- `leaveSummary`: Stores leave summary data
- `loadingLeaveSummary`: Loading indicator

**New Functions:**
- `fetchLeaveSummary()`: Fetches leave summary from API
- Auto-refreshes after successful leave submission

**UI Changes:**
- Added comprehensive leave status section showing:
  - Leave instances used/remaining
  - Next leave payment status (badge)
  - Payment information message
  - Active leave warning (if exists)
  - Collapsible rules section
- Submit button disabled if employee has active leave
- Button text changes based on status

**Visual Features:**
- Color-coded status indicators:
  - Blue background: Can file leave
  - Yellow background: Has restrictions
  - Green badge: "with PAY"
  - Yellow badge: "without PAY"

#### LeaveApplicationForm (`hrms-frontend/src/components/Employee/LeaveApplicationForm.js`)

**Same changes as EmbeddedLeaveForm:**
- Added leave summary state and fetching
- Displays comprehensive leave status card
- Disabled submit button for active leaves
- Real-time status updates

**UI Enhancements:**
- Bootstrap Card component with color-coded styling
- Alert components for payment information
- Collapsible rules section using `<details>` element
- Refresh button to manually update status

### 3. HR Interface

#### LeaveManagement (`hrms-frontend/src/components/HrAssistant/LeaveManagement.js`)

**Modal Changes: "Terms and Category Modal"**

**Before:**
- HR could manually select "with PAY" or "without PAY"
- Manual selection was required

**After:**
- Payment status is **READ-ONLY**
- Displays current automatic payment status with badge
- Shows informational alert explaining automatic determination
- Only leave category remains editable
- Button text changed from "Save Changes" to "Save Category"

**Visual Design:**
```
┌─────────────────────────────────────────┐
│ 💰 Payment Status (Automatic)           │
├─────────────────────────────────────────┤
│ Current Status: [with PAY]              │
│                                         │
│ ℹ️ Automatic Determination:             │
│ • Employee's leave history for the year │
│ • First leave: With Pay (up to 7 days) │
│ • Second/Third leave: Without Pay       │
│ • Leaves > 7 days: First 7 paid, rest   │
│   unpaid                                │
└─────────────────────────────────────────┘
```

---

## Business Rules Summary

### Leave Instance Rules
1. **3 Leave Instances per Year**: Employee can file up to 3 leave requests per calendar year
2. **First Instance**: With Pay (maximum 7 days)
3. **Second & Third Instances**: Without Pay
4. **Leave > 7 Days**: First 7 days paid, remaining days unpaid (applies to first leave only)

### Restrictions
1. **Active Leave Restriction**: Cannot file new leave until current leave end date has passed
2. **No Manual Override**: HR cannot manually change payment status (automatically determined)
3. **Year-Based Reset**: Leave instances reset every calendar year

### Tracking
- System tracks **approved** leave instances (not pending/rejected)
- Counts instances, not total days
- Resets annually on January 1st

---

## User Experience Improvements

### For Employees:

1. **Clear Payment Status**
   - Immediate visibility of payment status
   - Knows in advance if leave will be paid/unpaid
   - Can see remaining leave instances

2. **Proactive Notifications**
   - Active leave warnings
   - Payment rule explanations
   - Next leave status prediction

3. **Transparent Rules**
   - Collapsible rules section
   - Plain language explanations
   - Visual status indicators

### For HR Assistants:

1. **Reduced Manual Work**
   - No need to manually set payment terms
   - Automatic calculation based on rules
   - Consistent application of policies

2. **Clear Documentation**
   - Payment status explanation in modal
   - Visual indicators for quick reference
   - Audit trail of automatic decisions

3. **Focus on Category Management**
   - Can still categorize leaves
   - Review automatic determinations
   - Override only categories, not payment status

---

## Technical Implementation Details

### Backend Architecture

**Data Flow:**
```
1. Employee submits leave request
   ↓
2. Check for active leave
   ↓
3. Calculate automatic payment terms
   ↓
4. Set terms and category
   ↓
5. Save leave request
   ↓
6. Return success with payment message
```

**Validation Layers:**
1. Active leave check (prevents overlapping leaves)
2. Leave instance limit check (3 per year)
3. Payment terms calculation (automatic)
4. HR meeting availability check

### Frontend Architecture

**Component Structure:**
```
LeaveApplicationForm / EmbeddedLeaveForm
├── State Management
│   ├── leaveSummary (from API)
│   ├── loadingLeaveSummary
│   └── formData
├── Data Fetching
│   ├── fetchLeaveSummaryData()
│   └── Auto-refresh on mount and after submission
├── UI Components
│   ├── Leave Status Card
│   │   ├── Leave Instances Display
│   │   ├── Next Leave Status Badge
│   │   ├── Payment Information Alert
│   │   ├── Active Leave Warning
│   │   └── Collapsible Rules Section
│   └── Submit Button
│       └── Disabled if has active leave
└── Form Submission
    └── Refresh summary after success
```

**State Management:**
- React hooks for state management
- Real-time updates via API calls
- Optimistic UI updates

### API Response Format

**Success Response:**
```json
{
  "message": "Leave request submitted successfully",
  "data": {
    "id": 123,
    "employee_id": 1,
    "terms": "with PAY",
    "leave_category": "First Leave",
    ...
  },
  "warning": {
    "warning": true,
    "message": "This is your first leave this year. All 5 days will be paid."
  }
}
```

**Error Response:**
```json
{
  "error": "You cannot file another leave request until your current leave ends on January 15, 2025. You can file your next leave on January 16, 2025."
}
```

---

## Testing Recommendations

### Backend Testing

1. **Test Leave Instance Counting**
   ```php
   // Test case: First leave of the year
   $result = LeaveRequest::calculateAutomaticPaymentTerms(1, 5, 2025);
   assert($result['terms'] === 'with PAY');
   assert($result['with_pay_days'] === 5);
   assert($result['without_pay_days'] === 0);
   ```

2. **Test Active Leave Check**
   ```php
   // Test case: Has active leave
   $check = LeaveRequest::checkActiveLeave(1);
   assert($check['has_active_leave'] === true);
   assert($check['message'] !== null);
   ```

3. **Test Leave Duration > 7 Days**
   ```php
   // Test case: 10-day first leave
   $result = LeaveRequest::calculateAutomaticPaymentTerms(1, 10, 2025);
   assert($result['with_pay_days'] === 7);
   assert($result['without_pay_days'] === 3);
   assert($result['is_split'] === true);
   ```

### Frontend Testing

1. **Test Leave Summary Display**
   - Verify leave summary loads on component mount
   - Check status badges display correctly
   - Verify rules section is collapsible

2. **Test Submit Button State**
   - Disabled when has active leave
   - Enabled when can file leave
   - Shows correct button text

3. **Test Real-time Updates**
   - Leave summary refreshes after submission
   - Active leave warning appears/disappears correctly
   - Payment status updates immediately

### Integration Testing

1. **End-to-End Scenarios**
   - Submit first leave (should be paid)
   - Submit second leave (should be unpaid)
   - Try submitting with active leave (should fail)
   - Submit 10-day first leave (should be split)

2. **Year Transition**
   - Verify leave instances reset on new year
   - First leave of new year should be paid again

---

## Migration Notes

### Existing Data

- **Existing leaves with "TBD by HR"**: Will remain as is
- **New leaves**: Will have automatic payment terms
- **No data migration needed**: System works with existing schema

### Backward Compatibility

- API endpoints remain backward compatible
- Existing HR approval workflow unchanged
- Old leaves still viewable in history

---

## Future Enhancements

### Potential Improvements

1. **Advanced Rules Engine**
   - Configurable payment rules
   - Department-specific policies
   - Role-based leave entitlements

2. **Leave Balance Dashboard**
   - Visual representation of leave usage
   - Projection of future leave availability
   - Comparison with previous years

3. **Email Notifications**
   - Notify employee of payment status
   - Remind about leave restrictions
   - Alert when leave instances replenish

4. **Reporting**
   - Leave payment analytics
   - Department-wise leave usage
   - Cost analysis for paid leaves

5. **Mobile App Integration**
   - Push notifications for leave status
   - Quick leave summary view
   - Easy leave submission

---

## Deployment Checklist

### Backend
- [x] Update LeaveRequest model
- [x] Update LeaveRequestController
- [x] Add new API route
- [x] Test API endpoints
- [ ] Run database migrations (if any)
- [ ] Deploy to production

### Frontend
- [x] Update API service
- [x] Update leave forms
- [x] Update HR interface
- [x] Test UI components
- [ ] Build production bundle
- [ ] Deploy to production

### Documentation
- [x] Create implementation documentation
- [ ] Update user guides
- [ ] Update API documentation
- [ ] Training materials for HR staff

---

## Support & Troubleshooting

### Common Issues

**Issue 1: Payment status shows "Not Set"**
- **Cause**: Leave was created before system update
- **Solution**: HR can view and verify automatic status

**Issue 2: Cannot submit leave (active leave error)**
- **Cause**: Employee has active/pending leave
- **Solution**: Wait until current leave end date passes

**Issue 3: Leave summary not loading**
- **Cause**: API connection issue
- **Solution**: Check backend API endpoint, verify authentication

### Contact

For technical issues or questions:
- Backend: Check logs in `storage/logs/laravel.log`
- Frontend: Check browser console for errors
- API: Test endpoints using Postman/Insomnia

---

## Conclusion

The automatic leave payment system successfully implements all functional requirements:

✅ Automatic leave type assignment based on history
✅ Leave duration logic with 7-day paid cap
✅ Active leave restriction enforcement
✅ Comprehensive employee awareness features
✅ Automatic tracking and rule application

The system improves efficiency, reduces manual work, ensures policy consistency, and provides transparency for both employees and HR staff.

**Implementation Date**: October 22, 2025
**Version**: 1.0.0
**Status**: ✅ Complete

