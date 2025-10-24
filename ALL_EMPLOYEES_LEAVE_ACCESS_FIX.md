# All Employees Leave Access Fix

## Problem
Employees were getting an error "The selected type is invalid" when trying to submit certain leave types (e.g., Parental Leave, VAWC Leave, Women's Special Leave), preventing new hires and all employees from submitting leave requests.

## Root Cause
The backend validation in `LeaveRequestController.php` had a restrictive `in:` validation rule that only allowed a limited set of leave types:
- Vacation Leave
- Sick Leave
- Emergency Leave
- Maternity Leave
- Paternity Leave
- Personal Leave
- Bereavement Leave

**Missing leave types** that caused the error:
- ❌ Parental Leave
- ❌ Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days
- ❌ Women's Special Leave – 60 days

## Solution

### 1. Backend Validation Update (`LeaveRequestController.php`)

**Before**:
```php
'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Maternity Leave,Paternity Leave,Personal Leave,Bereavement Leave',
```

**After**:
```php
'type' => 'required|string|in:Vacation Leave,Sick Leave,Emergency Leave,Maternity Leave,Paternity Leave,Personal Leave,Bereavement Leave,Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days,Women\'s Special Leave – 60 days,Parental Leave',
```

**Changes**:
- ✅ Added "Parental Leave"
- ✅ Added "Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days"
- ✅ Added "Women's Special Leave – 60 days"

### 2. Backend Configuration Update (`config/leave.php`)

Updated `with_pay_days` configuration to include all leave types with their correct paid day limits:

```php
'with_pay_days' => [
    'Sick Leave' => 8,
    'Emergency Leave' => 8,
    'Vacation Leave' => 5,
    'Maternity Leave' => 105,
    'Paternity Leave' => 7,
    'Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days' => 10,
    "Women's Special Leave – 60 days" => 60,  // Updated from 10 to 60
    'Parental Leave' => 7,
    'Personal Leave' => 5,
    'Bereavement Leave' => 5,
],
```

### 3. Frontend Configuration Update

Updated both leave form components to include all leave types:

**Files Updated**:
- `EmbeddedLeaveForm.js`
- `LeaveApplicationForm.js`

**Added to `withPayDaysConfig`**:
```javascript
const withPayDaysConfig = {
  'Vacation Leave': 5,
  'Maternity Leave': 105,
  'Paternity Leave': 7,
  'Personal Leave': 5,
  'Bereavement Leave': 5,
  'Leave for Victims of Violence Against Women and Their Children (VAWC) – 10 days': 10,
  "Women's Special Leave – 60 days": 60,
  'Parental Leave': 7
};
```

## Leave Payment Rules

All employees can now submit any leave type, with automatic payment terms based on tenure:

### New Hires (< 1 Year)
| Leave Type | Max Paid Days | Payment Rule |
|------------|---------------|--------------|
| **ALL Leave Types** | 0 | All days WITHOUT PAY |

**Example**:
- New hire requests 18 days of Parental Leave
- Result: **0 paid days, 18 unpaid days**

### Employees with 1+ Year Tenure

#### SIL (Sick & Emergency Leave)
| Leave Type | Max Paid Days |
|------------|---------------|
| Sick Leave | 8 days (combined) |
| Emergency Leave | 8 days (combined) |

#### Other Leave Types
| Leave Type | Max Paid Days |
|------------|---------------|
| Vacation Leave | 5 days |
| Maternity Leave | 105 days |
| Paternity Leave | 7 days |
| Parental Leave | 7 days |
| Personal Leave | 5 days |
| Bereavement Leave | 5 days |
| VAWC Leave | 10 days |
| Women's Special Leave | 60 days |

**Example 1**: Senior employee (1+ year) requests 18 days Parental Leave
- Max paid: 7 days
- Result: **7 paid days, 11 unpaid days**

**Example 2**: Senior employee (1+ year) requests 70 days Women's Special Leave
- Max paid: 60 days
- Result: **60 paid days, 10 unpaid days**

## Tenure Brackets

### < 6 Months (New Hire)
- ❌ All leave types: **0 paid days**
- All requests: **WITHOUT PAY**

### 6-12 Months
- ✅ SIL: **3 paid days**
- ❌ Other leaves: **0 paid days**

### 1+ Year
- ✅ SIL: **8 paid days**
- ✅ Other leaves: **Config-based paid days** (see table above)

## User Experience

### Before Fix
1. Employee selects "Parental Leave"
2. Fills out the form
3. Clicks Submit
4. ❌ **Error**: "The selected type is invalid"
5. Cannot submit leave request

### After Fix
1. Employee selects "Parental Leave"
2. Fills out the form
3. Clicks Submit
4. ✅ **Payment Modal Shows**:
   ```
   Payment Breakdown
   
   ⚠️ 18 days WITHOUT PAY
   
   Explanation:
   Based on your tenure (Less than 1 month), all 18 days will be WITHOUT PAY.
   
   Your Tenure: Less than 1 month
   Used 0 of 0 paid days for Parental Leave this year.
   ```
5. Employee confirms
6. ✅ Leave request submitted successfully

## Testing Scenarios

### Scenario 1: New Hire - Parental Leave
- **Tenure**: Less than 1 month
- **Request**: 18 days Parental Leave
- **Expected**: 0 paid, 18 unpaid ✅

### Scenario 2: New Hire - Women's Special Leave
- **Tenure**: Less than 1 month
- **Request**: 30 days Women's Special Leave
- **Expected**: 0 paid, 30 unpaid ✅

### Scenario 3: Senior Employee - Parental Leave
- **Tenure**: 2 years
- **Request**: 10 days Parental Leave
- **Expected**: 7 paid, 3 unpaid ✅

### Scenario 4: Senior Employee - Women's Special Leave
- **Tenure**: 2 years
- **Request**: 70 days Women's Special Leave
- **Expected**: 60 paid, 10 unpaid ✅

## Benefits

### ✅ **Universal Access**
- All employees can submit any leave type
- No restrictions based on tenure

### ✅ **Automatic Payment Calculation**
- New hires: All unpaid
- 1+ year: Config-based paid days
- Clear breakdown shown before submission

### ✅ **Fair & Transparent**
- Employees see payment breakdown before submitting
- Understand tenure requirements
- Know exactly what is paid vs unpaid

### ✅ **Comprehensive Leave Types**
- All standard leave types supported
- Special leaves (VAWC, Women's Special) included
- Parental leave now available

## Summary

The system now allows **all employees, including new hires**, to submit any leave type. The only difference is:

- **New Hires (< 1 year)**: All leaves are **WITHOUT PAY**
- **Senior Employees (1+ year)**: Leaves are **WITH PAY** up to configured limits

This ensures:
1. No employee is blocked from taking necessary leave
2. Payment is fair and based on tenure
3. System is transparent and easy to understand
4. All leave types are supported

🎉 **Problem Solved**: Employees can now submit any leave type regardless of tenure!





