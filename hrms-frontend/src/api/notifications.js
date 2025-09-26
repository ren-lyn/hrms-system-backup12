import API from '../axios';

// Base URL already includes /api
export const fetchNotifications = () => API.get('/notifications');
export const markNotificationRead = (id) => API.post(`/notifications/${id}/read`);


