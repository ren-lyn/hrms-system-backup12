# Leave Payment System - Complete Guide

## Overview
The HRMS now features a fully automated, tenure-based leave payment system that accurately tracks paid and unpaid days for all leave types, with proper split tracking when leave requests exceed paid day entitlements.

## System Architecture

### 1. Database Schema
**Table**: `leave_requests`

Key fields:
```sql
- total_days (integer): Total number of leave days requested
- with_pay_days (integer): Number of days that are paid
- without_pay_days (integer): Number of days that are unpaid
- terms (string): 'with PAY' or 'without PAY' (overall status)
- leave_category (string): 'Service Incentive Leave (SIL)' or 'Emergency Leave (EL)'
```

### 2. Tenure-Based Payment Rules

#### **Tenure Brackets**

| Tenure | SIL (Sick & Emergency Leave) | Other Leave Types |
|--------|------------------------------|-------------------|
| **< 6 months** | 0 paid days | 0 paid days |
| **6-12 months** | 3 paid days | 0 paid days |
| **1+ year** | 8 paid days | Config-based (Vacation: 5, Maternity: 105, etc.) |

#### **Leave Categories**

**Service Incentive Leave (SIL)**:
- Sick Leave
- Emergency Leave
- Tracked together (combined paid day limit)

**Emergency Leave (EL)**:
- All other leave types (Vacation, Maternity, Paternity, etc.)
- Tracked separately by type

### 3. Payment Calculation Logic

The system automatically calculates payment split using `LeaveRequest::calculateAutomaticPaymentTerms()`:

```php
Step 1: Determine employee tenure (in months)
Step 2: Determine leave category (SIL or EL)
Step 3: Set max paid days based on tenure and category
Step 4: Count used paid days for that category this year
Step 5: Calculate remaining paid days
Step 6: Apply payment split:
  - If requested <= remaining: All WITH PAY
  - If requested > remaining > 0: SPLIT (some paid, some unpaid)
  - If remaining = 0: All WITHOUT PAY
```

## Real-World Examples

### Example 1: Emily Reyes (6 months tenure)

**Employee Profile**:
- Name: Emily Reyes
- Hire Date: April 19, 2025
- Tenure: 6 months (as of October 2025)
- Tenure Bracket: 6-12 months

**Leave Request**: Sick Leave, 10 days (Oct 22 - Oct 31, 2025)

**Automatic Calculation**:
1. Leave Type: Sick Leave → Category: **SIL**
2. Tenure: 6 months → Max SIL Paid Days: **3**
3. Used SIL Days this year: **0**
4. Remaining SIL Days: **3**
5. Requested: **10 days**
6. Payment Split:
   - **with_pay_days**: 3 (max allowed for 6-month tenure)
   - **without_pay_days**: 7 (10 - 3)

**Leave Tracker Display**:
| Total Leaves | Paid Days | Unpaid Days | Balance |
|--------------|-----------|-------------|---------|
| 1 / 3 | **3** | **7** | ✅ 2 leaves left |

**If Emily files another Sick Leave** (e.g., 5 days):
- Used SIL Days: 3 (from previous leave)
- Remaining: 0
- New Leave: 0 paid, 5 unpaid (all unpaid)

### Example 2: Senior Employee (2 years tenure)

**Employee Profile**:
- Tenure: 24 months (2 years)
- Tenure Bracket: 1+ year

**Scenario A: First Sick Leave (8 days)**
- Category: SIL
- Max Paid: 8
- Used: 0
- Result: **8 paid, 0 unpaid** ✅

**Scenario B: Second Sick Leave (5 days)**
- Category: SIL  
- Max Paid: 8
- Used: 8 (from first leave)
- Remaining: 0
- Result: **0 paid, 5 unpaid** ❌ (exceeded limit)

**Scenario C: Vacation Leave (3 days)**
- Category: Emergency Leave (EL)
- Max Paid: 5 (config for Vacation)
- Used: 0 (different category)
- Result: **3 paid, 0 unpaid** ✅

**Scenario D: Vacation Leave (7 days)**
- Category: EL
- Max Paid: 5
- Used: 0
- Result: **5 paid, 2 unpaid** (split)

### Example 3: New Hire (3 months tenure)

**Employee Profile**:
- Tenure: 3 months
- Tenure Bracket: < 6 months

**Any Leave Type** (e.g., 5 days):
- Max Paid: 0 (new hire)
- Result: **0 paid, 5 unpaid** (all unpaid)

## Leave Instance Limit

**3 Leave Instances Per Year** (separate from payment calculation):
- Each employee can file maximum 3 leave requests per year
- This limit is independent of paid/unpaid status
- After 3 leaves, employees cannot file more until next year
- Counter resets January 1st

**Example**:
```
Leave 1: 5 days (3 paid, 2 unpaid) → Total: 1/3 leaves
Leave 2: 3 days (0 paid, 3 unpaid) → Total: 2/3 leaves
Leave 3: 2 days (0 paid, 2 unpaid) → Total: 3/3 leaves
Leave 4: Cannot file (limit reached)
```

## Leave Tracker Display

### Columns

| Column | Description | Calculation |
|--------|-------------|-------------|
| **Total Leaves** | Number of leave instances used | Count of approved leaves / 3 |
| **Paid Days** | Total paid days across all leaves | Sum of `with_pay_days` |
| **Unpaid Days** | Total unpaid days across all leaves | Sum of `without_pay_days` |
| **Balance Status** | Remaining leave instances | 3 - (count of leaves) |

### Balance Status Colors

- 🟢 **Green** (2-3 leaves remaining): Good standing
- 🟡 **Yellow** (1 leave remaining): Warning
- 🔴 **Red** (0 leaves remaining): Limit reached

