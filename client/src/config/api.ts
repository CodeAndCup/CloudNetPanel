// API Configuration for CloudNet Panel

// API Base URL
export const API_BASE_URL = `http://${window.location.host}`

// WebSocket URL
export const getWebSocketUrl = (): string => {
  return `ws://${window.location.host}`;
};