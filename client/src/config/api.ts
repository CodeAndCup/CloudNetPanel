// API Configuration for CloudNet Panel

const isDevelopment = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';

// API Base URL
export const API_BASE_URL = isDevelopment
  ? 'http://' + process.env.IP + ':5000'
  : '/api';

// WebSocket URL
export const getWebSocketUrl = (): string => {
  if (isDevelopment) {
    // In development, connect directly to the server port
    return 'ws://' + process.env.IP + ':5000';
  } else {
    // In production, use the same host as the current page
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
};