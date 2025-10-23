# Interview Scheduling API Documentation

## Overview
This document describes the complete Interview Scheduling functionality for the HRMS system. The system allows HR Staff and HR Assistants to schedule interviews for shortlisted applicants, and applicants can view their scheduled interviews in their Personal Onboarding dashboard.

## Database Structure

### Interviews Table
```sql
CREATE TABLE interviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    duration INT DEFAULT 30 COMMENT 'Interview duration in minutes',
    interview_type ENUM('in-person', 'video', 'phone', 'online') DEFAULT 'in-person',
    location VARCHAR(255) NOT NULL,
    interviewer VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    status ENUM('scheduled', 'completed', 'cancelled', 'rescheduled') DEFAULT 'scheduled',
    feedback TEXT NULL,
    result ENUM('passed', 'failed', 'pending') NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    INDEX idx_interview_date (interview_date),
    INDEX idx_status (status),
    INDEX idx_interview_datetime (interview_date, interview_time)
);
```

### Applications Table Status Enum
The applications table status column has been updated to include interview status:
```sql
ENUM('Applied', 'Pending', 'ShortListed', 'Interview', 'On going Interview', 'Offered', 'Offered Accepted', 'Onboarding', 'Hired', 'Rejected')
```

## API Endpoints

### 1. Create Interview (HR Staff/Assistant)
**POST** `/api/interviews`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
    "application_id": 1,
    "interview_date": "2024-12-25",
    "interview_time": "10:00",
    "duration": 60,
    "interview_type": "in-person",
    "location": "Main Office, Room 101",
    "interviewer": "John Doe",
    "notes": "Please bring your resume and portfolio"
}
```

**Response (201 Created):**
```json
{
    "message": "Interview scheduled successfully",
    "interview": {
        "id": 1,
        "application_id": 1,
        "interview_date": "2024-12-25",
        "interview_time": "10:00:00",
        "duration": 60,
        "interview_type": "in-person",
        "location": "Main Office, Room 101",
        "interviewer": "John Doe",
        "notes": "Please bring your resume and portfolio",
        "status": "scheduled",
        "created_at": "2024-10-23T10:00:00.000000Z",
        "updated_at": "2024-10-23T10:00:00.000000Z",
        "application": {
            "id": 1,
            "status": "On going Interview",
            "job_posting": {
                "id": 1,
                "title": "Software Developer",
                "department": "IT",
                "position": "Developer"
            },
            "applicant": {
                "id": 1,
                "name": "John Applicant",
                "email": "john@example.com"
            }
        }
    }
}
```

### 2. Get User Interviews (Applicant)
**GET** `/api/user-interviews`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `application_ids`: Comma-separated list of application IDs
- `status` (optional): Filter by interview status
- `upcoming` (optional): Filter for upcoming interviews only

**Example Request:**
```
GET /api/user-interviews?application_ids=1,2,3&upcoming=true
```

**Response (200 OK):**
```json
[
    {
        "id": 1,
        "application_id": 1,
        "interview_date": "2024-12-25",
        "interview_time": "10:00:00",
        "duration": 60,
        "interview_type": "in-person",
        "location": "Main Office, Room 101",
        "interviewer": "John Doe",
        "notes": "Please bring your resume and portfolio",
        "status": "scheduled",
        "feedback": null,
        "result": null,
        "created_at": "2024-10-23T10:00:00.000000Z",
        "updated_at": "2024-10-23T10:00:00.000000Z",
        "application": {
            "id": 1,
            "status": "On going Interview",
            "applied_at": "2024-10-20T09:00:00.000000Z",
            "job_posting": {
                "id": 1,
                "title": "Software Developer",
                "department": "IT",
                "position": "Developer"
            },
            "applicant": {
                "id": 1,
                "name": "John Applicant",
                "email": "john@example.com"
            }
        }
    }
]
```

### 3. Get User Interviews by User ID (Alternative)
**GET** `/api/interviews/user/{user_id}`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** Same as above endpoint.

### 4. Get All Interviews (HR Staff/Assistant)
**GET** `/api/interviews`

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `application_id` (optional): Filter by specific application
- `status` (optional): Filter by interview status
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date
- `upcoming` (optional): Filter for upcoming interviews only

### 5. Get Specific Interview
**GET** `/api/interviews/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

