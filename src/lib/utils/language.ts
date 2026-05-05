/**
 * Language detection and switching utilities for multilingual support
 */

export type SupportedLanguage = 'en' | 'ar';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateLocale: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    dateLocale: 'en-US',
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    dateLocale: 'ar-SA',
  },
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * Detect user's preferred language from browser settings
 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const browserLanguages = navigator.languages || [navigator.language];
  
  for (const lang of browserLanguages) {
    const langCode = lang.split('-')[0].toLowerCase() as SupportedLanguage;
    if (langCode in SUPPORTED_LANGUAGES) {
      return langCode;
    }
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * Get language configuration
 */
export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  return SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
}

/**
 * Check if a language is RTL
 */
export function isRTL(language: SupportedLanguage): boolean {
  return getLanguageConfig(language).direction === 'rtl';
}

/**
 * Get text direction for a language
 */
export function getTextDirection(language: SupportedLanguage): 'ltr' | 'rtl' {
  return getLanguageConfig(language).direction;
}

/**
 * Format date according to language locale
 */
export function formatDate(
  date: Date | string,
  language: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const config = getLanguageConfig(language);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return dateObj.toLocaleDateString(config.dateLocale, { ...defaultOptions, ...options });
}

/**
 * Format time according to language locale
 */
export function formatTime(
  date: Date | string,
  language: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const config = getLanguageConfig(language);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return dateObj.toLocaleTimeString(config.dateLocale, { ...defaultOptions, ...options });
}

/**
 * Format date and time according to language locale
 */
