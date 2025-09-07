import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
});

// Add auth token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Leave Request APIs
export const fetchLeaveRequests = () => API.get('/leave-requests');
export const getLeaveRequest = (id) => API.get(`/leave-requests/${id}`);
export const createLeaveRequest = (data) => API.post('/leave-requests', data);
export const approveLeaveRequest = (id, remarks) => API.put(`/leave-requests/${id}/approve`, { remarks });
export const rejectLeaveRequest = (id, remarks) => API.put(`/leave-requests/${id}/reject`, { remarks });
export const getLeaveStats = () => API.get('/leave-requests/stats');

// Legacy APIs (keeping for backward compatibility)
export const fetchLeaves = () => API.get('/leave-requests');
export const getLeave = (id) => API.get(`/leave-requests/${id}`);
export const approveLeave = (id, remarks) => API.put(`/leave-requests/${id}/approve`, { remarks });
export const rejectLeave = (id, remarks) => API.put(`/leave-requests/${id}/reject`, { remarks });
