import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
});

// Add auth token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// HR Calendar Event APIs
export const getHrCalendarEvents = (params = {}) => API.get('/hr-calendar', { params });
export const createHrCalendarEvent = (data) => API.post('/hr-calendar', data);
export const getHrCalendarEvent = (id) => API.get(`/hr-calendar/${id}`);
export const updateHrCalendarEvent = (id, data) => API.put(`/hr-calendar/${id}`, data);
export const deleteHrCalendarEvent = (id) => API.delete(`/hr-calendar/${id}`);

// Specific calendar actions
export const getTodaysEvents = () => API.get('/hr-calendar/todays-events');
export const getUpcomingEvents = () => API.get('/hr-calendar/upcoming');
export const checkHrAvailability = () => API.get('/hr-calendar/check-availability');
export const cancelHrCalendarEvent = (id) => API.put(`/hr-calendar/${id}/cancel`);
export const completeHrCalendarEvent = (id) => API.put(`/hr-calendar/${id}/complete`);

// Leave request availability check
export const checkLeaveSubmissionAvailability = () => API.get('/hr-calendar/check-availability');
