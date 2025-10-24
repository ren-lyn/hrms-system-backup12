# Leave Request System Update - Complete Implementation

## Overview
The leave request system has been updated to properly handle multiple leave types with specific paid day allocations and tenure-based validation. The system now supports Women's Special Leave, Parental Leave, VAWC Leave, Paternity Leave, Maternity Leave, and Vacation Leave with the same flexible workflow as Sick Leave and Emergency Leave.

## Key Changes

### 1. Leave Type Configuration Updates

#### Backend Configuration (`hrms-backend/config/leave.php`)
**Added new leave types to entitlements:**
- `Leave for Victims of Violence Against Women and Their Children (VAWC)` – 10 days
- `Women's Special Leave` – 60 days  
- `Parental Leave` – 7 days

**Updated with_pay_days configuration:**
- Removed the old format with day counts in type names (e.g., "VAWC – 10 days")
- Standardized to clean type names matching the entitlements
- All leave types now have proper paid day limits configured

### 2. Tenure-Based Validation

#### New Employee Rule (Updated from 6 months to 1 year)
**Before:** Employees with less than 6 months of service had limited paid leave access  
**After:** Employees with less than **1 year (12 months)** of service receive **NO paid leave** for any leave type

#### Updated Methods:

**`isNewHire()` Method** (`LeaveRequestController.php`)
- Changed threshold from 6 months to 12 months
- Updated warning message to reflect "less than one year" requirement

**`calculateAutomaticPaymentTerms()` Method** (`LeaveRequest.php`)
- Simplified tenure logic:
  - **< 12 months:** All leave types are WITHOUT PAY
  - **≥ 12 months:** 
    - Sick/Emergency Leave (SIL): 8 days WITH PAY
    - Other leave types: WITH PAY based on configuration

### 3. Leave Type Limits and Validation

#### Backend Updates (`LeaveRequestController.php`)

**`checkLeaveTypeLimit()` Method:**
Updated to include all new leave types in special handling:
```php
$specialLeaveTypes = [
    'Sick Leave',
    'Emergency Leave',
    'Vacation Leave',
    'Maternity Leave',
    'Paternity Leave',
    'Leave for Victims of Violence Against Women and Their Children (VAWC)',
    "Women's Special Leave",
    'Parental Leave'
];
```

**Behavior:**
- If requested days exceed the paid limit, the system automatically splits into paid and unpaid days
- Employees receive a warning but can still submit the request
- Example: Requesting 70 days of Women's Special Leave → 60 days paid, 10 days unpaid

**Validation Rules (`store()` method):**
Updated to accept all new leave types:
```php
'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Maternity Leave,Paternity Leave,Personal Leave,Bereavement Leave,Leave for Victims of Violence Against Women and Their Children (VAWC),Women\'s Special Leave,Parental Leave'
```

### 4. Frontend Updates

#### Leave Application Form (`LeaveApplicationForm.js`)
**Updated default leave types:**
- Added VAWC Leave (10 days)
- Added Women's Special Leave (60 days)
- Added Parental Leave (7 days)
- Updated Sick Leave and Emergency Leave to 8 days (was 5)

**Updated validation logic:**
- Added all new leave types to `specialLeaveTypes` array
- Allows exceeding limits with automatic paid/unpaid split
- Displays appropriate warnings to users

#### Embedded Leave Form (`EmbeddedLeaveForm.js`)
**Updated leave type options:**
- Standardized option values to match backend (removed day counts from values)
- Added Personal Leave and Bereavement Leave options
- Updated display text to show day allocations in parentheses

**Updated validation:**
- `getMaxDaysForLeaveType()`: Updated with correct day limits
- `checkExtendedLeaveValidation()`: Added all new leave types to special handling

### 5. Paid Leave Day Allocations

| Leave Type | Maximum Paid Days | Tenure Requirement |
|-----------|-------------------|-------------------|
| Women's Special Leave | 60 days | ≥ 1 year |
| Parental Leave | 7 days | ≥ 1 year |
| VAWC Leave | 10 days | ≥ 1 year |
| Paternity Leave | 7 days | ≥ 1 year |
| Maternity Leave | 105 days | ≥ 1 year |
| Vacation Leave | 5 days | ≥ 1 year |
| Sick Leave (SIL) | 8 days | ≥ 1 year |
| Emergency Leave (SIL) | 8 days | ≥ 1 year |
| Personal Leave | 5 days | ≥ 1 year |
| Bereavement Leave | 5 days | ≥ 1 year |

