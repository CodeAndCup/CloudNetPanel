import axios from 'axios';

// Global error handler for API requests
export const setupApiInterceptors = (
  onSessionExpired: () => void,
  onCloudNetDisconnected: () => void
) => {
  // Request interceptor to ensure we have the token
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle session and CloudNet errors
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Handle session expiry (401/403 errors)
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMessage = error.response?.data?.error;
        if (errorMessage === 'Access token required' || errorMessage === 'Invalid or expired token') {
          onSessionExpired();
        }
      }
      
      // Handle CloudNet API unavailability (503 errors with specific type)
      if (error.response?.status === 503 && error.response?.data?.type === 'cloudnet_unavailable') {
        onCloudNetDisconnected();
      }

      return Promise.reject(error);
    }
  );
};