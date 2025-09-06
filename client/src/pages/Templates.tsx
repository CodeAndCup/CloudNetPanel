import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../contexts/I18nContext';
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
  X,
  Shield
} from 'lucide-react';
import axios from '../services/axiosConfig';
import clsx from 'clsx';
import PermissionManager from '../components/PermissionManager';

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
  const { t } = useTranslation();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFile, setEditingFile] = useState<FileContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showPermissionManager, setShowPermissionManager] = useState(false);
  const [selectedItemForPermissions, setSelectedItemForPermissions] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles(currentPath);
    fetchCurrentUser();
  }, [currentPath]);

  const fetchCurrentUser = async () => {
    try {
      // Get current user from token or context - for now assume admin based on role
      // This would typically come from a context or decoded JWT token
      const token = localStorage.getItem('token');
      if (token) {
        // Decode token to get user role (simplified - in real app use proper JWT decoding)
        // For now, we'll assume admin role to show permissions
        setCurrentUser({ role: 'Administrators' });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

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

  const openPermissionManager = (filePath: string) => {
    setSelectedItemForPermissions(filePath);
    setShowPermissionManager(true);
  };

  const closePermissionManager = () => {
    setShowPermissionManager(false);
    setSelectedItemForPermissions('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const uploadFiles = async (fileList: FileList) => {
    setUploading(true);

    try {
      const formData = new FormData();

      // Add all files to FormData
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      // Add current path to FormData
      formData.append('path', currentPath);

      await axios.post('/api/templates/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Refresh files list after successful upload
      fetchFiles(currentPath);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
    // Reset the input so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('templates.title')}</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {t('templates.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-2">
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('templates.actions.newFolder')}
          </button>
          <button
            onClick={() => setShowNewFileDialog(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('templates.actions.newFile')}
          </button>
          <button
            onClick={triggerFileUpload}
            disabled={uploading}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('templates.actions.uploadFiles')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />
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
          {currentPath.split(/[/\\]/).filter(p => p).map((part, index, array) => (
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
                {t('templates.editFile.title')} {editingFile.path}
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={saveFile}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('templates.editFile.save')}
                </button>
                <button
                  onClick={() => setEditingFile(null)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('templates.editFile.close')}
                </button>
              </div>
            </div>
            <textarea
              value={editingFile.content}
              onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
              className="w-full h-[42rem] p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm"
              placeholder={t('common.placeholders.fileContent')}
            />
          </div>
        </div>
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('templates.createFile.title')}</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={t('templates.createFile.fileName')}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && createFile()}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowNewFileDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
              >
                {t('templates.createFile.cancel')}
              </button>
              <button
                onClick={createFile}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t('templates.createFile.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('templates.createFolder.title')}</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('templates.createFolder.folderName')}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowNewFolderDialog(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700"
              >
                {t('templates.createFolder.cancel')}
              </button>
              <button
                onClick={createFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('templates.createFolder.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      <div
        className={clsx(
          "bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md transition-colors",
          isDragOver && "border-2 border-dashed border-blue-500 bg-blue-50 dark:bg-blue-900/20"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="px-4 py-5 sm:p-6">
          {/* Upload indicator */}
          {uploading && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-3">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-sm text-blue-700 dark:text-blue-300">{t('templates.actions.uploadFile')}</span>
              </div>
            </div>
          )}

          {/* Drag and drop overlay */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 bg-opacity-75 z-10">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <p className="text-lg font-medium text-blue-700 dark:text-blue-300">{t('templates.dropZone.dropFiles')}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{t('templates.dropZone.toDirectory', { directory: currentPath || t('templates.dropZone.rootDirectory') })}</p>
              </div>
            </div>
          )}

          {currentPath && (
            <button
              onClick={navigateUp}
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('common.back')}
            </button>
          )}

          {files.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('templates.emptyState.noFiles')}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('templates.emptyState.getStarted')}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('templates.filesManager.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('templates.filesManager.size')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('templates.filesManager.modified')}
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
                          {file.name.includes('.jar') ? (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                          ) : (
                            <button
                              onClick={() => openFile(file)}
                              className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600"
                            >
                              {file.name}
                            </button>
                          )}
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
                          {currentUser?.role === 'Administrators' && (
                            <button
                              onClick={() => openPermissionManager(file.path)}
                              className="text-purple-600 hover:text-purple-900"
                              title={t('common.tooltips.managePermissions')}
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}
                          {file.type === 'file' && !file.name.includes('.jar') && file.permissions.read && (
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

      {/* Permission Manager Modal */}
      {showPermissionManager && (
        <PermissionManager
          filePath={selectedItemForPermissions}
          onClose={closePermissionManager}
        />
      )}
    </div>
  );
};

export default Templates;