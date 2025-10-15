# Attendance Import Instructions

## Overview
This HRMS system includes sample attendance data and templates for importing employee attendance records.

## Files Created

### 1. **sample_attendance_template.xlsx**
- **Purpose**: Empty template for importing attendance data
- **Usage**: Use this as a starting point for creating new attendance import files
- **Location**: Root directory of the HRMS project

### 2. **sample_attendance_records.xlsx** 
- **Purpose**: Complete example with 61 sample attendance records
- **Usage**: Use this to test the attendance import functionality
- **Location**: Root directory of the HRMS project

### 3. **sample_attendance_data.csv**
- **Purpose**: CSV version of the sample data for easy viewing/editing
- **Usage**: Can be imported directly or used as reference
- **Location**: Root directory of the HRMS project

## Sample Data Overview

### Employees Included (20 employees)
1. **John Doe** - Software Developer (IT Department)
2. **Jane Smith** - HR Manager (HR Department) 
3. **Michael Johnson** - Accountant (Finance Department)
4. **Sarah Williams** - Marketing Specialist (Marketing Department)
5. **David Brown** - System Administrator (IT Department)
6. **Emily Davis** - Sales Representative (Sales Department)
7. **Robert Miller** - Project Manager (Operations Department)
8. **Lisa Wilson** - Graphic Designer (Creative Department)
9. **James Moore** - Customer Service (Customer Service Department)
10. **Jennifer Taylor** - Business Analyst (Operations Department)
11. **Mark Anderson** - Quality Assurance (IT Department)
12. **Amanda Garcia** - HR Assistant (HR Department)
13. **Christopher Martinez** - Senior Developer (IT Department)
14. **Michelle Rodriguez** - Marketing Manager (Marketing Department)
15. **Daniel Lopez** - Network Engineer (IT Department)
16. **Jessica Gonzalez** - Content Writer (Creative Department)
17. **Kevin Wilson** - Sales Manager (Sales Department)
18. **Rachel Lee** - UX Designer (Creative Department)
19. **Brian Clark** - DevOps Engineer (IT Department)
20. **Stephanie Hall** - Executive Assistant (HR Department)

### Date Range
- **Period**: December 1-5, 2024 (5 working days)
- **Records**: 61 total attendance records across all employees

### Sample Scenarios Included
- ✅ **Present** - Normal 8-hour workdays
- ⚠️ **Late** - Employees arriving 5-30 minutes late
- ❌ **Absent** - Sick leave and other absences
- 🏖️ **On Leave** - Annual leave days
- ⏰ **Overtime** - Extended hours for system maintenance, deployments
- 🏃 **Early Departure** - Leaving early with permission
- 📝 **Detailed Remarks** - Reasons for late arrivals, absences, etc.

## Excel File Structure

### Required Columns
| Column | Description | Example |
|--------|-------------|---------|
| `Person ID` | Unique employee identifier | EM1002, EM1001 |
| `Person Name` | Employee full name | Renelyn Concina, Crystal Anne Barayang |
| `Punch Date` | Attendance date | 10/14/2025, 10/13/2025 |
| `Attendance record` | Punch time | 11:23:50, 01:05:30, 00:22:46 |
| `Verify Type` | Verification method (Optional) | Fingerprint |
| `TimeZone` | Time zone (Optional) | +08:00 |
| `Source` | Source identifier (Optional) | UWH5253600013 |

### Processing Logic
The system processes raw fingerprint punch data by:
1. **Collecting all punches** per employee per day from the Excel file
2. **Extracting first punch** as Time-In (clock_in)
3. **Extracting last punch** as Time-Out (clock_out)
4. **Calculating total hours** based on time-in and time-out
5. **Determining status** (Present, Late, Absent, etc.) based on working hours

### Status Options
- **Present** - Employee worked normal hours (8+ hours)
- **Late** - Employee arrived after scheduled time
- **Absent** - Employee did not come to work (no punches)
- **On Leave** - Employee on approved leave

## How to Import

1. **Access the Attendance Dashboard**
   - Navigate to HR Assistant → Attendance Dashboard
   - Click the "Import Data" button

2. **Upload the Excel File**
   - Select either the template (empty) or sample records (with data)
   - Supported formats: .xlsx, .xls, .csv
   - Click "Import"

3. **Review Import Results**
   - The system will show:
     - ✅ Successfully imported records
     - ❌ Failed records with error messages  
     - ⚠️ Skipped records (duplicates, etc.)

## Testing the System

1. **First, seed the employee data:**
   ```bash
   cd hrms-backend
   php artisan db:seed --class=SampleEmployeeSeeder
   ```

2. **Import the sample attendance data:**
   - Use `sample_attendance_records.xlsx`
   - This will populate the system with realistic attendance data

3. **View the dashboard:**
   - Check the statistics cards
   - Browse attendance records
   - Test filtering options

## Creating Your Own Data

1. **Start with the template:**
   - Copy `sample_attendance_template.xlsx`
   - Add your employee information
   - Fill in attendance records

2. **Follow the format:**
   - Use the exact column names shown above
   - Match the date format: YYYY-MM-DD
   - Use 24-hour time format: HH:MM:SS
   - Keep status values consistent

3. **Best practices:**
   - One row per employee per day
   - Calculate total_hours = clock_out - clock_in - break_duration
   - Add meaningful remarks for special cases
   - Validate data before importing

## Troubleshooting

### Common Issues
- **Employee not found**: Make sure employee_id exists in the system
- **Date format errors**: Use YYYY-MM-DD format
- **Time format errors**: Use HH:MM:SS format (24-hour)
- **Duplicate records**: One record per employee per day only

### Error Messages
- The import will show specific error messages for each failed record
- Fix the data in Excel and re-import
- Successfully imported records won't be duplicated

## Support

For questions or issues with attendance import:
1. Check the import error messages first
2. Verify your Excel format matches the template
3. Ensure employee records exist before importing attendance
4. Contact your system administrator if issues persist