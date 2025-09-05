import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/I18nContext';
import { Activity, Filter, Calendar, User, Server, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../services/axiosConfig';

interface ActivityItem {
  id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string;
  created_at: string;
}

const ActivityTab: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    try {
      // TODO: Implement user-specific activity endpoint
      const response = await axios.get('/api/activities');
      // Filter to show only current user's activities
      const userActivities = response.data.filter((activity: any) => 
        activity.user_id === user?.id
      );
      setActivities(userActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'user':
        return User;
      case 'server':
        return Server;
      case 'file':
      case 'template':
        return FileText;
      default:
        return Activity;
    }
  };

  const getActivityColor = (action: string) => {
    if (action.includes('create') || action.includes('start')) return 'text-green-600';
    if (action.includes('delete') || action.includes('stop')) return 'text-red-600';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600';
    return 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getActionDescription = (activity: ActivityItem) => {
    const action = activity.action;
    const resourceType = activity.resource_type;
    const resourceId = activity.resource_id;

    switch (action) {
      case 'login':
        return 'Signed in to the panel';
      case 'logout':
        return 'Signed out of the panel';
      case 'create':
        return `Created ${resourceType} ${resourceId || ''}`.trim();
      case 'update':
        return `Updated ${resourceType} ${resourceId || ''}`.trim();
      case 'delete':
        return `Deleted ${resourceType} ${resourceId || ''}`.trim();
      default:
        return `Performed ${action} on ${resourceType} ${resourceId || ''}`.trim();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Activity
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track your recent actions and logins
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Filter className="h-4 w-4 mr-2 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Activities</option>
              <option value="auth">Authentication</option>
              <option value="file">File Operations</option>
              <option value="server">Server Actions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No activity</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your recent activities will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.resource_type);
              return (
                <li key={activity.id} className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Icon className={`h-4 w-4 ${getActivityColor(activity.action)}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {getActionDescription(activity)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(activity.created_at)}
                        </div>
                        {activity.ip_address && (
                          <div>
                            IP: {activity.ip_address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ActivityTab;