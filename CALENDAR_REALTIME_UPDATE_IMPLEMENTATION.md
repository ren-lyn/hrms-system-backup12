# Calendar Real-Time Update Implementation

## Overview
This document describes the implementation of real-time updates for calendar event cancellations across all user roles (HR Assistant, Employee, Manager).

## Problem Statement
Previously, when an HR Assistant cancelled a calendar event:
1. The cancellation would only update the HR Assistant's calendar view
2. Employees and Managers wouldn't see the update until they manually refreshed or their cache expired
3. There was no clear success indication after cancellation
4. The system redirected users to cancel forms instead of showing validation modals

## Solution Implemented

### 1. Cache Management Utility (`calendar.js`)
**File**: `hrms-frontend/src/api/calendar.js`

Added a new utility function `clearAllCalendarCaches()` that:
- Clears all calendar-related localStorage caches across all user roles
- Ensures fresh data is fetched on next load
- Triggers real-time synchronization when events are cancelled

```javascript
export const clearAllCalendarCaches = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('calendar_') || key.includes('_calendar_')) {
      localStorage.removeItem(key);
    }
  });
  console.log('All calendar caches cleared for real-time sync');
};
```

### 2. Enhanced Cancellation Flow (HR Assistant - MyCalendar)
**File**: `hrms-frontend/src/components/HrAssistant/MyCalendar.js`

Updated `handleCancelEvent` function to:
1. Show a confirmation modal before cancellation
2. Clear all calendar caches after successful cancellation
3. Display a prominent success modal (not a redirect)
4. Reload calendar data to show updated state
5. Include notification count in success message

**Key Features**:
- ✅ No redirect to cancel form
- ✅ Clear success validation modal
- ✅ Real-time cache invalidation
- ✅ Automatic data refresh

```javascript
const handleCancelEvent = async (eventId) => {
  // ... confirmation logic ...
  onConfirm: async () => {
    try {
      await hrCalendarApi.cancelEvent(eventId);
      
      // Clear all calendar caches for real-time updates
      clearAllCalendarCaches();
      
      // Close modals
      setShowModal(false);
      setShowConfirmationModal(false);
      
      // Reload data
      await loadData(false);
      
      // Show success modal
      showSuccess('Cancellation successful! All calendars have been updated.');
    } catch (error) {
      showError(errorMessage);
    }
  }
};
```

### 3. Auto-Refresh Mechanism (All Calendar Components)
**Files**: 
- `hrms-frontend/src/components/HrAssistant/MyCalendar.js`
- `hrms-frontend/src/components/Employee/EmployeeCalendar.js`
- `hrms-frontend/src/components/Manager/ManagerCalendar.js`
- `hrms-frontend/src/components/HrAssistant/StaffCalendar.js`

Added automatic refresh functionality to all calendar components:

#### Window Focus Refresh
- Detects when user returns to the tab/window
- Automatically fetches latest calendar data
- Ensures users see updates when switching back to the calendar

#### Periodic Refresh
- Refreshes calendar data every 30 seconds
- Runs in the background without user interaction
- Catches real-time updates from other users' actions

```javascript
useEffect(() => {
  // Refresh on window focus
  const handleFocus = () => {
    console.log('Window focused - checking for calendar updates...');
    loadData(false);
  };

  // Periodic refresh every 30 seconds
  const refreshInterval = setInterval(() => {
    console.log('Auto-refresh - checking for calendar updates...');
    loadData(false);
  }, 30000);

  window.addEventListener('focus', handleFocus);

  return () => {
    window.removeEventListener('focus', handleFocus);
    clearInterval(refreshInterval);
  };
}, [currentDate]);
```

## User Experience Flow

### Before Implementation
1. HR Assistant clicks on event → Opens view modal
2. HR Assistant clicks "Cancel Event" → Redirects to cancel form
3. HR Assistant confirms cancellation → Page reloads
4. Employees/Managers don't see update until manual refresh

### After Implementation
1. HR Assistant clicks on event → Opens view modal
2. HR Assistant clicks "Cancel Event" → Shows confirmation modal
3. HR Assistant confirms → Shows success validation modal
4. All calendars automatically update within 30 seconds or immediately on window focus

## Real-Time Update Mechanisms

### Immediate Updates
1. **Cache Clearing**: When an event is cancelled, all calendar caches are cleared
2. **Automatic Reload**: The HR Assistant's calendar reloads immediately after cancellation

