import axios from 'axios';
import TokenHelper from './tokenHelper';
import { API_BASE_URL } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    // Prefer admin token for admin endpoints; otherwise use shop token
    const adminToken = localStorage.getItem('adminToken');
    const shopToken = localStorage.getItem('token') || sessionStorage.getItem('token');

    const url = typeof config.url === 'string' ? config.url : '';
    const isAdminEndpoint = url.startsWith('/admin');

    const tokenToUse = isAdminEndpoint ? adminToken : (adminToken || shopToken);

    if (tokenToUse) {
      config.headers.Authorization = `Bearer ${tokenToUse}`;
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


