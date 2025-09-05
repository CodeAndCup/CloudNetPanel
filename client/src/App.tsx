import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CloudNetProvider, useCloudNet } from './contexts/CloudNetContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Nodes from './pages/Nodes';
import Templates from './pages/Templates';
import Backups from './pages/Backups';
import Tasks from './pages/Tasks';
import Activities from './pages/Activities';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import CloudNetErrorPage from './components/CloudNetErrorPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();
  const { showErrorPage, setShowErrorPage, checkStatus } = useCloudNet();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Show CloudNet error page if there's a connectivity issue
  if (showErrorPage) {
    return (
      <CloudNetErrorPage
        onRetry={async () => {
          await checkStatus();
          // If CloudNet is back online, hide the error page
          setShowErrorPage(false);
        }}
      />
    );
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
        <Route path="/activities" element={<Activities />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <CloudNetProvider>
        <AuthProvider>
          <I18nProvider>
            <Router>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                <AppRoutes />
              </div>
            </Router>
          </I18nProvider>
        </AuthProvider>
      </CloudNetProvider>
    </ThemeProvider>
  );
};

export default App;