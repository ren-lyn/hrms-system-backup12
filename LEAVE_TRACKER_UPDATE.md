# Leave Tracker Update - Tenure-Based System Implementation

## Overview
The Leave Tracker has been updated to align with the new tenure-based leave payment system. The tracker now monitors leave instances per employee (max 3 per year) instead of tracking total days.

## Changes Made

### 1. **Column Structure Updated**

**Before:**
| Employee | Department | Position | Leave Periods | Total Days | Paid Days | Unpaid Days | Remaining Paid | Remaining Unpaid | Balance Status |

**After:**
| Employee | Department | Position | Leave Periods | Total Leaves | Paid Days | Unpaid Days | Balance Status |

### 2. **Column Definitions**

#### **Total Leaves**
- **Display**: `X / 3` format (e.g., "2 / 3")
- **Logic**: Count of leave instances taken in the year
- **Maximum**: 3 leave instances per employee per year
- **Calculation**: Based on the number of approved leave requests

#### **Paid Days**
- **Display**: Number (e.g., "8")
- **Logic**: Total days marked as "with PAY" based on:
  - **SIL (Sick & Emergency Leave)**: 
    - < 6 months tenure: 0 days
    - 6-12 months tenure: 3 days
    - 1+ year tenure: 8 days
  - **Other Leave Types**:
    - < 1 year tenure: 0 days
    - 1+ year tenure: Based on leave type config (Vacation: 5, Maternity: 105, Paternity: 7, etc.)
- **Calculation**: Sum of all days from approved leaves with `terms = 'with PAY'`

#### **Unpaid Days**
- **Display**: Number (e.g., "2")
- **Logic**: Total days marked as "without PAY"
- **Calculation**: Sum of all days from approved leaves with `terms = 'without PAY'`

#### **Balance Status**
- **Display**: "X leaves left" with color-coded icon
- **Logic**:
  - **Green (Success)**: 2 or 3 leaves remaining
  - **Yellow (Warning)**: 1 leave remaining
  - **Red (Danger)**: 0 leaves remaining
- **Calculation**: `3 - (number of approved leave instances)`

### 3. **Removed Columns**

✅ **Removed "Remaining Paid"**: No longer needed with tenure-based system  
✅ **Removed "Remaining Unpaid"**: No longer needed with tenure-based system

These columns were removed because:
- Payment is now determined by employee tenure, not a fixed leave balance
- Each employee gets max 3 leave instances regardless of days
- Paid/unpaid status is calculated automatically based on tenure and leave type rules

### 4. **Visual Changes**

#### **Leave Periods Display**
- **Before**: Colored badges for leave types
- **After**: Plain text (13px, bold) with date ranges below

Example:
```
Sick Leave
Jun 15, 2024 - Jun 20, 2024

Vacation Leave
Aug 10, 2024 - Aug 15, 2024
```

#### **Data Display**
- All numerical values now shown as plain text (14px, bold)
- No colored badges except for balance status icons
- Clean, minimal appearance consistent with the rest of the system

### 5. **PDF Export Updated**

**Export Headers Changed:**
- Old: `['Employee', 'Department', 'Position', 'Total Days', 'Paid Days', 'Unpaid Days', 'Remaining Paid', 'Remaining Unpaid']`
- New: `['Employee', 'Department', 'Position', 'Total Leaves', 'Paid Days', 'Unpaid Days', 'Balance']`

**Data Format:**
- Total Leaves: Shows as "X / 3"
- Balance: Shows as "X leave(s) left"

## Integration with Leave Approval System

### Automatic Tracker Updates

When an HR Assistant approves a leave request:

1. **Leave Request Approved** → Status changes to `'approved'`
2. **Automatic Calculation**:
   - System counts approved leaves for the employee in current year
   - Adds to "Total Leaves" counter
   - Adds days to "Paid Days" or "Unpaid Days" based on `terms` field
3. **Tracker Display Updates**:
   - Total Leaves increments (e.g., 1/3 → 2/3)
   - Paid/Unpaid days update automatically
   - Balance status updates (color changes based on remaining leaves)

