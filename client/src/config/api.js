// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const API_BASE_URL_WITHOUT_API = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000';

export { API_BASE_URL, API_BASE_URL_WITHOUT_API };
