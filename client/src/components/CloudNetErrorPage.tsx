import React from 'react';
import { Cloud, AlertTriangle, RefreshCw } from 'lucide-react';

interface CloudNetErrorPageProps {
  onRetry?: () => void;
  error?: string;
}

const CloudNetErrorPage: React.FC<CloudNetErrorPageProps> = ({ onRetry, error }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full space-y-8 p-8 text-center">
        <div className="flex justify-center items-center mb-4">
          <div className="relative">
            <Cloud className="h-16 w-16 text-gray-400" />
            <AlertTriangle className="h-8 w-8 text-red-500 absolute -bottom-1 -right-1" />
          </div>
        </div>
        
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            CloudNet Not Connected
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Unable to connect to CloudNet REST API
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Connection Failed
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error || 'The CloudNet Panel requires a connection to the CloudNet REST API to function. Please ensure CloudNet is running and the API is accessible.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-left text-sm text-gray-600 dark:text-gray-300">
            <h4 className="font-medium mb-2">Please check:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>CloudNet server is running</li>
              <li>CloudNet REST API module is loaded</li>
              <li>API URL and credentials are correct</li>
              <li>Network connectivity to CloudNet server</li>
            </ul>
          </div>

          {onRetry && (
            <button
              onClick={onRetry}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Made with <span className="text-red-500">♥</span> by Perrier
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloudNetErrorPage;