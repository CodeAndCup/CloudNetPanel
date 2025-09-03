import React, { useState } from 'react';
import { User, Activity, Settings } from 'lucide-react';
import AccountTab from './profile/AccountTab';
import ActivityTab from './profile/ActivityTab';

type ProfileTab = 'account' | 'activity';

const Profile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('account');

  const tabs = [
    { id: 'account' as ProfileTab, name: 'Account', icon: User },
    { id: 'activity' as ProfileTab, name: 'Activity', icon: Activity },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountTab />;
      case 'activity':
        return <ActivityTab />;
      default:
        return <AccountTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Settings className="h-8 w-8 mr-3 text-blue-600" />
            Profile Settings
          </h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage your account settings and view your activity
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Profile;