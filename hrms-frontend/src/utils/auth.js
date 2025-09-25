import axios from 'axios';
import { toast } from 'react-toastify';

// Auth utility functions
export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Basic token validation - you can enhance this
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch (error) {
    return false;
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
  // Set default axios authorization header
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
  // Remove default axios authorization header
  delete axios.defaults.headers.common['Authorization'];
};

export const redirectToLogin = () => {
  clearAuthData();
  toast.error('Session expired. Please log in again.');
  setTimeout(() => {
    window.location.href = '/login';
  }, 2000);
};

// Create axios instance with automatic token handling
export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      if (window.location.pathname !== '/login') {
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);

// Enhanced error handler for components
export const handleApiError = (error, navigate) => {
  console.error('API Error:', error);

  if (error.response) {
    switch (error.response.status) {
      case 401:
        toast.error('Authentication failed. Redirecting to login...');
        clearAuthData();
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        break;
      case 403:
        toast.error('Access denied. You don\'t have permission to perform this action.');
        break;
      case 404:
        toast.warning('Resource not found.');
        break;
      case 409:
        const message = error.response.data?.message || '';
        if (message.toLowerCase().includes('email')) {
          toast.error('Email already exists. Please use a different email address.');
        } else if (message.toLowerCase().includes('name')) {
          toast.error('An employee with the same first and last name already exists.');
        } else {
          toast.error(message || 'Conflict error. Please check your input.');
        }
        break;
      case 422:
        const validationErrors = error.response.data.errors;
        if (validationErrors) {
          const errorMessages = Object.values(validationErrors).flat();
          toast.error(`Validation error: ${errorMessages.join(', ')}`);
        } else {
          toast.error('Validation failed. Please check your input.');
        }
        break;
      case 500:
        toast.error('Server error occurred. Please try again later.');
        break;
      default:
        toast.error(error.response.data?.message || 'An error occurred. Please try again.');
    }
  } else if (error.request) {
    toast.error('Network error. Please check your internet connection.');
  } else if (error.code === 'ECONNABORTED') {
    toast.error('Request timed out. Please try again.');
  } else {
    toast.error('An unexpected error occurred. Please try again.');
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  const user = localStorage.getItem('user');
  return token && user && isTokenValid();
};

// Get current user data
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

// Set user data
export const setCurrentUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};