## Employee Experience

### When Filing Leave

**Step 1**: Employee selects leave type and dates  
**Step 2**: System calculates automatic payment split  
**Step 3**: On submit, modal shows payment breakdown:

```
═══════════════════════════════════════════════
   LEAVE PAYMENT INFORMATION
═══════════════════════════════════════════════

Your Tenure: 6 months

Category: SIL (Sick & Emergency Leave Combined)

Used 0 of 3 paid days for SIL this year.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAYMENT BREAKDOWN FOR THIS REQUEST:

✓ With Pay: 3 days
✗ Without Pay: 7 days

Total: 10 days

Message: Only 3 days are with pay. The remaining 
7 days will be without pay. You have used 0 of 3 
paid days for SIL this year.

═══════════════════════════════════════════════
```

**Step 4**: Employee confirms and submits  
**Step 5**: Leave request sent to Manager/HR for approval

### After Approval

Once HR Assistant approves the leave:
1. ✅ Appears in Leave Tracker automatically
2. ✅ Shows correct paid/unpaid day split
3. ✅ Updates total leaves counter (e.g., 0/3 → 1/3)
4. ✅ Reduces remaining leave instances
5. ✅ Tracks used paid days for future calculations

## HR Assistant View

### Leave Management Modal

When HR reviews a leave request, the modal shows:
- **Leave Type**: (e.g., Sick Leave)
- **Payment Terms**: with PAY / without PAY (auto-calculated)
- **Category**: SIL or Emergency Leave (auto-assigned, read-only)
- **Total Days**: Total leave duration
- **Payment Info**: Breakdown of paid/unpaid days

**Note**: HR cannot manually change payment terms - they are automatic based on tenure.

### Leave Tracker

HR can monitor all employees:
- View total leave instances used (X / 3)
- See breakdown of paid vs unpaid days
- Identify employees approaching 3-leave limit
- Export reports (PDF/Excel)

## Technical Implementation

### Backend (Laravel/PHP)

**Key Files**:
- `app/Models/LeaveRequest.php`:
  - `calculateEmployeeTenure()`: Gets employee's tenure in months
  - `determineLeaveCategory()`: Classifies leave as SIL or EL
  - `calculateAutomaticPaymentTerms()`: Core payment calculation logic

- `app/Http/Controllers/Api/LeaveRequestController.php`:
  - `store()`: Creates leave request with payment split
  - `getLeaveTrackerData()`: Fetches tracker data for all employees
  - `getLeaveSummary()`: Gets employee's leave balance and tenure info

**Payment Calculation Highlights**:
```php
// Count used paid days (updated to use with_pay_days field)
if ($isSIL) {
    $usedWithPayDays = self::where('employee_id', $employeeId)
        ->whereIn('type', ['Sick Leave', 'Emergency Leave'])
        ->whereYear('from', $currentYear)
        ->whereIn('status', ['approved'])
        ->sum('with_pay_days'); // ← Uses split field, not total_days
} else {
    $usedWithPayDays = self::where('employee_id', $employeeId)
        ->where('type', $leaveType)
        ->whereYear('from', $currentYear)
        ->whereIn('status', ['approved'])
        ->sum('with_pay_days'); // ← Accurate tracking
}
```

### Frontend (React.js)

**Key Files**:
- `src/components/Employee/EmbeddedLeaveForm.js`: Leave submission with payment modal
- `src/components/HrAssistant/LeaveManagement.js`: HR leave review interface
- `src/components/HrAssistant/LeaveTracker.js`: Leave tracker dashboard

## Benefits

### ✅ **Accuracy**
- Precise tracking of paid/unpaid days
- No manual calculation errors
- Automatic split for mixed-payment leaves

### ✅ **Transparency**
- Employees see clear payment breakdown before submission
- HR sees automatic calculations (no ambiguity)
- Leave tracker shows accurate data

### ✅ **Compliance**
- Follows tenure-based entitlement rules
- Prevents overpayment
- Proper documentation for payroll

### ✅ **Automation**
- Zero manual intervention required
- Consistent application of rules
- Real-time updates

### ✅ **Flexibility**
- Handles all leave types
- Supports split payments
- Tracks multiple leave instances

## Troubleshooting

### Issue: Paid days showing incorrectly

**Check**:
1. Employee's tenure (hire_date in employee_profiles)
2. Leave category (SIL vs EL)
3. Previously approved leaves this year
4. `with_pay_days` and `without_pay_days` fields in database

### Issue: Employee shows "already used all paid days"

**Cause**: Employee has exhausted their paid day entitlement for that category this year.

**Solution**: This is expected behavior. Future leaves will be unpaid.

### Issue: Leave not appearing in tracker

**Check**:
1. Leave status is "approved" (not pending/rejected)
2. Leave year matches selected year filter
3. Employee has employee_profile record
4. Browser cache (try refresh)

## Migration Notes

**For Existing Leave Records** (created before this system):
- Old leaves have `with_pay_days = 0` and `without_pay_days = 0`
- These can be manually updated if needed
- All **new** leaves automatically have correct values

**Database Migration**:
```bash
php artisan migrate
# Adds with_pay_days and without_pay_days columns
```

## Summary

The leave payment system now provides:
1. **Automatic calculation** based on employee tenure
2. **Accurate tracking** of paid vs unpaid days
3. **Split payment support** for leaves exceeding entitlements
4. **Real-time updates** in Leave Tracker
5. **Transparent communication** to employees
6. **3-instance limit** per year (separate from payment)

All future leave requests will automatically have the correct payment split based on the employee's tenure and leave type! 🎉



