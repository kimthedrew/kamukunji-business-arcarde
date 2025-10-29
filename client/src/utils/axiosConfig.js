import axios from 'axios';
import TokenHelper from './tokenHelper';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle invalid tokens
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle invalid token errors
    if (TokenHelper.handleInvalidToken(error)) {
      // Token has been cleared and user redirected
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }
    
    // Handle other errors
    if (error.response?.status === 401) {
      console.warn('Unauthorized request, clearing auth data...');
      TokenHelper.clearAuthData();
    }
    
    return Promise.reject(error);
  }
);

export default api;