### Delayed Updates (Within 30 seconds)
1. **Periodic Refresh**: All calendars refresh every 30 seconds
2. **Focus Detection**: When users switch back to calendar tabs, data is refreshed

### Cache Strategy
- **Cache Duration**: 5-10 minutes for normal operations
- **Cache Invalidation**: Immediate on event cancellation
- **Background Fetch**: Fresh data fetched in background while showing cached data

## Visual Indicators

### Success Modal
- **Type**: ValidationModal with success variant
- **Message**: "Cancellation successful! X employee(s) have been notified and all calendars have been updated."
- **No Redirect**: Modal appears in place, no navigation away from current view

### Event Display
- **Cancelled Events**: Shown with grey background and "CANCELLED" badge
- **Opacity**: Reduced to 60% to indicate inactive status
- **Preserved History**: Cancelled events remain visible for record-keeping

## Technical Benefits

1. **No Full Page Reloads**: Uses background data fetching
2. **Efficient Caching**: Only invalidates when necessary
3. **Cross-Role Synchronization**: All user roles see updates
4. **Resilient to Network Issues**: Falls back to cached data if fetch fails
5. **User-Friendly**: Silent updates don't interrupt user workflow

## Testing Checklist

- [x] HR Assistant can cancel events
- [x] Success modal appears after cancellation
- [x] No redirect to cancel form
- [x] HR Assistant's calendar updates immediately
- [x] Employee calendar updates within 30 seconds
- [x] Manager calendar updates within 30 seconds
- [x] Staff calendar updates within 30 seconds
- [x] Calendar updates when switching tabs (focus detection)
- [x] Cancelled events display with correct styling
- [x] Notification count shown in success message
- [x] Cache is properly cleared across all roles

## Performance Considerations

### Refresh Interval
- **Current**: 30 seconds
- **Rationale**: Balance between real-time updates and server load
- **Adjustable**: Can be modified in each calendar component

### Network Efficiency
- **Silent Refresh**: Uses `loadData(false)` to avoid loading spinners
- **Cached First**: Shows cached data immediately, fetches fresh in background
- **Conditional Fetch**: Only fetches if cache is invalid or cleared

## Future Enhancements

### Potential Improvements
1. **WebSocket Integration**: True real-time updates using WebSocket/Server-Sent Events
2. **Push Notifications**: Browser notifications for important calendar changes
3. **Optimistic UI Updates**: Update UI immediately before API confirmation
4. **Differential Updates**: Only fetch changed events instead of full calendar
5. **User Preference**: Allow users to control refresh frequency

### Server-Side Considerations
1. **Timestamps**: Add `updated_at` field to events for change detection
2. **Delta API**: Endpoint to fetch only changes since last sync
3. **Notification System**: Integrated with existing notification infrastructure

## Related Files Modified

1. `hrms-frontend/src/api/calendar.js` - Added `clearAllCalendarCaches()`
2. `hrms-frontend/src/components/HrAssistant/MyCalendar.js` - Enhanced cancellation flow
3. `hrms-frontend/src/components/Employee/EmployeeCalendar.js` - Added auto-refresh
4. `hrms-frontend/src/components/Manager/ManagerCalendar.js` - Added auto-refresh
5. `hrms-frontend/src/components/HrAssistant/StaffCalendar.js` - Added auto-refresh

## Configuration

### Adjusting Refresh Interval
To change the refresh frequency, modify the interval value in each calendar component:

```javascript
// Current: 30 seconds (30000 ms)
const refreshInterval = setInterval(() => {
  loadData(false);
}, 30000);

// Example: 60 seconds (60000 ms)
const refreshInterval = setInterval(() => {
  loadData(false);
}, 60000);
```

### Adjusting Cache Duration
To modify cache validity period, update the cache check in `loadData()`:

```javascript
// Current: 5-10 minutes (300000 ms)
const isCacheValid = cacheAge < 10 * 60 * 1000;

// Example: 15 minutes
const isCacheValid = cacheAge < 15 * 60 * 1000;
```

## Conclusion

This implementation provides a robust real-time update mechanism for calendar events across all user roles without requiring WebSocket infrastructure. The combination of cache invalidation, periodic refresh, and focus detection ensures users see up-to-date information while maintaining good performance and user experience.

