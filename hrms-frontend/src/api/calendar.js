import axios from '../axios';

// HR Calendar API functions
export const hrCalendarApi = {
  // Get all HR calendar events
  getEvents: async (params = {}) => {
    const response = await axios.get('/hr-calendar', { params });
    return response.data;
  },

  // Create a new HR calendar event
  createEvent: async (eventData) => {
    const response = await axios.post('/hr-calendar', eventData);
    return response.data;
  },

  // Get a specific event
  getEvent: async (id) => {
    const response = await axios.get(`/hr-calendar/${id}`);
    return response.data;
  },

  // Update an event
  updateEvent: async (id, eventData) => {
    const response = await axios.put(`/hr-calendar/${id}`, eventData);
    return response.data;
  },

  // Delete an event
  deleteEvent: async (id) => {
    const response = await axios.delete(`/hr-calendar/${id}`);
    return response.data;
  },

  // Cancel an event
  cancelEvent: async (id) => {
    const response = await axios.put(`/hr-calendar/${id}/cancel`);
    return response.data;
  },

  // Complete an event
  completeEvent: async (id) => {
    const response = await axios.put(`/hr-calendar/${id}/complete`);
    return response.data;
  },

  // Get today's events
  getTodaysEvents: async () => {
    const response = await axios.get('/hr-calendar/todays-events');
    return response.data;
  },

  // Get upcoming events
  getUpcomingEvents: async () => {
    const response = await axios.get('/hr-calendar/upcoming');
    return response.data;
  },

  // Check HR availability
  checkHrAvailability: async () => {
    const response = await axios.get('/hr-calendar/check-availability');
    return response.data;
  },

  // Get employees for invitations
  getEmployees: async () => {
    const response = await axios.get('/hr-calendar/employees');
    return response.data;
  }
};

// Employee Calendar API functions
export const employeeCalendarApi = {
  // Get employee's personal calendar
  getMyCalendar: async (params = {}) => {
    const response = await axios.get('/employee-calendar', { params });
    return response.data;
  },

  // Respond to a meeting invitation
  respondToInvitation: async (eventId, status) => {
    const response = await axios.post(`/employee-calendar/${eventId}/respond`, {
      status: status
    });
    return response.data;
  }
};

// Holidays API functions
export const holidaysApi = {
  // Get manual holidays from backend and format as calendar events
  getManualHolidaysCalendar: async (params = {}) => {
    // Backend expects 'from' and 'to' params
    const { start_date, end_date } = params;
    const response = await axios.get('/holidays', { params: { from: start_date, to: end_date } });
    const holidays = response.data?.data || [];
    return {
      success: true,
      data: holidays.map(h => ({
        id: `manual_holiday_${h.id}`,
        title: h.name,
        description: h.type ? `${h.type} Holiday` : 'Official Holiday',
        event_type: h.type && h.type.toLowerCase() === 'special' ? 'holiday_special' : 'holiday_regular',
        status: 'active',
        start_datetime: `${h.date}T00:00:00+08:00`,
        end_datetime: `${h.date}T23:59:59+08:00`,
        start_date_manila: h.date,
        start_time_formatted: 'All day',
        end_time_formatted: '',
        created_by: 'System',
        blocks_leave_submissions: false,
      }))
    };
  }
};

// Utility functions
export const formatEventForForm = (event) => {
  if (!event) return null;
  
  return {
    title: event.title,
    description: event.description,
    start_datetime: event.start_datetime_manila || event.start_datetime,
    end_datetime: event.end_datetime_manila || event.end_datetime,
    event_type: event.event_type,
    blocks_leave_submissions: event.blocks_leave_submissions,
    invited_employees: event.invited_employees ? event.invited_employees.map(emp => emp.id) : []
  };
};

export const formatEventForDisplay = (event) => {
  if (!event) return null;
  
  return {
    ...event,
    startDate: event.start_date_manila || event.start_datetime.split('T')[0],
    startTime: event.start_time_manila || event.start_datetime.split('T')[1].substring(0, 5),
    endTime: event.end_time_manila || event.end_datetime.split('T')[1].substring(0, 5),
    formattedDate: event.date_formatted,
    formattedStartTime: event.start_time_formatted,
    formattedEndTime: event.end_time_formatted
  };
};

export const getEventTypeColor = (eventType) => {
  const colors = {
    meeting: '#3b82f6',
    training: '#10b981',
    interview: '#f59e0b',
    break: '#6b7280',
    unavailable: '#ef4444',
    other: '#8b5cf6'
  };
  return colors[eventType] || colors.other;
};

export const getEventTypeIcon = (eventType) => {
  const icons = {
    meeting: '👥',
    training: '📚',
    interview: '💼',
    break: '☕',
    unavailable: '🚫',
    other: '📅'
  };
  return icons[eventType] || icons.other;
};

export const getInvitationStatusColor = (status) => {
  const colors = {
    pending: '#f59e0b',
    accepted: '#10b981',
    declined: '#ef4444'
  };
  return colors[status] || colors.pending;
};

export const getInvitationStatusText = (status) => {
  const texts = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined'
  };
  return texts[status] || 'Unknown';
};

// Legacy function for leave submission availability check
export const checkLeaveSubmissionAvailability = async () => {
  const response = await hrCalendarApi.checkHrAvailability();
  return response;
};

// Cache management utility
export const clearAllCalendarCaches = () => {
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  
  // Clear all calendar-related caches
  keys.forEach(key => {
    if (key.includes('calendar_') || key.includes('_calendar_')) {
      localStorage.removeItem(key);
    }
  });
  
  console.log('All calendar caches cleared for real-time sync');
};