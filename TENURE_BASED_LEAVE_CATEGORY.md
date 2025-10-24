# Tenure-Based Leave Category System

## Overview
The leave category system now dynamically categorizes Sick Leave and Emergency Leave based on employee tenure. Only employees with 1+ year of service have their Sick/Emergency leaves categorized as "Service Incentive Leave (SIL)". New hires and employees with less than 1 year tenure have ALL their leaves categorized as "Emergency Leave (EL)".

## Problem Solved
**Previous System**: Sick Leave and Emergency Leave were always categorized as SIL, regardless of employee tenure.

**Issue**: This was confusing because:
- New hires don't get SIL benefits (0 paid days for < 6 months, 3 paid days for 6-12 months)
- SIL implies a benefit that only fully applies to employees with 1+ year tenure
- The category didn't match the actual entitlement

**New System**: Leave category is now **tenure-aware**:
- **< 1 year**: Even Sick/Emergency Leave → **Emergency Leave (EL)**
- **1+ year**: Sick/Emergency Leave → **Service Incentive Leave (SIL)**

## System Logic

### Leave Category Determination

#### Backend (`LeaveRequest.php` - `determineLeaveCategory()`)

```php
public static function determineLeaveCategory($leaveType, $tenureInMonths = null)
{
    $silLeaveTypes = ['Sick Leave', 'Emergency Leave'];
    
    if (in_array($leaveType, $silLeaveTypes)) {
        // SIL ONLY for employees with 1+ year (12+ months)
        if ($tenureInMonths !== null && $tenureInMonths >= 12) {
            return 'Service Incentive Leave (SIL)';
        } else {
            // New hires: Sick/Emergency categorized as Emergency Leave
            return 'Emergency Leave (EL)';
        }
    }
    
    // All other leave types → Emergency Leave
    return 'Emergency Leave (EL)';
}
```

#### Frontend (Both Leave Forms)

```javascript
// SIL only if Sick/Emergency AND tenure >= 12 months
const isSIL = (formData.leaveType === 'Sick Leave' || formData.leaveType === 'Emergency Leave') && 
              (tenure.months >= 12);
```

## Categorization Rules

| Employee Tenure | Leave Type | Category | Paid Days |
|-----------------|------------|----------|-----------|
| **< 6 months** | Sick Leave | Emergency Leave (EL) | 0 |
| **< 6 months** | Emergency Leave | Emergency Leave (EL) | 0 |
| **< 6 months** | Any other | Emergency Leave (EL) | 0 |
| **6-12 months** | Sick Leave | Emergency Leave (EL) | 3 |
| **6-12 months** | Emergency Leave | Emergency Leave (EL) | 3 |
| **6-12 months** | Any other | Emergency Leave (EL) | 0 |
| **1+ year** | Sick Leave | **Service Incentive Leave (SIL)** | 8 |
| **1+ year** | Emergency Leave | **Service Incentive Leave (SIL)** | 8 |
| **1+ year** | Vacation Leave | Emergency Leave (EL) | 5 |
| **1+ year** | Other types | Emergency Leave (EL) | Varies |

## Examples

### Example 1: New Hire (Less than 1 month)

**Employee**: employee one  
**Tenure**: Less than 1 month  
**Leave Request**: Sick Leave, 18 days

**Result**:
- **Category**: Emergency Leave (EL) ← Not SIL!
- **Payment**: 0 paid, 18 unpaid
- **Display in Leave Management**: "Emergency Leave"

**Payment Modal Shows**:
```
Your Tenure: Less than 1 month
Category: Emergency Leave
Used 0 of 0 paid days for Sick Leave this year.
```

### Example 2: 6-Month Employee

**Employee**: Mid-tenure employee  
**Tenure**: 6 months  
**Leave Request**: Emergency Leave, 5 days

**Result**:
- **Category**: Emergency Leave (EL) ← Still not SIL!
- **Payment**: 3 paid, 2 unpaid
- **Display in Leave Management**: "Emergency Leave"

**Payment Modal Shows**:
```
Your Tenure: 6 months
Category: Emergency Leave
Used 0 of 3 paid days for Emergency Leave this year.
```

### Example 3: Senior Employee (1+ Year)

**Employee**: Senior employee  
**Tenure**: 2 years  
**Leave Request**: Sick Leave, 10 days

**Result**:
- **Category**: Service Incentive Leave (SIL) ← Now it's SIL!
- **Payment**: 8 paid, 2 unpaid
- **Display in Leave Management**: "SIL"

**Payment Modal Shows**:
```
Your Tenure: 2 years
Category: SIL (Sick & Emergency Leave Combined)
Used 0 of 8 paid SIL days this year.
```

## Payment Rules (Unchanged)

The payment calculation logic remains the same:

| Tenure Bracket | SIL Paid Days | Other Leaves |
|----------------|---------------|--------------|
| < 6 months | 0 | 0 |
| 6-12 months | 3 | 0 |
| 1+ year | 8 | Config-based |

