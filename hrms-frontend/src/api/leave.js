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
export const confirmManagerRejection = (id, remarks) => API.put(`/leave-requests/${id}/confirm-rejection`, { remarks });
export const updateLeaveTermsAndCategory = (id, terms, leave_category) => API.put(`/leave-requests/${id}/terms`, { terms, leave_category });
export const getLeaveStats = () => API.get('/leave-requests/stats');

// Employee Profile APIs for auto-population
export const getEmployeeProfile = () => API.get('/employee/profile-data');
export const getEmployeeProfileTest = (userId = 6) => API.get(`/employee-profile-test/${userId}`);
export const getMyLeaveRequests = () => API.get('/leave-requests/my-requests');
export const getMyLeaveBalance = () => API.get('/leave-requests/my-balance');
export const getLeaveSummary = () => API.get('/leave-requests/my-summary', {
  params: {
    _t: new Date().getTime() // Cache buster
  }
});
export const checkLeaveEligibility = () => API.get('/leave-requests/check-eligibility');
export const getLeaveTypes = () => API.get('/leave-types');
export const downloadLeavePdf = (id) => {
  const token = localStorage.getItem('token');
  const url = `http://localhost:8000/api/leave-requests/${id}/download-pdf`;
  
  // Create a temporary link to download the PDF
  const link = document.createElement('a');
  link.href = url;
  link.download = `leave-application-${id}.pdf`;
  
  // Add authorization header by creating a fetch request
  fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/pdf'
    }
  })
  .then(response => {
    if (response.ok) {
      return response.blob();
    }
    throw new Error('Failed to download PDF');
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  })
  .catch(error => {
    console.error('Error downloading PDF:', error);
    alert('Failed to download PDF. Please try again.');
  });
};

// Manager-specific APIs
export const approveLeaveRequestAsManager = (id, remarks) => API.put(`/leave-requests/${id}/manager-approve`, { remarks });
export const rejectLeaveRequestAsManager = (id, remarks) => API.put(`/leave-requests/${id}/manager-reject`, { remarks });
export const getManagerPendingRequests = () => API.get('/leave-requests/manager-pending');
export const getHRPendingRequests = () => API.get('/leave-requests/hr-pending');

// Leave Tracker APIs
export const fetchEmployeeLeaveTracker = (month, year) => API.get(`/leave-tracker?month=${month}&year=${year}`);
export const exportLeaveTrackerData = (month, year, data) => {
  // Create Excel export functionality
  const XLSX = require('xlsx');
  
  const worksheet = XLSX.utils.json_to_sheet(data.map(emp => ({
    'Employee Name': emp.name,
    'Department': emp.department,
    'Position': emp.position,
    'Total Leave Days': emp.totalLeaveDays,
    'Paid Leave Days': emp.paidLeaveDays,
    'Unpaid Leave Days': emp.unpaidLeaveDays,
    'Remaining Paid Leave': emp.remainingPaidLeave,
    'Remaining Unpaid Leave': emp.remainingUnpaidLeave,
    'Email': emp.email
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Tracker');
  
  XLSX.writeFile(workbook, `leave-tracker-${month}-${year}.xlsx`);
  
  return Promise.resolve();
};

// Legacy APIs (keeping for backward compatibility)
export const fetchLeaves = () => API.get('/leave-requests');
export const getLeave = (id) => API.get(`/leave-requests/${id}`);
export const approveLeave = (id, remarks) => API.put(`/leave-requests/${id}/approve`, { remarks });
export const rejectLeave = (id, remarks) => API.put(`/leave-requests/${id}/reject`, { remarks });
