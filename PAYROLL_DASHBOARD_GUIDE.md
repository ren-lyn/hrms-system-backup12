# Payroll Dashboard - HR Assistant Guide

## Overview
The Payroll Dashboard is a comprehensive tool for HR Assistants to manage employee payroll, generate payroll reports, and handle compensation calculations.

## Features

### 1. Dashboard Overview
- **Statistics Cards**: Display key metrics including total employees, processed/pending payrolls, gross pay, deductions, and net pay
- **Period Selection**: Choose payroll periods with easy navigation between months
- **Real-time Data**: Live updates of payroll information

### 2. Payroll Management
- **Employee List**: View all employees with their payroll information
- **Search & Filter**: Find specific employees or filter by status
- **Payroll Details**: Detailed breakdown of earnings and deductions for each employee

### 3. Payroll Generation
- **Generate Payroll**: Create payroll for selected period
- **Attendance Integration**: Automatically includes attendance data
- **Bulk Processing**: Process multiple employees at once

### 4. Export & Reporting
- **Excel Export**: Export payroll data to Excel format
- **PDF Export**: Generate PDF reports for payroll
- **Custom Periods**: Export data for any selected time period

## Navigation

### Accessing Payroll Dashboard
1. Log in as HR Assistant
2. Click on "Payroll" in the sidebar navigation
3. The payroll dashboard will load with current month's data

### Sidebar Navigation
The payroll link in the sidebar (`/dashboard/hr-assistant/payroll`) will take you directly to the payroll dashboard.

## Key Components

### 1. Period Selection
- Use the Previous/Next buttons to navigate between months
- Manually select start and end dates
- Click the refresh button to reload data

### 2. Statistics Overview
- **Total Employees**: Number of active employees
- **Processed**: Number of completed payrolls
- **Pending**: Number of payrolls awaiting processing
- **Gross Pay**: Total gross salary amount
- **Deductions**: Total deductions (SSS, PhilHealth, Pag-IBIG, Tax)
- **Net Pay**: Total net salary after deductions

### 3. Employee Payroll Table
- **Employee Information**: Name, ID, and position
- **Salary Breakdown**: Basic salary, overtime, allowances
- **Calculations**: Gross pay, deductions, net pay
- **Status**: Current payroll status (Processed, Pending, Draft)
- **Actions**: View details, edit payroll

### 4. Payroll Actions
- **Generate Payroll**: Create new payroll for selected period
- **Export Excel**: Download payroll data as Excel file
- **Export PDF**: Generate PDF report
- **View Details**: See detailed payroll breakdown

## API Integration

The payroll dashboard integrates with the following backend endpoints:

- `GET /api/payroll` - Fetch payroll data
- `GET /api/payroll/attendance-summary` - Get attendance data for payroll
- `POST /api/payroll/generate` - Generate new payroll
- `GET /api/payroll/export` - Export payroll data
- `GET /api/payroll/{id}` - Get specific payroll details
- `PUT /api/payroll/{id}` - Update payroll record

## File Structure

```
hrms-frontend/src/
├── components/HrAssistant/
│   ├── PayrollDashboard.js          # Main payroll component
│   └── PayrollDashboard.css         # Styling for payroll dashboard
├── api/
│   └── payroll.js                   # API service functions
└── App.js                           # Updated with payroll route
```

## Styling

The payroll dashboard uses custom CSS classes for enhanced visual appeal:
- `payroll-dashboard` - Main container styling
- `payroll-stats-card` - Statistics card styling with hover effects
- `payroll-table-card` - Table container styling
- `payroll-modal` - Modal styling with gradient headers
- `payroll-details-section` - Details section styling
- `payroll-net-pay` - Net pay highlight styling

## Responsive Design

The dashboard is fully responsive and adapts to different screen sizes:
- Mobile: Single column layout, simplified table
- Tablet: Adjusted spacing and font sizes
- Desktop: Full multi-column layout with all features

## Error Handling

The dashboard includes comprehensive error handling:
- Loading states with spinners
- Error messages with dismissible alerts
- Toast notifications for user feedback
- Graceful fallbacks for missing data

## Future Enhancements

Potential improvements for the payroll dashboard:
1. **Payroll Templates**: Save and reuse payroll configurations
2. **Automated Calculations**: More sophisticated salary calculations
3. **Approval Workflow**: Multi-level approval process
4. **Integration**: Connect with accounting systems
5. **Notifications**: Email notifications for payroll completion
6. **Audit Trail**: Track all payroll changes and modifications

## Troubleshooting

### Common Issues
1. **Data not loading**: Check network connection and API endpoints
2. **Export not working**: Ensure proper file permissions
3. **Styling issues**: Verify CSS file is properly imported
4. **Navigation problems**: Check route configuration in App.js

### Support
For technical support or feature requests, contact the development team or refer to the main HRMS documentation.
