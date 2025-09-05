import React, { useState } from 'react';
import { Save, Key, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';

const AccountTab: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, languages, t, updateUserLanguage } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [languageSaving, setLanguageSaving] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement password change API call
    if (newPassword !== confirmPassword) {
      alert(t('errors.validationError'));
      return;
    }
    console.log('Changing password...');
  };

  const handleLanguageChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLanguageSaving(true);
    
    try {
      const success = await updateUserLanguage(language);
      if (success) {
        // Show success message (you could add a toast notification here)
        console.log('Language updated successfully');
      } else {
        console.error('Failed to update language');
        alert(t('errors.generic'));
      }
    } catch (error) {
      console.error('Error updating language:', error);
      alert(t('errors.generic'));
    } finally {
      setLanguageSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Account Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('profile.accountInformation')}
          </h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.username')}
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.email')}
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.role')}
              </label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Key className="h-5 w-5 mr-2 text-blue-600" />
            {t('profile.changePassword')}
          </h3>
        </div>
        <form onSubmit={handlePasswordChange} className="px-6 py-4">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.currentPassword')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.newPassword')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('profile.confirmNewPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="h-4 w-4 mr-2" />
              {t('profile.changePassword')}
            </button>
          </div>
        </form>
      </div>

      {/* Language Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Globe className="h-5 w-5 mr-2 text-blue-600" />
            {t('profile.languageSettings')}
          </h3>
        </div>
        <form onSubmit={handleLanguageChange} className="px-6 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('profile.displayLanguage')}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              disabled={languageSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {languageSaving ? t('common.loading') : t('profile.saveLanguage')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountTab;