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

// Authentication APIs
export const login = (credentials) => API.post('/auth/login', credentials);
export const logout = () => API.post('/auth/logout');
export const register = (userData) => API.post('/auth/register', userData);

// User APIs
export const getCurrentUser = () => {
  console.log('API: getCurrentUser called');
  return API.get('/auth/user');
};

export const updateUserProfile = (userData) => API.put('/auth/user', userData);

// Fallback for testing - can be removed later
export const getMockUser = () => {
  return Promise.resolve({
    data: {
      id: 1,
      name: 'Test Employee',
      full_name: 'Test Employee',
      email: 'test@company.com',
      department: 'IT Department',
      role: 'employee'
    }
  });
};
