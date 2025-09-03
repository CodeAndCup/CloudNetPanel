import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Webhook, ExternalLink, Activity } from 'lucide-react';
import axios from 'axios';

interface WebhookData {
  id: number;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  last_triggered: string | null;
}

const WebhooksTab: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      // For now, we'll use mock data since the webhook API doesn't exist yet
      // TODO: Replace with actual API call when backend is implemented
      const mockData: WebhookData[] = [
        {
          id: 1,
          name: 'Discord Notifications',
          url: 'https://discord.com/api/webhooks/123/456',
          events: ['user.created', 'server.started', 'server.stopped'],
          active: true,
          created_at: new Date().toISOString(),
          last_triggered: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 2,
          name: 'Slack Alerts',
          url: 'https://hooks.slack.com/services/T00/B00/XXX',
          events: ['user.login', 'backup.completed'],
          active: false,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          last_triggered: null
        }
      ];
      setWebhooks(mockData);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const toggleWebhook = async (id: number, active: boolean) => {
    try {
      // TODO: Implement API call to toggle webhook
      setWebhooks(prev => prev.map(webhook => 
        webhook.id === id ? { ...webhook, active } : webhook
      ));
    } catch (error) {
      console.error('Error toggling webhook:', error);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Webhook Management
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure webhooks to receive notifications when activities occur
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </button>
      </div>

      {/* Webhooks Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Webhook
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Events
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Last Triggered
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map((webhook) => (
              <tr key={webhook.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Webhook className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {webhook.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        {webhook.url}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {webhook.events.map((event, index) => (
                      <span
                        key={index}
                        className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    webhook.active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      webhook.active ? 'bg-green-400' : 'bg-gray-400'
                    }`} />
                    {webhook.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(webhook.last_triggered)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleWebhook(webhook.id, !webhook.active)}
                      className={`text-sm px-3 py-1 rounded ${
                        webhook.active 
                          ? 'text-red-600 hover:text-red-900 dark:text-red-400' 
                          : 'text-green-600 hover:text-green-900 dark:text-green-400'
                      }`}
                    >
                      {webhook.active ? 'Disable' : 'Enable'}
                    </button>
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {webhooks.length === 0 && (
        <div className="text-center py-12">
          <Webhook className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No webhooks</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new webhook.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhooksTab;