# Half-Day Leave and Fractional Deduction Feature

## Overview
This feature enhances the Leave Management Module to support both half-day leave filing and multi-day leave with fractional deductions. Employees can now file for partial days (0.5 day deduction) and combine full days with half-days for flexible leave management.

## Features Implemented

### 1. Leave Duration Selection
- **Whole Day**: Full day leave (1.0 day deduction)
- **Half Day**: Partial day leave (0.5 day deduction) - employee is absent for either morning (AM) or afternoon (PM) only

### 2. Half-Day Period Selection
When "Half Day" is selected, employees can choose:
- **AM (Morning)**: Absent from 8:00 AM to 12:00 PM. Expected to report in the afternoon (1:00 PM onwards)
- **PM (Afternoon)**: Absent from 1:00 PM to 5:00 PM. Expected to report in the morning (8:00 AM to 12:00 PM)

### 3. Multi-Day Leave with Half-Day
The system supports scenarios where employees file for multiple days combined with a half-day:
- **Example 1**: 3 full days + 1 half-day = 3.5 days total deduction
- **Example 2**: Single day half-day = 0.5 days deduction
- **Example 3**: Jan 1-3 with half-day = 2.5 days (2 full days + 0.5 day)

## Database Changes

### New Columns Added to `leave_requests` Table:
1. `leave_duration` (enum: 'whole_day', 'half_day') - Default: 'whole_day'
2. `half_day_period` (enum: 'am', 'pm') - Nullable, only relevant when leave_duration is 'half_day'

### Modified Columns:
1. `total_days` - Changed from `integer` to `decimal(5,2)` to support fractional values (e.g., 0.5, 1.5, 3.5)
2. `with_pay_days` - Changed from `integer` to `decimal(5,2)` to support fractional deductions
3. `without_pay_days` - Changed from `integer` to `decimal(5,2)` to support fractional deductions

## User Interface Enhancements

### Informative Labels
The form includes comprehensive labels to help employees understand the feature:

1. **Leave Duration Dropdown Label**:
   - Explains what "Whole Day" and "Half Day" mean
   - Shows deduction amounts (1.0 day vs 0.5 day)
   - Provides context-specific help based on date selection

2. **Half-Day Period Dropdown Label**:
   - Explains AM and PM periods with specific time ranges
   - Clarifies attendance expectations for each period
   - Provides context for multi-day leave scenarios

3. **Total Days Display**:
   - Shows fractional days (e.g., 3.5 days) when applicable
   - Displays corresponding hours calculation
   - Shows half-day indicator when applicable

## Calculation Logic

### Frontend Calculation:
```javascript
// Single day half-day: 0.5 days
// Multi-day with half-day: (totalDays - 1) + 0.5
// Example: Jan 1-3 with half-day = (3 - 1) + 0.5 = 2.5 days
```

### Backend Validation:
- Validates `total_days` as numeric with minimum 0.5
- Validates `leave_duration` as enum ('whole_day', 'half_day')
- Validates `half_day_period` as required when `leave_duration` is 'half_day'
- Ensures fractional days are properly stored and calculated

### Payment Calculation:
- Payment terms (with pay/without pay) are calculated based on fractional days
- Half-day deductions (0.5 days) are properly reflected in leave credits
- Multi-day leaves with fractional components are accurately computed

## Display Updates

### Leave Details Table:
- Shows fractional days (e.g., "3.5 days")
- Displays half-day indicator with period (AM/PM) when applicable
- Properly formats decimal values

### Leave History Table:
- Shows fractional days in history records
- Displays half-day information for past leave requests
- Maintains consistency with current leave display

## API Changes

### Request Parameters:
- `leave_duration`: Optional, defaults to 'whole_day'
- `half_day_period`: Required when `leave_duration` is 'half_day'
- `total_days`: Now accepts decimal values (e.g., 0.5, 1.5, 3.5)

### Response Format:
- `total_days`: Returns decimal values
- `with_pay_days`: Returns decimal values
- `without_pay_days`: Returns decimal values
- `leave_duration`: Included in response
- `half_day_period`: Included in response when applicable

## Testing Scenarios

1. **Single Day Half-Day Leave**:
   - Select same start and end date
   - Choose "Half Day" duration
   - Select AM or PM
   - Expected: 0.5 days deduction

2. **Multi-Day with Half-Day**:
   - Select date range (e.g., Jan 1-3)
   - Choose "Half Day" duration
   - Select AM or PM
   - Expected: 2.5 days deduction (2 full days + 0.5 day)

3. **Payment Calculation**:
   - Verify fractional days are correctly calculated in payment terms
   - Ensure half-day deductions reflect in leave credits
   - Check that remaining leave credits update correctly

## Migration Instructions

1. Run the database migrations:
   ```bash
   php artisan migrate
   ```

2. The migrations will:
   - Add `leave_duration` and `half_day_period` columns
   - Convert `total_days`, `with_pay_days`, and `without_pay_days` to decimal

3. Existing leave requests will default to 'whole_day' duration

## Notes

- Half-day leave applies to either the start date or end date for multi-day leaves
- The system automatically calculates the correct deduction based on the selected duration
- All fractional deductions are properly reflected in leave summaries, approval workflows, HR dashboard, and reporting
- The feature maintains backward compatibility with existing whole-day leave requests



