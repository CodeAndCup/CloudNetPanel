// API Configuration for CloudNet Panel

const isDevelopment = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';

// API Base URL
export const API_BASE_URL = 'http://127.0.0.1:5000';

// WebSocket URL
export const getWebSocketUrl = (): string => {
  return window.location.protocol === 'https:' ? 'wss://' : 'ws://' + '127.0.0.1:5000';
};