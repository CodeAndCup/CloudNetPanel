import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  ExternalLink 
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

interface WebhookConfig {
  id: number;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}

const AdminWebhooks: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    active: true
  });

  const availableEvents = [
    'user_login',
    'user_logout', 
    'server_start',
    'server_stop',
    'template_modify',
    'backup_create',
    'task_execute'
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await axios.get('/api/admin/webhooks');
      setWebhooks(response.data);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    try {
      await axios.post('/api/admin/webhooks', newWebhook);
      setNewWebhook({ name: '', url: '', events: [], active: true });
      setShowNewDialog(false);
      fetchWebhooks();
    } catch (error) {
      console.error('Error creating webhook:', error);
    }
  };

  const updateWebhook = async () => {
    if (!editingWebhook) return;
    
    try {
      await axios.put(`/api/admin/webhooks/${editingWebhook.id}`, editingWebhook);
      setEditingWebhook(null);
      fetchWebhooks();
    } catch (error) {
      console.error('Error updating webhook:', error);
    }
  };

  const deleteWebhook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await axios.delete(`/api/admin/webhooks/${id}`);
      fetchWebhooks();
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const toggleWebhookStatus = async (id: number, active: boolean) => {
    try {
      await axios.patch(`/api/admin/webhooks/${id}/status`, { active });
      fetchWebhooks();
    } catch (error) {
      console.error('Error toggling webhook status:', error);
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
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage webhook endpoints for activity notifications
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowNewDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </button>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-600">
          {webhooks.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <Webhook className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No webhooks</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new webhook.
              </p>
            </li>
          ) : (
            webhooks.map((webhook) => (
              <li key={webhook.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {webhook.name}
                      </h3>
                      <span className={clsx(
                        'ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        webhook.active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      )}>
                        {webhook.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {webhook.url}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Events: {webhook.events.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleWebhookStatus(webhook.id, !webhook.active)}
                      className={clsx(
                        'inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                        webhook.active
                          ? 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500'
                          : 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500'
                      )}
                    >
                      {webhook.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setEditingWebhook(webhook)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* New Webhook Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Webhook</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Events</label>
                <div className="mt-2 space-y-2">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhook({...newWebhook, events: [...newWebhook.events, event]});
                          } else {
                            setNewWebhook({...newWebhook, events: newWebhook.events.filter(e => e !== event)});
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowNewDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createWebhook}
                disabled={!newWebhook.name || !newWebhook.url}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Webhook Dialog - Similar to New Dialog but pre-filled */}
      {editingWebhook && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Webhook</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={editingWebhook.name}
                  onChange={(e) => setEditingWebhook({...editingWebhook, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
                <input
                  type="url"
                  value={editingWebhook.url}
                  onChange={(e) => setEditingWebhook({...editingWebhook, url: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Events</label>
                <div className="mt-2 space-y-2">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingWebhook.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingWebhook({...editingWebhook, events: [...editingWebhook.events, event]});
                          } else {
                            setEditingWebhook({...editingWebhook, events: editingWebhook.events.filter(ev => ev !== event)});
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setEditingWebhook(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={updateWebhook}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWebhooks;