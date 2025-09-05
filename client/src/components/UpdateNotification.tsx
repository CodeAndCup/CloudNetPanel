import React, { useState, useEffect } from 'react';
import { Download, X, ExternalLink, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import axios from '../services/axiosConfig';

interface UpdateInfo {
  upToDate: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  directDownloadUrl?: string;
  error?: boolean;
  message?: string;
}

interface UpdateNotificationProps {
  onDismiss?: () => void;
  autoCheck?: boolean;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onDismiss, autoCheck = true }) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (autoCheck) {
      checkForUpdates();
    }
  }, [autoCheck]);

  const checkForUpdates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/updates/check');
      setUpdateInfo(response.data);
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateInfo({
        upToDate: true,
        currentVersion: '1.0.0',
        error: true,
        message: 'Failed to check for updates'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const parseReleaseNotes = (notes: string) => {
    if (!notes) return '';
    // Simple markdown-like parsing for basic formatting
    return notes
      .split('\n')
      .slice(0, 5) // Limit to first 5 lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  };

  if (loading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <Loader className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin mr-3" />
          <span className="text-sm text-blue-800 dark:text-blue-200">
            Checking for updates...
          </span>
        </div>
      </div>
    );
  }

  if (!updateInfo || dismissed) {
    return null;
  }

  if (updateInfo.error) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Update Check Failed
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {updateInfo.message}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  if (updateInfo.upToDate) {
    return (
      <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Up to date
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Version {updateInfo.currentVersion} is the latest version
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Update Available
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                {updateInfo.currentVersion} → {updateInfo.latestVersion}
              </span>
            </div>
            
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              A new version of CloudNet Panel is available.
              {updateInfo.publishedAt && (
                <span className="ml-1">
                  Released on {formatDate(updateInfo.publishedAt)}.
                </span>
              )}
            </p>

            {showDetails && updateInfo.releaseNotes && (
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-600">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Release Notes:
                </p>
                <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {parseReleaseNotes(updateInfo.releaseNotes)}
                </pre>
              </div>
            )}

            <div className="mt-3 flex items-center space-x-3">
              {updateInfo.downloadUrl && (
                <a
                  href={updateInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Release
                </a>
              )}
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              
              <button
                onClick={checkForUpdates}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                Check Again
              </button>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-4"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;