import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, RotateCcw } from 'lucide-react';

const CloudNetStatusBanner: React.FC = () => {
  const { cloudNetConnected, checkCloudNetStatus } = useAuth();

  if (cloudNetConnected) {
    return null; // Don't show banner when everything is connected
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <div>
            <p className="text-sm text-red-800 font-medium">
              CloudNet API Connection Lost
            </p>
            <p className="text-sm text-red-700">
              Unable to connect to CloudNet REST API. Some features may be unavailable.
            </p>
          </div>
        </div>
        <button
          onClick={checkCloudNetStatus}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Retry
        </button>
      </div>
    </div>
  );
};

export default CloudNetStatusBanner;