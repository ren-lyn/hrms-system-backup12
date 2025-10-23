# Notification Dropdown System

## Overview
The notification system in `PersonalOnboarding.js` has been updated to display notifications in a dropdown instead of opening a separate tab. All updates and actions from the HR side (such as changes made in `OnboardingDashboard.js` and `JobApplications.js`) will automatically appear in the dropdown under the bell icon.

## Features

### 1. **Notification Dropdown**
- Clicking the bell icon toggles a dropdown showing recent notifications
- Displays up to 5 recent notifications in the dropdown
- "View All Notifications" button to see complete list

### 2. **Real-time Updates**
- Notifications are fetched from the backend API (`/api/notifications`)
- Auto-refresh every 30 seconds to check for new notifications
- Unread notification count displayed as a badge on the bell icon

### 3. **Backend Integration**
- Uses Laravel's notification system
- Notifications are automatically created when:
  - HR changes application status in `JobApplications.js`
  - HR schedules orientation in `OnboardingDashboard.js`
  - Other HR actions affecting the applicant

### 4. **Notification Types**
The system supports various notification types:
- `job_application_submitted` - When application is submitted
- `job_application_status_changed` - When HR changes application status
- `interview_scheduled` - When interview is scheduled
- `job_offer_received` - When offer is sent
- Custom notifications from HR actions

## Technical Implementation

### Frontend (PersonalOnboarding.js)

#### State Management
```javascript
const [notifications, setNotifications] = useState([]);
const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
const [loadingNotifications, setLoadingNotifications] = useState(false);
```

#### API Calls
- **Fetch Notifications**: `GET /api/notifications`
- **Mark as Read**: `POST /api/notifications/{id}/read`

#### Auto-refresh
```javascript
// Fetch notifications every 30 seconds
const notificationInterval = setInterval(() => {
  fetchNotifications();
}, 30000);
```

### Backend (Laravel)

#### Controllers
- `NotificationController.php` - Handles fetching and marking notifications
- `ApplicationController.php` - Creates notifications when status changes

#### Key Backend Code
```php
// In ApplicationController@updateStatus
$application->applicant->user->notify(
  new \App\Notifications\JobApplicationStatusChanged($application)
);
```

## User Experience

1. **Bell Icon**: Shows unread count badge
2. **Click Bell**: Opens dropdown with recent notifications
3. **Click Notification**: 
   - Automatically marks as read via backend API
   - Intelligently routes to the relevant tab based on notification type
   - Shows toast message confirming navigation
   - Scrolls to top of page smoothly
   - **No new tabs are opened** - navigation happens within the same page
4. **Click Outside**: Closes the dropdown automatically
5. **View All**: Opens full notification page with bulk actions

## Styling

The dropdown features:
- Modern card-style design with shadow
- Smooth animations (slide down effect)
- Hover effects on notification items
- Blue dot indicator for unread notifications
- Scrollable list with custom scrollbar styling
- Responsive design

## HR Side Integration

When HR staff make changes:

### JobApplications.js
```javascript
// When HR updates status
axios.put(`/api/applications/${id}/status`, { status: newStatus })
// Backend automatically creates notification for applicant
```

### OnboardingDashboard.js
```javascript
// When HR schedules orientation
// Notification is automatically created through backend
```

## Future Enhancements

Potential improvements:
1. WebSocket integration for instant notifications
2. Sound/desktop notifications for new updates
3. Notification categories and filtering
4. Batch operations on notifications
5. Push notifications for mobile

## Testing

To test the notification system:
1. Login as an applicant
2. Have HR update your application status
3. Check the bell icon for new notifications
4. Click to view and interact with notifications

## Troubleshooting

### Notifications not appearing?
- Check browser console for API errors
- Verify backend is running (`php artisan serve`)
- Check if user is authenticated (token in localStorage)
- Verify HR actions are creating notifications in database

### Dropdown not closing?
- Check browser console for JavaScript errors
- Verify click outside handler is attached properly

### Slow loading?
- Check network tab for API response times
- Consider reducing polling interval
- Implement caching strategy
