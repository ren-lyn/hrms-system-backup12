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

// ===== ATTENDANCE MANAGEMENT APIs =====

/**
 * Get attendance dashboard data
 */
export const getAttendanceDashboard = async () => {
  try {
    const response = await API.get('/attendance/dashboard');
    return response;
  } catch (error) {
    console.error('API Error - getAttendanceDashboard:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get attendance records with filtering and pagination
 */
export const getAttendanceRecords = async (params = {}) => {
  try {
    const response = await API.get('/attendance', { params });
    return response;
  } catch (error) {
    console.error('API Error - getAttendanceRecords:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get attendance statistics
 */
export const getAttendanceStatistics = async (params = {}) => {
  try {
    const response = await API.get('/attendance/statistics', { params });
    return response;
  } catch (error) {
    console.error('API Error - getAttendanceStatistics:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get departments for filtering
 */
export const getDepartments = async () => {
  try {
    const response = await API.get('/attendance/departments');
    return response;
  } catch (error) {
    console.error('API Error - getDepartments:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Import attendance data from Excel/CSV file
 */
export const importAttendanceData = async (file, onUploadProgress = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await API.post('/attendance/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onUploadProgress ? (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      } : undefined,
    });
    return response;
  } catch (error) {
    console.error('API Error - importAttendanceData:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Export attendance data to CSV
 */
export const exportAttendanceData = async (params = {}) => {
  try {
    const response = await API.get('/attendance/export', { 
      params,
      responseType: 'blob' 
    });
    return response;
  } catch (error) {
    console.error('API Error - exportAttendanceData:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Download attendance import template
 */
export const downloadAttendanceTemplate = async () => {
  try {
    const response = await API.get('/attendance/import/template', { 
      responseType: 'blob' 
    });
    return response;
  } catch (error) {
    console.error('API Error - downloadAttendanceTemplate:', error.response?.data || error.message);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Format time for display
 */
export const formatTime = (timeString) => {
  if (!timeString) return 'N/A';
  return timeString.substring(0, 5); // HH:MM format
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
  const colors = {
    'Present': 'success',
    'Late': 'warning',
    'Absent': 'danger',
    'On Leave': 'info',
    'Holiday (No Work)': 'secondary',
    'Holiday (Worked)': 'primary'
  };
  return colors[status] || 'secondary';
};

/**
 * Calculate working hours
 */
export const calculateWorkingHours = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) return 0;
  
  const start = new Date(`1970-01-01T${clockIn}`);
  const end = new Date(`1970-01-01T${clockOut}`);
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.max(0, Math.round(diffHours * 100) / 100);
};

/**
 * Download file from blob response
 */
export const downloadFile = (response, defaultFileName) => {
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  
  // Try to get filename from response headers
  const contentDisposition = response.headers['content-disposition'];
  let fileName = defaultFileName;
  
  if (contentDisposition) {
    const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
    if (fileNameMatch) {
      fileName = fileNameMatch[1];
    }
  }
  
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Validate CSV file
 */
export const validateCSVFile = (file) => {
  const validTypes = ['text/csv', 'application/csv', '.csv'];
  const maxSize = 2 * 1024 * 1024; // 2MB
  
  if (!file) {
    return { isValid: false, message: 'Please select a file' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, message: 'File size should be less than 2MB' };
  }
  
  const fileExtension = file.name.split('.').pop().toLowerCase();
  if (fileExtension !== 'csv') {
    return { isValid: false, message: 'Please upload a CSV file' };
  }
  
  return { isValid: true };
};