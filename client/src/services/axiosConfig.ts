import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Set the base URL for axios
axios.defaults.baseURL = API_BASE_URL;

// Response interceptor to handle authentication and CloudNet connectivity errors
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Handle authentication errors (401)
      if (status === 401) {
        // Token expired or invalid - clear auth and redirect to login
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      // Handle CloudNet connectivity errors (503)
      else if (status === 503 && data?.type === 'cloudnet_unavailable') {
        // CloudNet API is not available - trigger a global error state
        window.dispatchEvent(new CustomEvent('cloudnet-unavailable', {
          detail: {
            error: data.error,
            message: data.message,
            type: data.type
          }
        }));
      }

      else if (status === 503 && data?.type === 'cloudnet_disabled') {
        // CloudNet API is disabled in configuration
        window.dispatchEvent(new CustomEvent('cloudnet-disabled', {
          detail: {
            error: data.error,
            type: data.type
          }
        }));
      }
    }

    return Promise.reject(error);
  }
);

export default axios;