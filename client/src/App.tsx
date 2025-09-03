import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Nodes from './pages/Nodes';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Templates from './pages/Templates';
import Backups from './pages/Backups';
import Tasks from './pages/Tasks';
import Activities from './pages/Activities';

// Admin pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminGroups from './pages/admin/AdminGroups';
import AdminWebhooks from './pages/admin/AdminWebhooks';

// Profile pages
import ProfileAccount from './pages/profile/ProfileAccount';
import ProfileActivity from './pages/profile/ProfileActivity';

import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/servers" element={<Servers />} />
        <Route path="/nodes" element={<Nodes />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/backups" element={<Backups />} />
        <Route path="/tasks" element={<Tasks />} />
        
        {/* Admin routes - only for admin users */}
        {user?.role === 'Administrators' && (
          <>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/groups" element={<AdminGroups />} />
            <Route path="/admin/webhooks" element={<AdminWebhooks />} />
          </>
        )}
        
        {/* Profile routes */}
        <Route path="/profile/account" element={<ProfileAccount />} />
        <Route path="/profile/activity" element={<ProfileActivity />} />
        
        {/* Legacy routes - redirect to new structure */}
        <Route path="/users" element={
          user?.role === 'Administrators' 
            ? <Navigate to="/admin/users" replace /> 
            : <Navigate to="/dashboard" replace />
        } />
        <Route path="/groups" element={
          user?.role === 'Administrators' 
            ? <Navigate to="/admin/groups" replace /> 
            : <Navigate to="/dashboard" replace />
        } />
        <Route path="/activities" element={<Navigate to="/profile/activity" replace />} />
        
        <Route path="/login" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;