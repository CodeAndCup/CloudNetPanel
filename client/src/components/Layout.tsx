import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Cloud, 
  LayoutDashboard, 
  Server, 
  Network, 
  Users, 
  LogOut, 
  Menu,
  X,
  FileText,
  Archive,
  Settings,
  UserCheck,
  Sun,
  Moon,
  Activity,
  ChevronDown,
  Shield,
  UserCog,
  Webhook
} from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Main navigation without admin-only items
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Servers', href: '/servers', icon: Server },
    { name: 'Nodes', href: '/nodes', icon: Network },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Backups', href: '/backups', icon: Archive },
    { name: 'Tasks', href: '/tasks', icon: Settings },
  ];

  // Admin section (only for admin users)
  const adminNavigation = [
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Groups', href: '/admin/groups', icon: UserCheck },
    { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
  ];

  const isAdmin = user?.role === 'Administrators';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  const isActive = (href: string) => {
    return location.pathname === href || (href === '/dashboard' && location.pathname === '/');
  };

  const isAdminActive = (href: string) => {
    return location.pathname === href;
  };

  const getPageTitle = () => {
    // Check admin routes
    const adminRoute = adminNavigation.find(item => isAdminActive(item.href));
    if (adminRoute) return adminRoute.name;
    
    // Check profile routes
    if (location.pathname.startsWith('/profile/')) {
      if (location.pathname === '/profile/account') return 'Account Settings';
      if (location.pathname === '/profile/activity') return 'My Activity';
      return 'Profile';
    }
    
    // Check main navigation
    const mainRoute = navigation.find(item => isActive(item.href));
    return mainRoute?.name || 'Dashboard';
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
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
              
              {/* Admin Section */}
              {isAdmin && (
                <>
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center px-2 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin
                    </div>
                    {adminNavigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={clsx(
                            isAdminActive(item.href)
                              ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                            'group flex items-center px-2 py-2 text-base font-medium rounded-md ml-4'
                          )}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className={clsx(
                            isAdminActive(item.href) ? 'text-red-500 dark:text-red-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                            'mr-4 flex-shrink-0 h-5 w-5'
                          )} />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
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
                
                {/* Admin Section */}
                {isAdmin && (
                  <>
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </div>
                      {adminNavigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            className={clsx(
                              isAdminActive(item.href)
                                ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
                              'group flex items-center px-2 py-2 text-sm font-medium rounded-md ml-4'
                            )}
                          >
                            <Icon className={clsx(
                              isAdminActive(item.href) ? 'text-red-500 dark:text-red-400' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                              'mr-3 flex-shrink-0 h-5 w-5'
                            )} />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
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
                    {getPageTitle()}
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
                  {/* User dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md p-2"
                    >
                      <UserCog className="h-5 w-5" />
                      <span>{user?.username}</span>
                      <ChevronDown className={clsx(
                        'h-4 w-4 transition-transform',
                        showUserDropdown ? 'rotate-180' : ''
                      )} />
                    </button>
                    
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="py-1">
                          <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                            <p className="font-medium">{user?.username}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                          </div>
                          <Link
                            to="/profile/account"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <div className="flex items-center">
                              <UserCog className="mr-3 h-4 w-4" />
                              Account Settings
                            </div>
                          </Link>
                          <Link
                            to="/profile/activity"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setShowUserDropdown(false)}
                          >
                            <div className="flex items-center">
                              <Activity className="mr-3 h-4 w-4" />
                              My Activity
                            </div>
                          </Link>
                          <div className="border-t border-gray-200 dark:border-gray-600">
                            <button
                              onClick={() => {
                                setShowUserDropdown(false);
                                logout();
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <div className="flex items-center">
                                <LogOut className="mr-3 h-4 w-4" />
                                Sign out
                              </div>
                            </button>
                          </div>
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
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;