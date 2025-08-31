import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Plus, 
  Download, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

interface Backup {
  id: number;
  name: string;
  type: 'manual' | 'scheduled';
  source_path: string;
  backup_path: string;
  size?: number;
  status: 'pending' | 'completed' | 'failed';
  created_by: number;
  created_by_username: string;
  created_at: string;
}

const Backups: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [newBackup, setNewBackup] = useState({
    name: '',
    sourcePath: ''
  });
  const [newScheduledBackup, setNewScheduledBackup] = useState({
    name: '',
    sourcePath: '',
    schedule: '0 2 * * *' // Daily at 2 AM
  });

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/backups');
      setBackups(response.data);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const createManualBackup = async () => {
    if (!newBackup.name || !newBackup.sourcePath) return;

    try {
      await axios.post('/api/backups/manual', newBackup);
      setShowCreateDialog(false);
      setNewBackup({ name: '', sourcePath: '' });
      fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  };

  const createScheduledBackup = async () => {
    if (!newScheduledBackup.name || !newScheduledBackup.sourcePath || !newScheduledBackup.schedule) return;

    try {
      await axios.post('/api/backups/schedule', newScheduledBackup);
      setShowScheduleDialog(false);
      setNewScheduledBackup({ name: '', sourcePath: '', schedule: '0 2 * * *' });
      fetchBackups();
    } catch (error) {
      console.error('Error creating scheduled backup:', error);
    }
  };

  const downloadBackup = async (backup: Backup) => {
    try {
      const response = await axios.get(`/api/backups/${backup.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.backup_path;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
    }
  };

  const deleteBackup = async (backup: Backup) => {
    if (!confirm(`Are you sure you want to delete backup "${backup.name}"?`)) return;

    try {
      await axios.delete(`/api/backups/${backup.id}`);
      fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Backups</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage template backups and schedules
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={() => setShowScheduleDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <Clock className="h-4 w-4 mr-2" />
            Schedule Backup
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Backup
          </button>
        </div>
      </div>

      {/* Create Manual Backup Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Manual Backup</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newBackup.name}
                onChange={(e) => setNewBackup({...newBackup, name: e.target.value})}
                placeholder="Backup name..."
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={newBackup.sourcePath}
                onChange={(e) => setNewBackup({...newBackup, sourcePath: e.target.value})}
                placeholder="Source path (e.g., spigot/config)"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createManualBackup}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Backup Dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Backup</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newScheduledBackup.name}
                onChange={(e) => setNewScheduledBackup({...newScheduledBackup, name: e.target.value})}
                placeholder="Backup name..."
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={newScheduledBackup.sourcePath}
                onChange={(e) => setNewScheduledBackup({...newScheduledBackup, sourcePath: e.target.value})}
                placeholder="Source path (e.g., spigot/config)"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                value={newScheduledBackup.schedule}
                onChange={(e) => setNewScheduledBackup({...newScheduledBackup, schedule: e.target.value})}
                placeholder="Cron schedule (e.g., 0 2 * * *)"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500">
                Cron format: minute hour day month day-of-week<br/>
                Example: "0 2 * * *" = Daily at 2 AM
              </p>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowScheduleDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createScheduledBackup}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Schedule Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backups List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Archive className="h-5 w-5 text-blue-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {backup.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          by {backup.created_by_username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'inline-flex px-2 text-xs font-semibold rounded-full',
                      backup.type === 'scheduled' 
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    )}>
                      {backup.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {backup.source_path}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(backup.status)}
                      <span className={clsx(
                        'ml-2 inline-flex px-2 text-xs font-semibold rounded-full',
                        getStatusColor(backup.status)
                      )}>
                        {backup.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(backup.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {backup.status === 'completed' && (
                        <button
                          onClick={() => downloadBackup(backup)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download backup"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteBackup(backup)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete backup"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {backups.length === 0 && (
            <div className="text-center py-12">
              <Archive className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No backups</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first backup.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Backups;