### 6. Update Interview
**PUT** `/api/interviews/{id}`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
    "interview_date": "2024-12-26",
    "interview_time": "14:00",
    "duration": 90,
    "location": "Conference Room A",
    "interviewer": "Jane Smith",
    "notes": "Updated interview details",
    "status": "rescheduled",
    "feedback": "Interview went well",
    "result": "passed"
}
```

### 7. Delete Interview
**DELETE** `/api/interviews/{id}`

**Headers:**
```
Authorization: Bearer {token}
```

## Notification System

### InterviewScheduled Notification
When an interview is scheduled, the system automatically:

1. **Updates Application Status**: Changes from "ShortListed" to "On going Interview"
2. **Sends Database Notification**: Stores notification in the `notifications` table
3. **Sends Email Notification**: Sends email to the applicant with interview details

**Notification Data Structure:**
```json
{
    "type": "interview_scheduled",
    "title": "Interview Scheduled",
    "message": "Your interview has been scheduled for Dec 25, 2024 at 10:00 AM",
    "interview_id": 1,
    "application_id": 1,
    "interview_date": "2024-12-25",
    "interview_time": "10:00:00",
    "location": "Main Office, Room 101",
    "interviewer": "John Doe",
    "position": "Software Developer",
    "created_at": "2024-10-23T10:00:00.000000Z"
}
```

## Frontend Integration

### HR Staff/Assistant Side
The interview scheduling is integrated into the HR onboarding components:
- `hrms-frontend/src/components/HrStaff/Onboarding.js`
- `hrms-frontend/src/components/HrAssistant/OnboardingDashboard.js`

**Key Function:**
```javascript
const handleSendInterviewInvite = async () => {
    try {
        const response = await axios.post(
            `http://localhost:8000/api/applications/${selectedApplicantForInterview.id}/schedule-interview`,
            {
                interview_date: interviewData.interview_date,
                interview_time: interviewData.interview_time,
                duration: parseInt(interviewData.duration),
                interview_type: interviewData.interview_type,
                location: interviewData.location,
                interviewer: interviewData.interviewer,
                notes: interviewData.notes
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
            }
        );
        
        alert('Interview invitation sent successfully!');
        // ... handle success
    } catch (error) {
        console.error('Error scheduling interview:', error);
        alert('Failed to schedule interview. Please try again.');
    }
};
```

### Applicant Side
The interview viewing is integrated into:
- `hrms-frontend/src/components/PersonalOnboarding.js`

**Key Function:**
```javascript
const fetchInterviewData = async () => {
    try {
        // Get user's applications first
        const applications = userApplications.length > 0 ? userApplications : await fetchUserApplications();
        const applicationIds = applications.map(app => app.id);
        
        // Fetch interviews using application IDs
        const response = await axios.get('http://localhost:8000/api/user-interviews', {
            headers: { Authorization: `Bearer ${token}` },
            params: { application_ids: applicationIds }
        });
        
        setInterviewData(response.data);
    } catch (error) {
        console.error('Error fetching interview data:', error);
        setInterviewData([]);
    }
};
```

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
    "error": "Invalid application status",
    "message": "Interviews can only be scheduled for applications with status: ShortListed. Current status: Applied"
}
```

**404 Not Found:**
```json
{
    "error": "Application not found",
    "message": "The specified application does not exist"
}
```

**422 Validation Error:**
```json
{
    "error": "Validation failed",
    "errors": {
        "interview_date": ["The interview date must be a date after or equal to today."],
        "interviewer": ["The interviewer field is required."]
    },
    "message": "Please check the form data and try again"
}
```

**500 Internal Server Error:**
```json
{
    "error": "Failed to create interview",
    "message": "Database connection failed"
}
```

## Testing

### Test Command
Run the comprehensive test suite:
```bash
php artisan test:interview-scheduling
```

### Manual Testing Steps

1. **Create Test Data:**
   - Create a user with applicant profile
   - Create a job posting
   - Create an application with "ShortListed" status

2. **Schedule Interview:**
   - Use the HR interface to schedule an interview
   - Verify the interview is created in the database
   - Check that application status is updated to "On going Interview"

3. **View Interview (Applicant):**
   - Login as the applicant
   - Navigate to Personal Onboarding
   - Check the Interview tab
   - Verify interview details are displayed correctly

4. **Test Notifications:**
   - Check that notification is created in the database
   - Verify email is sent (if mail is configured)

## Security Considerations

1. **Authentication**: All endpoints require valid Bearer token
2. **Authorization**: HR staff can only schedule interviews for applications they have access to
3. **Validation**: All input data is validated before processing
4. **SQL Injection**: Using Eloquent ORM prevents SQL injection attacks
5. **XSS Protection**: All output is properly escaped

## Performance Considerations

1. **Database Indexes**: Proper indexes on frequently queried columns
2. **Eager Loading**: Using `with()` to prevent N+1 queries
3. **Pagination**: For large datasets, implement pagination
4. **Caching**: Consider caching frequently accessed data

## Deployment Notes

1. **Database Migrations**: Run `php artisan migrate` to apply database changes
2. **Queue Workers**: Ensure queue workers are running for notifications
3. **Mail Configuration**: Configure mail settings for email notifications
4. **Environment Variables**: Set proper database and mail configuration

## Troubleshooting

### Common Issues

1. **"Failed to schedule interview" Error:**
   - Check if application status is "ShortListed"
   - Verify all required fields are provided
   - Check database connection

2. **Interview Not Appearing for Applicant:**
   - Verify application IDs are correct
   - Check if user has proper applications
   - Verify API endpoint is working

3. **Notification Not Sent:**
   - Check queue workers are running
   - Verify mail configuration
   - Check notification table for database notifications

### Debug Commands

```bash
# Check database structure
php artisan tinker
>>> DB::select('DESCRIBE interviews');

# Test notification system
php artisan tinker
>>> $user = User::find(1);
>>> $user->notify(new \App\Notifications\InterviewScheduled($interview, $application));

# Check application status
php artisan tinker
>>> Application::find(1)->status;
```

## Future Enhancements

1. **Interview Reminders**: Automated reminders before interview
2. **Video Interview Integration**: Support for video conferencing platforms
3. **Interview Feedback**: Structured feedback collection
4. **Calendar Integration**: Sync with external calendar systems
5. **Bulk Interview Scheduling**: Schedule multiple interviews at once
6. **Interview Analytics**: Dashboard with interview statistics
