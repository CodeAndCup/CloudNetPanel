import { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';

interface CloudNetStatus {
  connected: boolean;
  enabled: boolean;
  baseUrl?: string;
  error?: string;
  loading: boolean;
}

export const useCloudNetStatus = () => {
  const [status, setStatus] = useState<CloudNetStatus>({
    connected: true, // Set to true for demo
    enabled: true,   // Set to true for demo
    loading: false   // Set to false for demo
  });

  const checkStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const response = await axios.get('/api/cloudnet/health');
      setStatus({
        connected: response.data.connected,
        enabled: response.data.enabled,
        baseUrl: response.data.baseUrl,
        loading: false
      });
    } catch (error: any) {
      setStatus({
        connected: false,
        enabled: error.response?.data?.enabled || false,
        baseUrl: error.response?.data?.baseUrl,
        error: error.response?.data?.error || 'Unable to check CloudNet status',
        loading: false
      });
    }
  };

  useEffect(() => {
    // checkStatus(); // Disabled for demo
  }, []);

  return { ...status, checkStatus };
};