export function formatDateTime(
  date: Date | string,
  language: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const config = getLanguageConfig(language);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return dateObj.toLocaleDateString(config.dateLocale, { ...defaultOptions, ...options });
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(
  minutes: number,
  language: SupportedLanguage
): string {
  if (language === 'ar') {
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} ساعة`;
      } else {
        return `${hours} ساعة و ${remainingMinutes} دقيقة`;
      }
    }
  } else {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
      }
    }
  }
}

/**
 * Get localized text for common UI elements
 */
export function getLocalizedText(
  key: string,
  language: SupportedLanguage
): string {
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    // Common UI elements
    'loading': {
      en: 'Loading...',
      ar: 'جاري التحميل...',
    },
    'error': {
      en: 'Error',
      ar: 'خطأ',
    },
    'success': {
      en: 'Success',
      ar: 'نجح',
    },
    'cancel': {
      en: 'Cancel',
      ar: 'إلغاء',
    },
    'confirm': {
      en: 'Confirm',
      ar: 'تأكيد',
    },
    'save': {
      en: 'Save',
      ar: 'حفظ',
    },
    'delete': {
      en: 'Delete',
      ar: 'حذف',
    },
    'edit': {
      en: 'Edit',
      ar: 'تعديل',
    },
    'back': {
      en: 'Back',
      ar: 'رجوع',
    },
    'next': {
      en: 'Next',
      ar: 'التالي',
    },
    'previous': {
      en: 'Previous',
      ar: 'السابق',
    },
    'submit': {
      en: 'Submit',
      ar: 'إرسال',
    },
    'retry': {
      en: 'Retry',
      ar: 'إعادة المحاولة',
    },
    
    // Quiz specific
    'quiz': {
      en: 'Quiz',
      ar: 'اختبار',
    },
    'question': {
      en: 'Question',
      ar: 'سؤال',
    },
    'answer': {
      en: 'Answer',
      ar: 'إجابة',
    },
    'score': {
      en: 'Score',
      ar: 'النتيجة',
    },
    'time_remaining': {
      en: 'Time Remaining',
      ar: 'الوقت المتبقي',
    },
    'start_quiz': {
      en: 'Start Quiz',
      ar: 'بدء الاختبار',
    },
    'submit_quiz': {
      en: 'Submit Quiz',
      ar: 'إرسال الاختبار',
    },
    'retake_quiz': {
      en: 'Retake Quiz',
      ar: 'إعادة الاختبار',
    },
    'quiz_completed': {
      en: 'Quiz Completed',
      ar: 'تم إكمال الاختبار',
    },
    'correct_answer': {
      en: 'Correct Answer',
      ar: 'الإجابة الصحيحة',
    },
    'your_answer': {
      en: 'Your Answer',
      ar: 'إجابتك',
    },
    'explanation': {
      en: 'Explanation',
      ar: 'التفسير',
    },
    'true': {
      en: 'True',
      ar: 'صحيح',
    },
    'false': {
      en: 'False',
      ar: 'خطأ',
    },
    'select_all_correct': {
      en: 'Select all correct answers',
      ar: 'اختر جميع الإجابات الصحيحة',
    },
    'answered': {
      en: 'Answered',
      ar: 'تم الإجابة',
    },
    'not_answered': {
      en: 'Not Answered',
      ar: 'لم يتم الإجابة',
    },
    
    // Learning materials
    'learning_module': {
      en: 'Learning Module',
      ar: 'وحدة تعليمية',
    },
    'material': {
      en: 'Material',
      ar: 'مادة',
    },
    'completed': {
      en: 'Completed',
      ar: 'مكتمل',
    },
    'in_progress': {
      en: 'In Progress',
      ar: 'قيد التقدم',
    },
    'not_started': {
      en: 'Not Started',
      ar: 'لم يبدأ',
    },
    
    // Time and dates
    'minutes': {
      en: 'minutes',
      ar: 'دقائق',
    },
    'hours': {
      en: 'hours',
      ar: 'ساعات',
    },
    'days': {
      en: 'days',
      ar: 'أيام',
    },
  };
  
  return translations[key]?.[language] || key;
}

/**
 * Get CSS classes for language-specific styling
 */
export function getLanguageClasses(language: SupportedLanguage): string {
  const config = getLanguageConfig(language);
  const classes = [];
  
  if (config.direction === 'rtl') {
    classes.push('rtl');
  } else {
    classes.push('ltr');
  }
  
  if (language === 'ar') {
    classes.push('font-arabic');
  }
  
  return classes.join(' ');
}

/**
 * Get appropriate font family for language
 */
export function getFontFamily(language: SupportedLanguage): string {
  if (language === 'ar') {
    return "'Noto Sans Arabic', 'Amiri', 'Scheherazade New', 'Cairo', 'Tajawal', sans-serif";
  }
  return "'DM Sans', sans-serif";
}

/**
 * Get font weight mapping for Arabic text
 */
export function getArabicFontWeight(weight: string): string {
  const weightMap: Record<string, string> = {
    'light': '300',
    'normal': '400',
    'medium': '500',
    'semibold': '600',
    'bold': '700'
  };
  return weightMap[weight] || '400';
}

/**
 * Get optimized line height for Arabic text
 */
export function getArabicLineHeight(size: 'sm' | 'base' | 'lg' | 'xl' | '2xl'): string {
  const lineHeightMap: Record<string, string> = {
    'sm': '1.6',
    'base': '1.7',
    'lg': '1.8',
    'xl': '1.8',
    '2xl': '1.7'
  };
  return lineHeightMap[size] || '1.7';
}

/**
 * Get letter spacing for Arabic text (minimal for better readability)
 */
export function getArabicLetterSpacing(): string {
  return '0.01em';
}

/**
 * Format numbers for Arabic locale (using Arabic-Indic digits if needed)
 */
export function formatNumber(
  number: number,
  language: SupportedLanguage,
  useNativeDigits: boolean = false
): string {
  if (language === 'ar' && useNativeDigits) {
    // Convert to Arabic-Indic digits
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return number.toString().replace(/\d/g, (digit) => arabicDigits[parseInt(digit)]);
  }
  
  const config = getLanguageConfig(language);
  return number.toLocaleString(config.dateLocale);
}

/**
 * Get text alignment based on language direction
 */
export function getTextAlignment(language: SupportedLanguage): 'left' | 'right' | 'center' {
  return isRTL(language) ? 'right' : 'left';
}

/**
 * Get flex direction classes for RTL support
 */
export function getFlexDirection(language: SupportedLanguage, reverse: boolean = false): string {
  const isRtl = isRTL(language);
  if (reverse) {
    return isRtl ? 'flex-row' : 'flex-row-reverse';
  }
  return isRtl ? 'flex-row-reverse' : 'flex-row';
}

/**
 * Get space direction classes for RTL support
 */
export function getSpaceDirection(language: SupportedLanguage): string {
  return isRTL(language) ? 'space-x-reverse' : '';
}

/**
 * Enhanced date formatting with more options
 */
export function formatRelativeTime(
  date: Date | string,
  language: SupportedLanguage
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (language === 'ar') {
    if (diffInSeconds < 60) {
      return 'الآن';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `منذ ${minutes} دقيقة`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `منذ ${hours} ساعة`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `منذ ${days} يوم`;
    }
  } else {
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }
}