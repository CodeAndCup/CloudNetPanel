import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, languages } = useI18n();

  return (
    <div className="relative">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="appearance-none bg-transparent border-none text-gray-700 dark:text-gray-300 text-sm pl-8 pr-4 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
        title="Select Language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-white dark:bg-gray-800">
            {lang.name}
          </option>
        ))}
      </select>
      <Globe className="absolute left-1 top-1 h-4 w-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
    </div>
  );
};

export default LanguageSwitcher;