### Leave Instance Tracking Logic

```javascript
// Count leave instances
const totalLeaves = employee.leavePeriods ? employee.leavePeriods.length : 0;

// Calculate remaining (max 3)
const remainingLeaves = Math.max(0, 3 - totalLeaves);

// Balance status based on remaining instances
if (remainingLeaves >= 2) {
  // Green - Good standing
  status = 'success';
} else if (remainingLeaves === 1) {
  // Yellow - Warning (only 1 leave left)
  status = 'warning';
} else {
  // Red - No leaves remaining
  status = 'danger';
}
```

## Example Scenarios

### Scenario 1: New Employee (< 6 months tenure)

**Employee**: Sarah Wilson  
**Tenure**: 3 months  
**Leave Taken**: 1 instance - Sick Leave (5 days)

**Tracker Display**:
| Total Leaves | Paid Days | Unpaid Days | Balance |
|--------------|-----------|-------------|---------|
| 1 / 3 | 0 | 5 | ✅ 2 leaves left |

**Explanation**: New employee, so all days are without pay. Still has 2 leave instances remaining.

### Scenario 2: Mid-Tenure Employee (6-12 months)

**Employee**: John Smith  
**Tenure**: 8 months  
**Leaves Taken**: 
- Instance 1: Sick Leave (3 days)
- Instance 2: Vacation Leave (5 days)

**Tracker Display**:
| Total Leaves | Paid Days | Unpaid Days | Balance |
|--------------|-----------|-------------|---------|
| 2 / 3 | 3 | 5 | ⚠️ 1 leave left |

**Explanation**: 
- SIL gets 3 paid days (6-12 months tenure)
- Vacation is unpaid (< 1 year tenure)
- 1 leave instance remaining

### Scenario 3: Senior Employee (1+ year)

**Employee**: Emily Johnson  
**Tenure**: 2 years  
**Leaves Taken**:
- Instance 1: Sick Leave (5 days)
- Instance 2: Vacation Leave (5 days)
- Instance 3: Emergency Leave (3 days)

**Tracker Display**:
| Total Leaves | Paid Days | Unpaid Days | Balance |
|--------------|-----------|-------------|---------|
| 3 / 3 | 13 | 0 | ❌ 0 leaves left |

**Explanation**:
- SIL: 8 days paid (5 + 3 = 8 days from Sick & Emergency)
- Vacation: 5 days paid
- Total: 13 paid days
- No leave instances remaining (reached limit of 3)

## Benefits

1. ✅ **Clarity**: Shows actual leave instances (3 max) instead of confusing day counts
2. ✅ **Tenure-Aligned**: Reflects the new tenure-based payment system
3. ✅ **Simplified**: Removed unnecessary "Remaining" columns
4. ✅ **Visual Consistency**: Plain text design matches other updated components
5. ✅ **Accurate Tracking**: Automatically updates when HR approves leaves
6. ✅ **Better Monitoring**: HR can easily see who's approaching the 3-leave limit

## Notes for HR Assistants

- **3 Leave Limit**: Each employee can take maximum 3 leave instances per year
- **Automatic Payment**: Payment terms are calculated automatically based on:
  - Employee tenure (< 6 months, 6-12 months, 1+ year)
  - Leave type (SIL vs other types)
  - Used paid days for that category
- **No Manual Entry**: You don't set "Remaining" days - system calculates everything
- **Color Coding**:
  - 🟢 Green = Employee has 2-3 leaves available
  - 🟡 Yellow = Employee has 1 leave left (warning)
  - 🔴 Red = Employee has no leaves remaining

## Testing

To verify the tracker works correctly:

1. Approve a leave request for an employee
2. Navigate to Leave Tracker
3. Verify:
   - Total Leaves increments
   - Paid/Unpaid Days update correctly based on tenure
   - Balance status shows correct remaining leaves
   - Color coding is appropriate

## Future Enhancements

Consider adding:
- Tenure display in employee info
- Leave type breakdown (how many SIL vs other types used)
- Year-over-year comparison
- Alerts when employee approaches 3-leave limit

