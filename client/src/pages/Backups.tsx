import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/I18nContext';
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
import axios from '../services/axiosConfig';
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
  const { t } = useTranslation();
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
        return <AlertCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const translateStatus = (status: string) => {
    return t(`backups.status.${status}`) || status;
  };

  const translateType = (type: string) => {
    return t(`common.${type}`) || type;
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('backups.title')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {t('backups.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={() => setShowScheduleDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <Clock className="h-4 w-4 mr-2" />
            {t('backups.scheduleBackup')}
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('backups.createManualBackup')}
          </button>
        </div>
      </div>

      {/* Create Manual Backup Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('backups.createManualBackup')}</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newBackup.name}
                onChange={(e) => setNewBackup({ ...newBackup, name: e.target.value })}
                placeholder={t('backups.fields.name') + '...'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <input
                type="text"
                value={newBackup.sourcePath}
                onChange={(e) => setNewBackup({ ...newBackup, sourcePath: e.target.value })}
                placeholder={t('common.source') + ' path (e.g., spigot/config)'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={createManualBackup}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('backups.actions.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Backup Dialog */}
      {showScheduleDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('backups.scheduleBackup')}</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newScheduledBackup.name}
                onChange={(e) => setNewScheduledBackup({ ...newScheduledBackup, name: e.target.value })}
                placeholder={t('backups.fields.name') + '...'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <input
                type="text"
                value={newScheduledBackup.sourcePath}
                onChange={(e) => setNewScheduledBackup({ ...newScheduledBackup, sourcePath: e.target.value })}
                placeholder={t('common.source') + ' path (e.g., spigot/config)'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <input
                type="text"
                value={newScheduledBackup.schedule}
                onChange={(e) => setNewScheduledBackup({ ...newScheduledBackup, schedule: e.target.value })}
                placeholder="Cron schedule (e.g., 0 2 * * *)"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cron format: minute hour day month day-of-week<br />
                Example: "0 2 * * *" = Daily at 2 AM
              </p>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowScheduleDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={createScheduledBackup}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                {t('backups.scheduleBackup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backups List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                  {t('backups.fields.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                  {t('backups.fields.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                  {t('backups.fields.source')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                  {t('backups.fields.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                  {t('backups.fields.size')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                  {t('backups.fields.created')}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600 dark:divide-gray-600">
              {backups.map((backup) => (
                <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Archive className="h-5 w-5 text-blue-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {backup.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('common.by')} {backup.created_by_username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'inline-flex px-2 text-xs font-semibold rounded-full',
                      backup.type === 'scheduled'
                        ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                    )}>
                      {translateType(backup.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {backup.source_path}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(backup.status)}
                      <span className={clsx(
                        'ml-2 inline-flex px-2 text-xs font-semibold rounded-full',
                        getStatusColor(backup.status)
                      )}>
                        {translateStatus(backup.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(backup.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {backup.status === 'completed' && (
                        <button
                          onClick={() => downloadBackup(backup)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('backups.actions.download')}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteBackup(backup)}
                        className="text-red-600 hover:text-red-900"
                        title={t('common.delete')}
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
              <Archive className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('backups.noBackups')}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('backups.noBackupsSubtitle')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Backups;