**What Changed**: Only the **category label**, not the payment logic.

## User Experience Changes

### Employee Leave Request Form

**Before** (New hire selecting Sick Leave):
```
Category: SIL (Sick & Emergency Leave Combined)
Used 0 of 0 paid SIL days this year.
```
❌ Confusing - shows "SIL" but they don't actually get SIL benefits

**After** (New hire selecting Sick Leave):
```
Category: Emergency Leave
Used 0 of 0 paid days for Sick Leave this year.
```
✅ Clear - correctly shows they're not in SIL category yet

### HR Leave Management Table

**Before** (New hire's Sick Leave):
```
Terms: without PAY
SIL
```
❌ Misleading - shows "SIL" for someone who doesn't qualify

**After** (New hire's Sick Leave):
```
Terms: without PAY
Emergency Leave
```
✅ Accurate - shows correct category for their tenure

### Senior Employee (No Change)

For employees with 1+ year tenure:
```
Terms: with PAY
SIL
```
✅ Still shows SIL correctly for qualified employees

## Benefits

### ✅ **Clarity**
- Category matches actual entitlement
- No confusion about SIL status
- Clear distinction between tenured and new employees

### ✅ **Accuracy**
- Leave categories reflect real benefits
- HR sees correct classification
- Reports are more meaningful

### ✅ **Fairness**
- New hires understand they're not yet in SIL category
- Senior employees clearly see their SIL benefits
- Transparent progression from Emergency Leave → SIL

### ✅ **Better Tracking**
- HR can easily identify which employees qualify for SIL
- Leave categories align with tenure brackets
- Easier to audit leave usage

## Technical Implementation

### Files Modified

#### Backend
1. **`app/Models/LeaveRequest.php`**
   - Updated `determineLeaveCategory()` to accept `$tenureInMonths` parameter
   - Added tenure check: SIL only if tenure >= 12 months
   - Updated method documentation

2. **Updated Comments**:
   - Clarified that SIL only applies to 1+ year employees
   - Added note about Emergency Leave category for new hires

#### Frontend
1. **`components/Employee/EmbeddedLeaveForm.js`**
   - Updated `isSIL` logic to check tenure: `tenure.months >= 12`
   - Added "Category: Emergency Leave" display for non-SIL

2. **`components/Employee/LeaveApplicationForm.js`**
   - Same updates as EmbeddedLeaveForm.js
   - Ensures consistency across both forms

### Key Code Changes

**Before**:
```javascript
const isSIL = formData.leaveType === 'Sick Leave' || formData.leaveType === 'Emergency Leave';
```

**After**:
```javascript
const isSIL = (formData.leaveType === 'Sick Leave' || formData.leaveType === 'Emergency Leave') && 
              (tenure.months >= 12);
```

## Migration Notes

**No database migration required** - this is a display/logic change only.

**Existing leave records**:
- Old leaves will display with their stored `leave_category`
- New leaves will use the tenure-based logic
- No retroactive changes to historical data

## Testing Scenarios

### Test 1: New Hire - Sick Leave
- **Setup**: Employee with < 1 month tenure
- **Action**: Submit Sick Leave request
- **Expected**:
  - Category: "Emergency Leave (EL)"
  - Payment: 0 paid, all unpaid
  - Modal shows: "Category: Emergency Leave"

### Test 2: 8-Month Employee - Emergency Leave
- **Setup**: Employee with 8 months tenure
- **Action**: Submit Emergency Leave request
- **Expected**:
  - Category: "Emergency Leave (EL)"
  - Payment: 3 paid (if available), rest unpaid
  - Modal shows: "Category: Emergency Leave"

### Test 3: 2-Year Employee - Sick Leave
- **Setup**: Employee with 2 years tenure
- **Action**: Submit Sick Leave request
- **Expected**:
  - Category: "Service Incentive Leave (SIL)"
  - Payment: Up to 8 paid, rest unpaid
  - Modal shows: "Category: SIL (Sick & Emergency Leave Combined)"

### Test 4: 1-Year Employee - Vacation Leave
- **Setup**: Employee with exactly 12 months tenure
- **Action**: Submit Vacation Leave request
- **Expected**:
  - Category: "Emergency Leave (EL)" (all non-Sick/Emergency are EL)
  - Payment: Up to 5 paid
  - Modal shows: "Category: Emergency Leave"

## Summary

The leave category system now correctly reflects employee tenure:

- **New Hires (< 1 year)**: All leaves → **Emergency Leave (EL)**
- **Senior Employees (1+ year)**: Sick/Emergency → **SIL**, Others → **EL**

This ensures:
1. ✅ Categories match actual entitlements
2. ✅ No confusion about SIL status
3. ✅ Clear progression for employees
4. ✅ Accurate reporting for HR
5. ✅ Fair and transparent system

🎉 **New hires now see "Emergency Leave" instead of "SIL" when submitting Sick/Emergency leaves, making the system clearer and more accurate!**





