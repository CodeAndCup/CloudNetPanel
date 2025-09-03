import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface ActivityItem {
  id: number;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  created_at: string;
}

const ProfileActivity: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    resource_type: '',
    days: 30
  });

  const resourceTypes = [
    { value: '', label: 'All Activities' },
    { value: 'server', label: 'Server Actions' },
    { value: 'file', label: 'File Operations' },
    { value: 'user', label: 'User Management' },
    { value: 'group', label: 'Group Management' },
    { value: 'task', label: 'Task Management' },
    { value: 'backup', label: 'Backup Operations' },
  ];

  const timePeriods = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
  ];

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/activities/my-activity', {
        params: {
          resource_type: filter.resource_type || undefined,
          days: filter.days
        }
      });
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) {
      return 'text-green-600 dark:text-green-400';
    }
    if (action.includes('delete') || action.includes('remove')) {
      return 'text-red-600 dark:text-red-400';
    }
    if (action.includes('update') || action.includes('edit') || action.includes('modify')) {
      return 'text-blue-600 dark:text-blue-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'server':
        return '🖥️';
      case 'file':
        return '📄';
      case 'user':
        return '👤';
      case 'group':
        return '👥';
      case 'task':
        return '⚙️';
      case 'backup':
        return '💾';
      default:
        return '📝';
    }
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Activity</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          View your recent activities and actions in the system
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <Filter className="mr-2 h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            
            <div>
              <select
                value={filter.resource_type}
                onChange={(e) => setFilter({ ...filter, resource_type: e.target.value })}
                className="block w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {resourceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={filter.days}
                onChange={(e) => setFilter({ ...filter, days: parseInt(e.target.value) })}
                className="block w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {timePeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {activities.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No activities found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No activities match your current filters.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-600">
            {activities.map((activity) => (
              <li key={activity.id} className="px-6 py-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-sm">
                      {getResourceIcon(activity.resource_type)}
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        <span className={getActionColor(activity.action)}>
                          {activity.action}
                        </span>
                        {activity.resource_id && (
                          <span className="ml-2 text-gray-500 dark:text-gray-400">
                            on {activity.resource_type} "{activity.resource_id}"
                          </span>
                        )}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="mr-1 h-4 w-4" />
                        {formatDate(activity.created_at)}
                      </div>
                    </div>
                    {activity.details && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {activity.details}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Activity Summary */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center">
            <User className="mr-2 h-5 w-5" />
            Activity Summary
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activities.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Total Activities
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activities.filter(a => a.action.includes('create') || a.action.includes('add')).length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                Create Actions
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {activities.filter(a => a.action.includes('update') || a.action.includes('modify')).length}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Modify Actions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileActivity;