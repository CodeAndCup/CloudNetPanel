import React, { useState, useEffect } from 'react';
import { Shield, User, Users } from 'lucide-react';
import axios from 'axios';

interface Permission {
  id: number;
  path: string;
  group_id?: number;
  user_id?: number;
  permission_type: string;
  group_name?: string;
  username?: string;
}

interface Group {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
}

interface PermissionManagerProps {
  filePath: string;
  onClose: () => void;
}

const PermissionManager: React.FC<PermissionManagerProps> = ({ filePath, onClose }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newPermission, setNewPermission] = useState({
    targetType: 'group' as 'group' | 'user',
    targetId: '',
    permissionType: 'read'
  });

  useEffect(() => {
    fetchPermissions();
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchPermissions = async () => {
    try {
      // This would be a new API endpoint to get permissions for a specific path
      // For now, we'll show an empty list
      setPermissions([]);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

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
    }
  };

  const addPermission = async () => {
    if (!newPermission.targetId) return;

    try {
      // This would be implemented in the backend
      console.log('Adding permission:', {
        path: filePath,
        [newPermission.targetType === 'group' ? 'groupId' : 'userId']: parseInt(newPermission.targetId),
        permissionType: newPermission.permissionType
      });
      
      // Reset form
      setNewPermission({
        targetType: 'group',
        targetId: '',
        permissionType: 'read'
      });
      
      fetchPermissions();
    } catch (error) {
      console.error('Error adding permission:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Manage Permissions: {filePath || 'Root Directory'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Add New Permission */}
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Add Permission</h4>
          <div className="grid grid-cols-4 gap-3">
            <select
              value={newPermission.targetType}
              onChange={(e) => setNewPermission({...newPermission, targetType: e.target.value as any})}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="group">Group</option>
              <option value="user">User</option>
            </select>
            
            <select
              value={newPermission.targetId}
              onChange={(e) => setNewPermission({...newPermission, targetId: e.target.value})}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select {newPermission.targetType}</option>
              {newPermission.targetType === 'group' 
                ? groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))
                : users.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))
              }
            </select>
            
            <select
              value={newPermission.permissionType}
              onChange={(e) => setNewPermission({...newPermission, permissionType: e.target.value})}
              className="p-2 border border-gray-300 rounded-md"
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="delete">Delete</option>
            </select>
            
            <button
              onClick={addPermission}
              disabled={!newPermission.targetId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        {/* Current Permissions */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Current Permissions</h4>
          {permissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="mx-auto h-8 w-8 mb-2" />
              <p>No specific permissions set.</p>
              <p className="text-xs">Admins have full access by default.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    {permission.group_id ? (
                      <Users className="h-4 w-4 text-blue-500" />
                    ) : (
                      <User className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm font-medium">
                      {permission.group_name || permission.username}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {permission.permission_type}
                    </span>
                  </div>
                  <button
                    onClick={() => {/* TODO: Implement delete permission */}}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionManager;