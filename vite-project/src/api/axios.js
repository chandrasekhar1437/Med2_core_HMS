import axios from 'axios';

// Initialize Axios instance with environment-aware baseURL
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Automatically append JWT Bearer token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors & token expiry
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    // Bypass auto-redirect on login or public auth requests
    const isAuthRequest = 
      url.includes('/api/auth/login') || 
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/forgot-password');

    // Handle 401 Unauthorized (Expired or Invalid JWT)
    if (error.response && error.response.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');

      // Reload to prompt login state cleanly
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

export default API;