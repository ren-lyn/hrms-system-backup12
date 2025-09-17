import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
});

// Add auth token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  console.log('API interceptor - token found:', !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Authorization header set');
  } else {
    console.log('No token found in localStorage');
  }
  return config;
});

// Leave Request APIs
export const fetchLeaveRequests = () => API.get('/leave-requests');
export const getLeaveRequest = (id) => API.get(`/leave-requests/${id}`);
export const createLeaveRequest = (data) => {
  console.log('API: createLeaveRequest called with:', data);
  return API.post('/leave-requests', data);
};
export const approveLeaveRequest = (id, remarks) => API.put(`/leave-requests/${id}/approve`, { remarks });
export const rejectLeaveRequest = (id, remarks) => API.put(`/leave-requests/${id}/reject`, { remarks });
export const updateLeaveTermsAndCategory = (id, terms, leave_category) => API.put(`/leave-requests/${id}/terms`, { terms, leave_category });
export const getLeaveStats = () => API.get('/leave-requests/stats');

// Employee Profile APIs for auto-population
export const getEmployeeProfile = () => API.get('/employee/profile-data');
export const getEmployeeProfileTest = (userId = 6) => API.get(`/employee-profile-test/${userId}`);
export const getMyLeaveRequests = () => API.get('/leave-requests/my-requests');
export const getMyLeaveBalance = () => API.get('/leave-requests/my-balance');

// Legacy APIs (keeping for backward compatibility)
export const fetchLeaves = () => API.get('/leave-requests');
export const getLeave = (id) => API.get(`/leave-requests/${id}`);
export const approveLeave = (id, remarks) => API.put(`/leave-requests/${id}/approve`, { remarks });
export const rejectLeave = (id, remarks) => API.put(`/leave-requests/${id}/reject`, { remarks });
