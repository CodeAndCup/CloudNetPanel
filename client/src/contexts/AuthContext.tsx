import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '../services/axiosConfig';
import { API_BASE_URL } from '../config/api';

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }

    // Set up periodic session validation (every 5 minutes)
    const sessionCheckInterval = setInterval(() => {
      if (localStorage.getItem('token')) {
        validateSession();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, []);

  const validateSession = async () => {
    try {
      await axios.get('/api/auth/me');
    } catch (error) {
      // Session validation will be handled by axios interceptor
      console.log('Session validation failed');
    }
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
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
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};