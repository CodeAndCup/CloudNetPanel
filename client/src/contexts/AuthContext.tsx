import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { setupApiInterceptors } from '../utils/apiInterceptors';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  sessionValid: boolean;
  cloudNetConnected: boolean;
  checkSession: () => Promise<void>;
  checkCloudNetStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(true);
  const [cloudNetConnected, setCloudNetConnected] = useState(true);

  // Setup API interceptors
  useEffect(() => {
    setupApiInterceptors(
      () => {
        // Session expired handler
        setSessionValid(false);
        logout();
      },
      () => {
        // CloudNet disconnected handler
        setCloudNetConnected(false);
      }
    );
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
      
      // Set up periodic session validation (every 5 minutes)
      const sessionInterval = setInterval(checkSession, 5 * 60 * 1000);
      
      // Set up periodic CloudNet status check (every 30 seconds)
      const cloudNetInterval = setInterval(checkCloudNetStatus, 30 * 1000);
      
      return () => {
        clearInterval(sessionInterval);
        clearInterval(cloudNetInterval);
      };
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
      setSessionValid(true);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setSessionValid(false);
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    if (!localStorage.getItem('token')) {
      setSessionValid(false);
      return;
    }

    try {
      const response = await axios.get('/api/auth/status');
      setSessionValid(true);
      setCloudNetConnected(response.data.cloudNetConnected);
    } catch (error) {
      setSessionValid(false);
      logout();
    }
  };

  const checkCloudNetStatus = async () => {
    try {
      await axios.get('/api/cloudnet/health');
      setCloudNetConnected(true);
    } catch (error: any) {
      const isCloudNetError = error.response?.data?.type === 'cloudnet_unavailable' || 
                             error.response?.status === 503;
      setCloudNetConnected(!isCloudNetError);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return true;
    } catch (error: any) {
      // Handle CloudNet unavailable error specially
      if (error.response?.data?.type === 'cloudnet_unavailable') {
        console.error('CloudNet API unavailable:', error.response.data.message);
        // Don't store this error in the auth context, let the login page handle it
      }
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading,
    sessionValid,
    cloudNetConnected,
    checkSession,
    checkCloudNetStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};