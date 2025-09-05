import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import translations
import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';
import deTranslations from '../locales/de.json';
import esTranslations from '../locales/es.json';
import itTranslations from '../locales/it.json';

// Import AuthContext (this must be imported here since AuthProvider wraps I18nProvider)
import { useAuth } from './AuthContext';

type TranslationKey = string;
type TranslationValue = string | { [key: string]: any };
type Translations = { [key: string]: TranslationValue };

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: TranslationKey, params?: { [key: string]: string | number }) => string;
  languages: { code: string; name: string }[];
  updateUserLanguage: (lang: string) => Promise<boolean>;
}

const translations: { [key: string]: Translations } = {
  en: enTranslations,
  fr: frTranslations,
  de: deTranslations,
  es: esTranslations,
  it: itTranslations,
};

const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
];

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { user, updateUserLanguage } = useAuth();
  
  // Get initial language from user profile, localStorage, or default to 'en'
  const [language, setLanguageState] = useState<string>(() => {
    const savedLanguage = localStorage.getItem('cloudnet-panel-language');
    return savedLanguage && translations[savedLanguage] ? savedLanguage : 'en';
  });

  // Update language when user changes (login/logout)
  useEffect(() => {
    if (user && user.language && translations[user.language]) {
      setLanguageState(user.language);
    } else if (!user) {
      // When logged out, use localStorage
      const savedLanguage = localStorage.getItem('cloudnet-panel-language');
      if (savedLanguage && translations[savedLanguage]) {
        setLanguageState(savedLanguage);
      }
    }
  }, [user]);

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('cloudnet-panel-language', language);
  }, [language]);

  const setLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguageState(lang);
    }
  };

  const updateLanguagePreference = async (lang: string): Promise<boolean> => {
    if (!translations[lang]) {
      return false;
    }

    setLanguageState(lang);

    // If user is authenticated, save to database
    if (user) {
      return await updateUserLanguage(lang);
    }

    // If not authenticated, just save to localStorage (already done by useEffect above)
    return true;
  };

  // Translation function with dot notation support
  const t = (key: TranslationKey, params?: { [key: string]: string | number }): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    // Navigate through the translation object using dot notation
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        let fallbackValue: any = translations['en'];
        for (const fallbackKey of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fallbackKey in fallbackValue) {
            fallbackValue = fallbackValue[fallbackKey];
          } else {
            return key; // Return the key itself if not found in any language
          }
        }
        value = fallbackValue;
        break;
      }
    }

    if (typeof value !== 'string') {
      return key; // Return the key if the final value is not a string
    }

    // Replace parameters in the translation
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value;
  };

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
    languages,
    updateUserLanguage: updateLanguagePreference,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

// Custom hook to use the i18n context
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Convenience hook for just the translation function
export const useTranslation = () => {
  const { t } = useI18n();
  return { t };
};

export default I18nContext;