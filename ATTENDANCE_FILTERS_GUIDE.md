# Attendance Dashboard - Date Range & Search Filters Guide

## Overview
The Attendance Dashboard now includes comprehensive filtering capabilities to help HR Assistants view and analyze attendance records more effectively.

## Features Added

### 1. **Date Range Filter**
- **From Date**: Select the start date for the attendance records
- **To Date**: Select the end date for the attendance records
- **Default**: Current month (first day to last day)
- **Use Case**: View attendance for specific periods (weekly, monthly, quarterly, custom ranges)

### 2. **Search Filter**
- **Search by**: Employee name, position, or department
- **Type**: Real-time search (updates as you type)
- **Example**: Search "Juan" to find all employees with "Juan" in their name
- **Use Case**: Quickly find specific employees' attendance records

### 3. **Status Filter**
- **Options**: 
  - All Status (default)
  - Present
  - Absent
  - Late
  - On Leave
- **Use Case**: Filter to see only specific attendance statuses

### 4. **Reset Filters**
- **Button**: Circular arrow icon
- **Action**: Resets all filters to default values (current month, no search, all statuses)
- **Use Case**: Quickly return to default view

## How to Use

### Viewing Current Month Attendance
1. Open the Attendance Dashboard
2. By default, it shows the current month's records
3. Statistics cards update automatically

### Viewing Custom Date Range
1. Click on the "From Date" field
2. Select your desired start date
3. Click on the "To Date" field
4. Select your desired end date
5. Records update automatically

### Searching for Specific Employees
1. Type in the "Search Employee" field
2. Enter name, position, or department
3. Results filter in real-time
4. Clear the field to see all records again

### Filtering by Status
1. Click the "Status" dropdown
2. Select desired status (Present, Absent, Late, or On Leave)
3. Records update to show only that status
4. Select "All Status" to see everything

### Combining Filters
You can use multiple filters together:
- **Example 1**: View all "Late" records for "October 2025"
  - Set date range: Oct 1 - Oct 31
  - Set status: Late
  
- **Example 2**: Find "Juan's" attendance for the first week of October
  - Set date range: Oct 1 - Oct 7
  - Search: Juan
  
- **Example 3**: View all "Absent" employees in the IT department
  - Set status: Absent
  - Search: IT

## Backend API

### Endpoint
```
GET /api/attendance/dashboard
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date_from` | date | No | Start date (YYYY-MM-DD). Default: First day of current month |
| `date_to` | date | No | End date (YYYY-MM-DD). Default: Last day of current month |
| `search` | string | No | Search term for employee name, position, or department |
| `status` | string | No | Filter by status: Present, Absent, Late, On Leave, or 'all' |
| `per_page` | integer | No | Number of records per page. Default: 50 |

### Example Requests

**Get current month:**
```
GET /api/attendance/dashboard
```

**Get specific date range:**
```
GET /api/attendance/dashboard?date_from=2025-10-01&date_to=2025-10-15
```

**Search for employee:**
```
GET /api/attendance/dashboard?search=Juan
```

**Filter by status:**
```
GET /api/attendance/dashboard?status=Late
```

**Combined filters:**
```
GET /api/attendance/dashboard?date_from=2025-10-01&date_to=2025-10-31&search=Juan&status=Present
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_employees": 64,
      "total_records": 15,
      "present_count": 8,
      "absent_count": 3,
      "late_count": 4,
      "attendance_rate": 80.0
    },
    "recent_attendance": [...],
    "pagination": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 50,
      "total": 15
    },
    "daily_summary": {...},
    "date_range": {
      "from": "2025-10-01",
      "to": "2025-10-31"
    },
    "filters": {
      "search": "Juan",
      "status": "Present"
    }
  }
}
```

## Files Modified

### Backend
- `hrms-backend/app/Http/Controllers/Api/AttendanceController.php`
  - Enhanced `dashboard()` method with filter parameters
  - Added search query with employee relationship
  - Added status filtering
  - Added pagination support

### Frontend
- `hrms-frontend/src/components/HrAssistant/AttendanceDashboard.js`
  - Added date range state management
  - Added search input field
  - Added status dropdown filter
  - Added reset filters button
  - Implemented real-time filtering with useEffect
  - Updated UI with filter controls card

## Testing

Run the test script to verify filters:
```bash
cd hrms-backend
php test_filters.php
```

Expected output:
- Date range filtering: ✅ Working
- Status filtering: ✅ Working
- Search filtering: ✅ Working
- Combined filters: ✅ Working

## Tips for HR Assistants

1. **Monthly Reports**: Use date range to select the entire month
2. **Weekly Reviews**: Set date range to Monday-Friday of specific week
3. **Late Arrivals**: Use status filter "Late" to identify patterns
4. **Department Analysis**: Search by department name to view team attendance
5. **Individual Tracking**: Search employee name to view their attendance history
6. **Quick Reset**: Click the reset button (↻) to clear all filters instantly

## Troubleshooting

**Issue**: No records showing
- **Solution**: Check if date range includes records. Try expanding the date range or click reset.

**Issue**: Search not finding employee
- **Solution**: Try partial names (e.g., "Juan" instead of "Juan Dela Cruz")

**Issue**: Statistics not updating
- **Solution**: Refresh the page or click the reset button

## Future Enhancements (Potential)
- Export filtered results to Excel
- Save custom filter presets
- Quick date range buttons (Today, This Week, Last Month, etc.)
- Visual charts based on filtered data
- Email reports with filtered data