**Note:** Employees with less than 1 year of service receive all leave types as WITHOUT PAY.

## Existing Features (Unchanged)

### Active Leave Prevention
The system already prevents employees from submitting multiple simultaneous leave requests:
- **Rule:** Cannot file a new leave request until current leave period has ended
- **Implementation:** `checkActiveLeave()` method in `LeaveRequest.php`
- **Check:** Runs automatically before processing any new leave request
- **Message:** "You cannot file another leave request until your current leave ends on [date]"

### Yearly Leave Request Limit
- **Maximum:** 3 leave requests per year per employee
- **Status:** Active and unchanged

### Waiting Period Between Leaves
- **Rule:** Must wait 7 days after leave ends before filing another
- **Status:** Active and unchanged

## System Flow

### Leave Request Submission Process
1. **Employee submits leave request**
2. **System checks:**
   - Active leave (must not have ongoing leave)
   - HR availability (HR must not be in a blocking meeting)
   - Employee tenure (< 1 year = unpaid warning)
   - Leave type limits (allows exceeding with paid/unpaid split for special types)
   - Yearly request limit (max 3 per year)
   - Waiting period (7 days after last leave ended)
3. **System calculates payment terms:**
   - Determines paid vs unpaid days based on tenure and configuration
   - Shows breakdown to employee
4. **Request is created** with automatic payment terms
5. **Notifications sent** to managers and HR Assistant

### Payment Calculation Example

**Scenario 1:** Employee with 2 years of service requests 70 days Women's Special Leave
- **Result:** 60 days WITH PAY, 10 days WITHOUT PAY
- **Category:** Emergency Leave (EL)
- **Message:** "Only 60 days are with pay. The remaining 10 days will be without pay."

**Scenario 2:** Employee with 8 months of service requests 5 days Vacation Leave
- **Result:** 0 days WITH PAY, 5 days WITHOUT PAY
- **Category:** Emergency Leave (EL)
- **Message:** "As a new employee (employed less than one year), this leave will be without pay."

**Scenario 3:** Employee with 18 months of service requests 5 days Sick Leave
- **Result:** 5 days WITH PAY, 0 days WITHOUT PAY
- **Category:** Service Incentive Leave (SIL)
- **Message:** "All 5 days will be with pay. You have 8 paid days remaining for SIL."

## Files Modified

### Backend
1. `hrms-backend/config/leave.php` - Leave configuration
2. `hrms-backend/app/Models/LeaveRequest.php` - Payment calculation logic
3. `hrms-backend/app/Http/Controllers/Api/LeaveRequestController.php` - Validation and request handling

### Frontend
1. `hrms-frontend/src/components/Employee/LeaveApplicationForm.js` - Leave form with dynamic types
2. `hrms-frontend/src/components/Employee/EmbeddedLeaveForm.js` - Embedded leave form

## Testing Recommendations

### Test Cases

1. **New Employee (<1 year) - Any Leave Type**
   - Submit leave request
   - Verify warning: "As a new employee (employed less than one year), this leave will be without pay"
   - Verify all days marked as WITHOUT PAY

2. **Experienced Employee (≥1 year) - Within Limits**
   - Submit 30 days Women's Special Leave
   - Verify all 30 days marked as WITH PAY
   - Verify message shows remaining balance

3. **Experienced Employee (≥1 year) - Exceeding Limits**
   - Submit 70 days Women's Special Leave
   - Verify 60 days WITH PAY, 10 days WITHOUT PAY
   - Verify warning about split payment

4. **Active Leave Prevention**
   - Submit and approve a leave request
   - Try to submit another while first is active
   - Verify error: "You cannot file another leave request until your current leave ends..."

5. **All New Leave Types**
   - Test VAWC Leave (10 days limit)
   - Test Parental Leave (7 days limit)
   - Test Women's Special Leave (60 days limit)
   - Verify proper day limits and payment calculations

## Summary

✅ **All requested leave types** now supported with proper paid day limits  
✅ **Tenure requirement** updated to 1 year for all paid leave  
✅ **Automatic paid/unpaid split** for all specified leave types  
✅ **Active leave prevention** already in place (no changes needed)  
✅ **Frontend and backend** fully synchronized  
✅ **No other system functionality** affected  

The system now provides a flexible and fair leave management process that automatically handles payment terms based on employee tenure and leave type, while maintaining all existing validation rules and constraints.

