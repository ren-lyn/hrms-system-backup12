import axios from 'axios';
import cacheService from './cacheService';
import requestDeduplicator from '../utils/requestDeduplication';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000, // 10 second timeout
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear cache and redirect to login on unauthorized
      cacheService.clear();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Cached API methods
export const cachedApi = {
  // GET with caching and request deduplication
  get: async (url, params = {}, options = {}) => {
    const { ttl = 5 * 60 * 1000, forceRefresh = false } = options;
    const cacheKey = cacheService.generateKey(url, params);
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cached = cacheService.get(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true };
      }
    }

    // Use request deduplication to prevent duplicate concurrent requests
    return requestDeduplicator.dedupe(cacheKey, async () => {
      try {
        const response = await api.get(url, { params });
        cacheService.set(cacheKey, response.data, ttl);
        return { data: response.data, fromCache: false };
      } catch (error) {
        // Return cached data if available on error
        const cached = cacheService.get(cacheKey);
        if (cached) {
          console.warn(`API error for ${url}, returning cached data:`, error.message);
          return { data: cached, fromCache: true, error };
        }
        throw error;
      }
    });
  },

  // POST without caching
  post: (url, data, config) => api.post(url, data, config),

  // PUT without caching
  put: (url, data, config) => api.put(url, data, config),

  // DELETE without caching
  delete: (url, config) => api.delete(url, config),

  // Clear cache for specific endpoint
  clearCache: (pattern) => cacheService.clearByPattern(pattern),
};

// Specific API methods with optimized caching
export const apiService = {
  // Employee data with longer cache (10 minutes)
  getEmployees: (params = {}) => 
    cachedApi.get('/employees', params, { ttl: 10 * 60 * 1000 }),

  // User profile with longer cache (15 minutes)
  getUserProfile: () => 
    cachedApi.get('/auth/user', {}, { ttl: 15 * 60 * 1000 }),

  // Employee profile with longer cache (15 minutes)
  getEmployeeProfile: () => 
    cachedApi.get('/employee/profile', {}, { ttl: 15 * 60 * 1000 }),

  // Leave requests with shorter cache (2 minutes)
  getLeaveRequests: (params = {}) => 
    cachedApi.get('/leave-requests', params, { ttl: 2 * 60 * 1000 }),

  // Cash advances with shorter cache (2 minutes)
  getCashAdvances: (params = {}) => 
    cachedApi.get('/cash-advances', params, { ttl: 2 * 60 * 1000 }),

  // Job postings with longer cache (30 minutes)
  getJobPostings: (params = {}) => 
    cachedApi.get('/job-postings', params, { ttl: 30 * 60 * 1000 }),

  // Applications with shorter cache (1 minute)
  getApplications: (params = {}) => 
    cachedApi.get('/applications', params, { ttl: 1 * 60 * 1000 }),

  // Attendance data with shorter cache (1 minute)
  getAttendance: (params = {}) => 
    cachedApi.get('/attendance', params, { ttl: 1 * 60 * 1000 }),

  // Payroll data with longer cache (5 minutes)
  getPayroll: (params = {}) => 
    cachedApi.get('/payroll', params, { ttl: 5 * 60 * 1000 }),

  // Clear all caches
  clearAllCaches: () => cacheService.clear(),

  // Clear specific cache
  clearCache: (pattern) => cacheService.clearByPattern(pattern),
};

export default api;
