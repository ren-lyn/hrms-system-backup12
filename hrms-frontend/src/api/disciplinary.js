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

// ===== HR ASSISTANT APIs =====

// Tab 1: Disciplinary Categories Administration
export const getCategories = async (params = {}) => {
  try {
    console.log('API: Fetching categories with params:', params);
    const response = await API.get('/hr/disciplinary/categories', { params });
    console.log('API: Categories response:', response.data);
    return response;
  } catch (error) {
    console.error('API Error - getCategories:', error.response?.data || error.message);
    throw error;
  }
};

export const getCategory = async (id) => {
  try {
    const response = await API.get(`/hr/disciplinary/categories/${id}`);
    return response;
  } catch (error) {
    console.error('API Error - getCategory:', error.response?.data || error.message);
    throw error;
  }
};

export const createCategory = async (data) => {
  try {
    console.log('API: Creating category with data:', data);
    const response = await API.post('/hr/disciplinary/categories', data);
    console.log('API: Create category response:', response.data);
    return response;
  } catch (error) {
    console.error('API Error - createCategory:', error.response?.data || error.message);
    throw error;
  }
};

export const updateCategory = async (id, data) => {
  try {
    const response = await API.put(`/hr/disciplinary/categories/${id}`, data);
    return response;
  } catch (error) {
    console.error('API Error - updateCategory:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteCategory = async (id) => {
  try {
    const response = await API.delete(`/hr/disciplinary/categories/${id}`);
    return response;
  } catch (error) {
    console.error('API Error - deleteCategory:', error.response?.data || error.message);
    throw error;
  }
};

export const toggleCategoryStatus = async (id) => {
  try {
    const response = await API.patch(`/hr/disciplinary/categories/${id}/toggle-status`);
    return response;
  } catch (error) {
    console.error('API Error - toggleCategoryStatus:', error.response?.data || error.message);
    throw error;
  }
};

// Tab 2: Reported Infractions/Violations
export const getAllReports = (params = {}) => API.get('/hr/disciplinary/reports', { params });
export const getReport = (id) => API.get(`/hr/disciplinary/reports/${id}`);
export const markReportAsReviewed = (id, data) => API.post(`/hr/disciplinary/reports/${id}/review`, data);
export const getReportStatistics = () => API.get('/hr/disciplinary/reports/statistics');

// Disciplinary Actions Management
export const issueAction = (data) => API.post('/hr/disciplinary/actions', data);
export const getAllActions = (params = {}) => API.get('/hr/disciplinary/actions', { params });
export const issueVerdict = (id, data) => API.post(`/hr/disciplinary/actions/${id}/verdict`, data);

// Helper endpoints
export const getAvailableInvestigators = () => API.get('/hr/disciplinary/investigators');

// ===== MANAGER APIs =====

// Category Management (for managers who can configure)
export const getManagerCategories = () => API.get('/manager/disciplinary/categories');
export const createManagerCategory = (data) => API.post('/manager/disciplinary/categories', data);
export const updateManagerCategory = (id, data) => API.put(`/manager/disciplinary/categories/${id}`, data);
export const deleteManagerCategory = (id) => API.delete(`/manager/disciplinary/categories/${id}`);

// Report Management
export const getManagerReports = (params = {}) => API.get('/manager/disciplinary/reports', { params });
export const createReport = (data) => API.post('/manager/disciplinary/reports', data);
export const getManagerReport = (id) => API.get(`/manager/disciplinary/reports/${id}`);
export const updateReport = (id, data) => API.put(`/manager/disciplinary/reports/${id}`, data);

// Investigation Management
export const getAssignedInvestigations = (params = {}) => API.get('/manager/disciplinary/investigations', { params });
export const getInvestigation = (id) => API.get(`/manager/disciplinary/investigations/${id}`);
export const submitInvestigation = (id, data) => API.post(`/manager/disciplinary/investigations/${id}/submit`, data);

// Helper endpoints for managers
export const getEmployeesForReporting = (params = {}) => API.get('/manager/disciplinary/employees', { params });
export const checkPreviousViolations = (data) => API.post('/manager/disciplinary/check-previous-violations', data);

// ===== EMPLOYEE APIs =====

// View disciplinary actions and submit explanations
export const getMyActions = (params = {}) => API.get('/employee/disciplinary/actions', { params });
export const getMyAction = (id) => API.get(`/employee/disciplinary/actions/${id}`);
export const submitExplanation = (id, data) => API.post(`/employee/disciplinary/actions/${id}/explanation`, data);
export const getDashboardStats = () => API.get('/employee/disciplinary/dashboard/stats');
export const downloadActionPdf = (id) => API.get(`/employee/disciplinary/actions/${id}/pdf`, { responseType: 'blob' });

// ===== UTILITY FUNCTIONS =====

// Format status for display
export const formatStatus = (status) => {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Get status color for Bootstrap badges
export const getStatusColor = (status) => {
  const statusColors = {
    'reported': 'warning',
    'under_review': 'info',
    'action_issued': 'primary',
    'explanation_requested': 'warning',
    'explanation_submitted': 'info',
    'under_investigation': 'secondary',
    'investigation_completed': 'info',
    'awaiting_verdict': 'warning',
    'completed': 'success',
    'dismissed': 'secondary'
  };
  return statusColors[status] || 'secondary';
};

// Get detailed status description
export const getDetailedStatus = (report) => {
  if (!report) return 'Unknown';
  
  // Use overall_status if available, otherwise fall back to status
  const status = report.overall_status || report.status;
  const actions = report.disciplinary_actions || [];
  
  // Add more context based on the current state
  switch (status) {
    case 'reported':
      return 'Reported - Awaiting HR Review';
    case 'under_review':
      return 'Under Review by HR';
    case 'action_issued':
      return 'Disciplinary Action Issued';
    case 'explanation_requested':
      const hasExplanation = actions.some(a => a.employee_explanation);
      return hasExplanation ? 'Employee Explanation Submitted' : 'Employee Explanation Requested';
    case 'explanation_submitted':
      return 'Employee Explanation Submitted';
    case 'under_investigation':
      const hasInvestigation = actions.some(a => a.investigation_notes);
      return hasInvestigation ? 'Investigation Completed' : 'Under Investigation';
    case 'awaiting_verdict':
      return 'Awaiting HR Final Verdict';
    case 'completed':
      const hasVerdict = actions.some(a => a.verdict);
      if (hasVerdict) {
        const verdict = actions.find(a => a.verdict)?.verdict;
        return verdict === 'dismissed' ? 'Case Dismissed' : 'Case Completed - Action Upheld';
      }
      return 'Case Completed';
    case 'dismissed':
      return 'Case Dismissed';
    default:
      return formatStatus(status);
  }
};

// Get priority color
export const getPriorityColor = (priority) => {
  const priorityColors = {
    'low': 'secondary',
    'medium': 'primary',
    'high': 'warning',
    'urgent': 'danger'
  };
  return priorityColors[priority] || 'secondary';
};

// Get severity color
export const getSeverityColor = (severity) => {
  const severityColors = {
    'minor': 'success',
    'major': 'warning',
    'severe': 'danger'
  };
  return severityColors[severity] || 'secondary';
};

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format datetime for display
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format verdict for user-friendly display
export const formatVerdict = (verdict) => {
  if (!verdict) return 'Pending';
  
  const verdictMap = {
    'guilty': 'Action Upheld',
    'dismissed': 'Action Dismissed',
    'not_guilty': 'Not Guilty',
    'partially_guilty': 'Partially Guilty'
  };
  
  return verdictMap[verdict] || verdict
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
