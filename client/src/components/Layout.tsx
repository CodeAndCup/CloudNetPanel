import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Cloud, 
  LayoutDashboard, 
  Server, 
  Network, 
  LogOut, 
  Menu,
  X,
  FileText,
  Archive,
  Settings,
  Sun,
  Moon,
  Activity,
  ChevronDown,
  User,
  BarChart3
} from 'lucide-react';
import clsx from 'clsx';
import Footer from './Footer';
import UpdateNotification from './UpdateNotification';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Servers', href: '/servers', icon: Server },
    { name: 'Nodes', href: '/nodes', icon: Network },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Backups', href: '/backups', icon: Archive },
    { name: 'Tasks', href: '/tasks', icon: Settings },
    { name: 'Activities', href: '/activities', icon: Activity },
    { name: 'Statistics', href: '/statistics', icon: BarChart3 },
    { name: 'Administration', href: '/admin', icon: Settings },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || (href === '/dashboard' && location.pathname === '/');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar */}
        <div className={clsx(
          'fixed inset-0 flex z-40 md:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <Cloud className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">CloudNet</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                        'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className={clsx(
                        isActive(item.href) ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                        'mr-4 flex-shrink-0 h-6 w-6'
                      )} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Static sidebar for desktop */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col h-0 flex-1 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="flex items-center flex-shrink-0 px-4">
                  <Cloud className="h-8 w-8 text-blue-600" />
                  <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">CloudNet</span>
                </div>
                <nav className="mt-5 flex-1 px-2 bg-white dark:bg-gray-800 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={clsx(
                          isActive(item.href)
                            ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                          'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                        )}
                      >
                        <Icon className={clsx(
                          isActive(item.href) ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                          'mr-3 flex-shrink-0 h-6 w-6'
                        )} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-0 flex-1 overflow-hidden">
          {/* Top header */}
          <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow dark:shadow-gray-700">
            <button
              className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1 px-4 flex justify-between">
              <div className="flex-1 flex">
                <div className="w-full flex md:ml-0">
                  <div className="relative w-full text-gray-400 focus-within:text-gray-600 flex items-center">
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
                    </h1>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center md:ml-6">
                <div className="relative">
                  <div className="flex items-center space-x-4">
                    {/* Theme toggle button */}
                    <button
                      onClick={toggleTheme}
                      className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                      {theme === 'light' ? (
                        <Moon className="h-5 w-5" />
                      ) : (
                        <Sun className="h-5 w-5" />
                      )}
                    </button>

                    {/* Profile dropdown */}
                    <div className="relative" ref={profileRef}>
                      <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">
                          Welcome, {user?.username}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </button>

                      {/* Dropdown menu */}
                      {profileOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                          <div className="py-1">
                            <Link
                              to="/profile"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              onClick={() => setProfileOpen(false)}
                            >
                              <User className="h-4 w-4 mr-3" />
                              Profile Settings
                            </Link>
                            <button
                              onClick={() => {
                                setProfileOpen(false);
                                logout();
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <LogOut className="h-4 w-4 mr-3" />
                              Sign Out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-50 dark:bg-gray-900">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <UpdateNotification />
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Layout;