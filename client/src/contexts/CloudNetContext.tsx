import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCloudNetStatus } from '../hooks/useCloudNetStatus';

interface CloudNetContextType {
  connected: boolean;
  enabled: boolean;
  error?: string;
  loading: boolean;
  checkStatus: () => Promise<void>;
  showErrorPage: boolean;
  setShowErrorPage: (show: boolean) => void;
}

const CloudNetContext = createContext<CloudNetContextType | undefined>(undefined);

export const useCloudNet = () => {
  const context = useContext(CloudNetContext);
  if (context === undefined) {
    throw new Error('useCloudNet must be used within a CloudNetProvider');
  }
  return context;
};

interface CloudNetProviderProps {
  children: ReactNode;
}

export const CloudNetProvider: React.FC<CloudNetProviderProps> = ({ children }) => {
  const cloudNetStatus = useCloudNetStatus();
  const [showErrorPage, setShowErrorPage] = useState(false);

  // Temporarily disable CloudNet error page for i18n demo
  useEffect(() => {
    // Listen for CloudNet connectivity errors from axios interceptor
    const handleCloudNetUnavailable = (event: CustomEvent) => {
      console.error('CloudNet unavailable:', event.detail);
      // setShowErrorPage(true); // Disabled for demo
    };

    const handleCloudNetDisabled = (event: CustomEvent) => {
      console.error('CloudNet disabled:', event.detail);
      // setShowErrorPage(true); // Disabled for demo
    };

    window.addEventListener('cloudnet-unavailable', handleCloudNetUnavailable as EventListener);
    window.addEventListener('cloudnet-disabled', handleCloudNetDisabled as EventListener);

    return () => {
      window.removeEventListener('cloudnet-unavailable', handleCloudNetUnavailable as EventListener);
      window.removeEventListener('cloudnet-disabled', handleCloudNetDisabled as EventListener);
    };
  }, []);

  // Set initial error page state based on connection status
  useEffect(() => {
    // Temporarily disable for demo
    /*
    if (!cloudNetStatus.loading && cloudNetStatus.enabled && !cloudNetStatus.connected) {
      setShowErrorPage(true);
    } else if (cloudNetStatus.connected) {
      setShowErrorPage(false);
    }
    */
  }, [cloudNetStatus.connected, cloudNetStatus.enabled, cloudNetStatus.loading]);

  const value = {
    connected: cloudNetStatus.connected,
    enabled: cloudNetStatus.enabled,
    error: cloudNetStatus.error,
    loading: cloudNetStatus.loading,
    checkStatus: cloudNetStatus.checkStatus,
    showErrorPage,
    setShowErrorPage
  };

  return <CloudNetContext.Provider value={value}>{children}</CloudNetContext.Provider>;
};