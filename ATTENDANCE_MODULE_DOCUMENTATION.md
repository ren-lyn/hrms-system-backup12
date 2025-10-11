# Attendance Module Documentation

## Overview
The Attendance Module provides comprehensive attendance management functionality for the HRMS system. It allows HR Assistant and HR Staff to monitor employee attendance, import biometric data via Excel/CSV files, and view detailed attendance reports.

## Features

### ✅ **Completed Features**
1. **Enhanced Attendance Model**
   - Support for biometric IDs
   - Clock in/out times
   - Break times (lunch break tracking)
   - Total hours calculation
   - Overtime and undertime tracking
   - Status management (Present, Absent, Late, On Leave)

2. **Excel/CSV Import System**
   - Support for both Excel (.xlsx, .xls) and CSV files
   - Automatic employee matching via biometric IDs
   - Data validation and error reporting
   - Bulk import with progress tracking
   - Flexible date and time format parsing

3. **Dashboard Interface**
   - Real-time attendance statistics
   - Attendance rate calculations
   - Recent attendance records view
   - Date filtering capabilities
   - Visual status indicators

4. **Backend API Endpoints**
   - Dashboard data endpoint
   - Import functionality
   - CRUD operations for attendance records
   - Template download capability

5. **Sample Data Generation**
   - Command to generate realistic attendance data
   - Based on actual employee records
   - Includes weekday filtering
   - Various attendance patterns (present, absent, late)

## Technical Implementation

### Database Schema
```sql
-- Enhanced attendances table
CREATE TABLE attendances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED NOT NULL,
    employee_biometric_id VARCHAR(255) NULL,
    date DATE NOT NULL,
    clock_in TIME NULL,
    clock_out TIME NULL,
    break_out TIME NULL,
    break_in TIME NULL,
    total_hours DECIMAL(5,2) NULL,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    undertime_hours DECIMAL(5,2) DEFAULT 0,
    status ENUM('Present', 'Absent', 'Late', 'On Leave') DEFAULT 'Absent',
    remarks TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_employee_date (employee_id, date),
    INDEX idx_date_employee (date, employee_id),
    INDEX idx_biometric_id (employee_biometric_id),
    FOREIGN KEY (employee_id) REFERENCES employee_profiles(id) ON DELETE CASCADE
);
```

### API Endpoints

#### Attendance Dashboard
```
GET /api/attendance/dashboard
```
- **Parameters**: `date_from`, `date_to`
- **Response**: Statistics, recent attendance, daily summary
- **Access**: HR Assistant, HR Staff

#### Import Attendance
```
POST /api/attendance/import
```
- **Body**: FormData with file upload
- **Response**: Import results (success/failed/skipped counts)
- **Access**: HR Assistant, HR Staff

#### Get Import Template
```
GET /api/attendance/import/template
```
- **Response**: Expected headers and instructions
- **Access**: HR Assistant, HR Staff

#### CRUD Operations
```
GET /api/attendance                 # List with filters
POST /api/attendance                # Create record
PUT /api/attendance/{id}            # Update record
DELETE /api/attendance/{id}         # Delete record
```

### File Format Support

#### Expected CSV/Excel Headers
| Column | Required | Description |
|--------|----------|-------------|
| Biometric ID | Yes | Employee's biometric/time clock ID |
| Employee ID | Optional | Fallback identifier |
| Employee Name | Optional | For reference only |
| Date | Yes | Format: YYYY-MM-DD |
| Clock In | Optional | Format: HH:MM:SS or HH:MM |
| Clock Out | Optional | Format: HH:MM:SS or HH:MM |
| Break Out | Optional | Lunch/break start time |
| Break In | Optional | Lunch/break end time |
| Remarks | Optional | Notes or comments |

#### Sample Data Row
```csv
0001,1,Juan Dela Cruz,2025-01-15,08:00:00,17:00:00,12:00:00,13:00:00,Present
```

## Usage Instructions

### 1. Accessing the Attendance Dashboard
1. Log in as HR Assistant or HR Staff
2. Navigate to the Attendance section
3. View real-time statistics and recent records
4. Use date filters to focus on specific periods

### 2. Importing Biometric Data
1. Click the "Import Excel" button
2. Select your Excel (.xlsx, .xls) or CSV file
3. Wait for the import process to complete
4. Review the import results (imported/failed/skipped)
5. Dashboard will automatically refresh with new data

### 3. Downloading Import Template
1. Click the "Template" button
2. A CSV template will download with proper headers
3. Use this template to format your biometric export

### 4. Generating Sample Data
Use the artisan command to generate realistic test data:
```bash
php artisan attendance:generate-excel --days=30 --file=sample_attendance.csv
```

## File Locations

### Backend Files
- **Model**: `app/Models/Attendance.php`
- **Controller**: `app/Http/Controllers/Api/AttendanceController.php`
- **Service**: `app/Services/AttendanceImportService.php`
- **Migration**: `database/migrations/2025_01_05_082600_enhance_attendances_table.php`
- **Command**: `app/Console/Commands/GenerateAttendanceExcel.php`
- **Routes**: `routes/api.php` (lines 337-346)

### Frontend Files
- **Component**: `hrms-frontend/src/components/HrAssistant/AttendanceDashboard.js`

### Generated Files
- **Sample Data**: `storage/app/public/sample_attendance.csv`

## Configuration

### File Upload Limits
- Maximum file size: 10MB
- Supported formats: .xlsx, .xls, .csv
- Configured in `AttendanceController.php`

### Working Hours Configuration
- Standard work day: 8 hours
- Standard start time: 08:00 AM
- Configurable in Attendance model methods

### Role Permissions
Only users with roles `HR Assistant` or `HR Staff` can access attendance management features.

## Error Handling

### Common Import Errors
1. **Employee not found**: Biometric ID doesn't match any employee
2. **Invalid date format**: Date not in recognized format
3. **Duplicate records**: Attempt to import existing attendance
4. **File format error**: Unsupported file type or corrupted file

### Troubleshooting
- Check biometric IDs match employee records
- Ensure date formats are consistent (YYYY-MM-DD preferred)
- Verify file is not corrupted and under size limit
- Review error messages in import results

## Future Enhancements (Not Yet Implemented)
- [ ] Advanced reporting with charts
- [ ] Export attendance data to Excel
- [ ] Automated email reports
- [ ] Integration with payroll calculations
- [ ] Mobile attendance tracking
- [ ] Advanced filtering and search
- [ ] Attendance policies configuration
- [ ] Shift management integration

## Testing

### Manual Testing Steps
1. **Import Test**:
   - Generate sample CSV: `php artisan attendance:generate-excel --days=7`
   - Import via dashboard interface
   - Verify records appear correctly

2. **Dashboard Test**:
   - Access attendance dashboard
   - Change date filters
   - Verify statistics update correctly

3. **API Test**:
   - Test dashboard endpoint with authentication
   - Test import with valid/invalid files
   - Test CRUD operations

### Sample Test Data
The system includes a command to generate realistic test data based on your actual employee records:
```bash
# Generate 14 days of attendance data
php artisan attendance:generate-excel --days=14 --file=test_data.csv
```

## Security Considerations
- All endpoints require authentication (Sanctum)
- Role-based access control (HR Assistant/HR Staff only)
- File upload validation and sanitization
- SQL injection protection via Eloquent ORM
- Cross-site request forgery (CSRF) protection

## Performance Notes
- Database indexes on date and employee_id for fast queries
- Bulk import processing for large files
- Pagination for large record sets
- Efficient queries with eager loading for relationships

---

**Last Updated**: January 5, 2025
**Version**: 1.0.0
**Status**: Production Ready