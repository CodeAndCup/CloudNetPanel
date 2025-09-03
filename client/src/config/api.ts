// API Configuration for CloudNet Panel

const isDevelopment = import.meta.env.DEV;

// API Base URL
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:5000/api' 
  : '/api';

// WebSocket URL
export const getWebSocketUrl = (): string => {
  if (isDevelopment) {
    // In development, connect directly to the server port
    return 'ws://localhost:5000';
  } else {
    // In production, use the same host as the current page
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
};