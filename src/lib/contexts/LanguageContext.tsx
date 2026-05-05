'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  SupportedLanguage, 
  DEFAULT_LANGUAGE, 
  detectBrowserLanguage,
  getLanguageConfig,
  isRTL,
  getTextDirection,
  getLanguageClasses
} from '@/lib/utils/language';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  languageClasses: string;
  config: ReturnType<typeof getLanguageConfig>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
}

export function LanguageProvider({ children, defaultLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(
    defaultLanguage || DEFAULT_LANGUAGE
  );

  // Initialize language from localStorage or browser detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('preferred-language') as SupportedLanguage;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
        setLanguageState(savedLanguage);
      } else {
        const detectedLanguage = detectBrowserLanguage();
        setLanguageState(detectedLanguage);
      }
    }
  }, []);

  // Update document attributes when language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const config = getLanguageConfig(language);
      document.documentElement.lang = language;
      document.documentElement.dir = config.direction;
      
      // Add language-specific classes to body
      document.body.className = document.body.className
        .replace(/\b(rtl|ltr|font-arabic)\b/g, '')
        .trim();
      
      const languageClasses = getLanguageClasses(language);
      if (languageClasses) {
        document.body.className += ` ${languageClasses}`;
      }
    }
  }, [language]);

  const setLanguage = (newLanguage: SupportedLanguage) => {
    setLanguageState(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', newLanguage);
    }
  };

  const config = getLanguageConfig(language);
  const contextValue: LanguageContextType = {
    language,
    setLanguage,
    isRTL: isRTL(language),
    direction: getTextDirection(language),
    languageClasses: getLanguageClasses(language),
    config,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook for getting localized text
export function useLocalizedText() {
  const { language } = useLanguage();
  
  return (key: string) => {
    // Import the getLocalizedText function dynamically to avoid circular imports
    const { getLocalizedText } = require('@/lib/utils/language');
    return getLocalizedText(key, language);
  };
}

// Hook for formatting dates in the current language
export function useLocalizedDate() {
  const { language } = useLanguage();
  
  return {
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const { formatDate } = require('@/lib/utils/language');
      return formatDate(date, language, options);
    },
    formatTime: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const { formatTime } = require('@/lib/utils/language');
      return formatTime(date, language, options);
    },
    formatDateTime: (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const { formatDateTime } = require('@/lib/utils/language');
      return formatDateTime(date, language, options);
    },
    formatDuration: (minutes: number) => {
      const { formatDuration } = require('@/lib/utils/language');
      return formatDuration(minutes, language);
    },
    formatRelativeTime: (date: Date | string) => {
      const { formatRelativeTime } = require('@/lib/utils/language');
      return formatRelativeTime(date, language);
    },
    formatNumber: (number: number, useNativeDigits?: boolean) => {
      const { formatNumber } = require('@/lib/utils/language');
      return formatNumber(number, language, useNativeDigits);
    },
  };
}

// Hook for RTL layout utilities
export function useRTLLayout() {
  const { language, isRTL, direction } = useLanguage();
  
  return {
    isRTL,
    direction,
    getFlexDirection: (reverse?: boolean) => {
      const { getFlexDirection } = require('@/lib/utils/language');
      return getFlexDirection(language, reverse);
    },
    getSpaceDirection: () => {
      const { getSpaceDirection } = require('@/lib/utils/language');
      return getSpaceDirection(language);
    },
    getTextAlignment: () => {
      const { getTextAlignment } = require('@/lib/utils/language');
      return getTextAlignment(language);
    },
  };
}

// Hook for Arabic typography utilities
export function useArabicTypography() {
  const { language } = useLanguage();
  
  return {
    getFontFamily: () => {
      const { getFontFamily } = require('@/lib/utils/language');
      return getFontFamily(language);
    },
    getArabicFontWeight: (weight: string) => {
      const { getArabicFontWeight } = require('@/lib/utils/language');
      return getArabicFontWeight(weight);
    },
    getArabicLineHeight: (size: 'sm' | 'base' | 'lg' | 'xl' | '2xl') => {
      const { getArabicLineHeight } = require('@/lib/utils/language');
      return getArabicLineHeight(size);
    },
    getArabicLetterSpacing: () => {
      const { getArabicLetterSpacing } = require('@/lib/utils/language');
      return getArabicLetterSpacing();
    },
  };
}