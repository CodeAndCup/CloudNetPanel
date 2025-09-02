import React, { useState, useEffect } from 'react';
import {
  Folder,
  File,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  ArrowLeft,
  Save,
  X
} from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
}

interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
  modified: string;
}

const Templates: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFile, setEditingFile] = useState<FileContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/templates/files?path=${encodeURIComponent(path)}`);
      setFiles(response.data.items || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    setEditingFile(null);
    setIsEditing(false);
  };

  const navigateUp = () => {
    const pathParts = currentPath.split('/').filter(p => p);
    pathParts.pop();
    navigateToPath(pathParts.join('/'));
  };

  const openFile = async (file: FileItem) => {
    if (file.type === 'directory') {
      navigateToPath(file.path);
      return;
    }

    try {
      const response = await axios.get(`/api/templates/files/content?path=${encodeURIComponent(file.path)}`);
      setEditingFile(response.data);
      setIsEditing(true);
    } catch (error) {
      console.error('Error opening file:', error);
    }
  };

  const saveFile = async () => {
    if (!editingFile) return;

    try {
      await axios.put('/api/templates/files/content', {
        path: editingFile.path,
        content: editingFile.content
      });

      setIsEditing(false);
      fetchFiles(currentPath);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const createFile = async () => {
    if (!newFileName) return;

    const filePath = currentPath ? `${currentPath}/${newFileName}` : newFileName;

    try {
      await axios.put('/api/templates/files/content', {
        path: filePath,
        content: ''
      });

      setShowNewFileDialog(false);
      setNewFileName('');
      fetchFiles(currentPath);
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName) return;

    const folderPath = currentPath ? `${currentPath}/${newFolderName}` : newFolderName;

    try {
      await axios.post('/api/templates/files/directory', {
        path: folderPath
      });

      setShowNewFolderDialog(false);
      setNewFolderName('');
      fetchFiles(currentPath);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const deleteItem = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

    try {
      await axios.delete('/api/templates/files', {
        data: { path: file.path }
      });

      fetchFiles(currentPath);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Templates</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage server templates and configuration files
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </button>
          <button
            onClick={() => setShowNewFileDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            New File
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <button
              onClick={() => navigateToPath('')}
              className="text-blue-600 hover:text-blue-800"
            >
              templates
            </button>
          </li>
          {currentPath.split('/').filter(p => p).map((part, index, array) => (
            <li key={index} className="flex items-center">
              <span className="text-gray-400 mx-2">/</span>
              <button
                onClick={() => navigateToPath(array.slice(0, index + 1).join('/'))}
                className="text-blue-600 hover:text-blue-800"
              >
                {part}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* File Editor */}
      {editingFile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Editing: {editingFile.path}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={saveFile}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </button>
                <button
                  onClick={() => setEditingFile(null)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </button>
              </div>
            </div>
            <textarea
              value={editingFile.content}
              onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
              className="w-full h-[42rem] p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm"
              placeholder="File content..."
            />
          </div>
        </div>
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="File name..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && createFile()}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowNewFileDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createFile}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowNewFolderDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {currentPath && (
            <button
              onClick={navigateUp}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          )}

          {files.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No files</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new file or folder.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {files.map((file) => (
                    <tr key={file.path} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {file.type === 'directory' ? (
                            <Folder className="h-5 w-5 text-blue-500 mr-3" />
                          ) : (
                            <File className="h-5 w-5 text-gray-400 mr-3" />
                          )}
                          <button
                            onClick={() => openFile(file)}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600"
                          >
                            {file.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {file.type === 'file' ? formatFileSize(file.size) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(file.modified)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {file.type === 'file' && file.permissions.read && (
                            <button
                              onClick={() => openFile(file)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {file.permissions.delete && (
                            <button
                              onClick={() => deleteItem(file)}
                              className="text-red-600 hover:text-red-900"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Templates;