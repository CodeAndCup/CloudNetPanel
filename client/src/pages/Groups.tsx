import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/I18nContext';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus
} from 'lucide-react';
import axios from '../services/axiosConfig';
import clsx from 'clsx';

interface Group {
  id: number;
  name: string;
  description?: string;
  user_count: number;
  created_at: string;
  users?: User[];
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
}

const Groups: React.FC = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newGroup.name) return;

    try {
      await axios.post('/api/groups', newGroup);
      setShowCreateDialog(false);
      setNewGroup({ name: '', description: '' });
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const updateGroup = async () => {
    if (!editingGroup) return;

    try {
      await axios.put(`/api/groups/${editingGroup.id}`, {
        name: editingGroup.name,
        description: editingGroup.description
      });
      setEditingGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const deleteGroup = async (group: Group) => {
    setDeletingGroup(group);
    setShowDeleteModal(true);
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    
    setDeleting(true);
    
    try {
      await axios.delete(`/api/groups/${deletingGroup.id}`);
      fetchGroups();
      setShowDeleteModal(false);
      setDeletingGroup(null);
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setDeleting(false);
    }
  };

  const addUserToGroup = async (groupId: number, userId: number) => {
    try {
      await axios.post(`/api/groups/${groupId}/users`, { userId });
      fetchGroups();
    } catch (error) {
      console.error('Error adding user to group:', error);
    }
  };

  const removeUserFromGroup = async (groupId: number, userId: number) => {
    try {
      await axios.delete(`/api/groups/${groupId}/users/${userId}`);
      fetchGroups();
    } catch (error) {
      console.error('Error removing user from group:', error);
    }
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('groups.title')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage user groups and permissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('groups.addGroup')}
          </button>
        </div>
      </div>

      {/* Create Group Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('groups.createGroup')}</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                placeholder={t('groups.name') + '...'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <textarea
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                placeholder={t('groups.description') + ' (optional)...'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={createGroup}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('groups.createGroup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Dialog */}
      {editingGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('groups.editGroup')}</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={editingGroup.name}
                onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                placeholder={t('groups.name') + '...'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <textarea
                value={editingGroup.description || ''}
                onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                placeholder={t('groups.description') + ' (optional)...'}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setEditingGroup(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={updateGroup}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('groups.updateGroup')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {showDeleteModal && deletingGroup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
                {t('groups.deleteGroup')}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                {t('groups.confirmDelete')}
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-300 hover:bg-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteGroup}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleting ? t('common.loading') : t('common.delete')} {t('navigation.groups').slice(0, -1)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('navigation.users')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('common.created')}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-500 mr-3" />
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {group.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {group.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {group.user_count} {group.user_count === 1 ? 'user' : 'users'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(group.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {group.name !== 'Administrators' && (
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('common.edit') + ' group'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {group.name !== 'Administrators' && (
                        <button
                          onClick={() => deleteGroup(group)}
                          className="text-red-600 hover:text-red-900"
                          title={t('common.delete') + ' group'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {groups.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No groups</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating your first group.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Groups;