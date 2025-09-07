// API Base URL
export const API_BASE_URL = `http://${window.location.hostname}:5000`;

// WebSocket URL
export const getWebSocketUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  return `${protocol}${window.location.hostname}:5000`;
};