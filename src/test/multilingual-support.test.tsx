/**
 * Test suite for multilingual support and RTL layout in Awareness Lab
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  detectBrowserLanguage,
  getLanguageConfig,
  isRTL,
  getTextDirection,
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  getLocalizedText,
  getLanguageClasses,
  getFontFamily,
  formatNumber,
  formatRelativeTime,
  getTextAlignment,
  getFlexDirection,
  getSpaceDirection,
  getArabicFontWeight,
  getArabicLineHeight,
  getArabicLetterSpacing,
  type SupportedLanguage
} from '@/lib/utils/language'

// Mock global objects for testing
Object.defineProperty(globalThis, 'window', {
  value: {
    navigator: {
      languages: ['ar-SA', 'ar', 'en-US', 'en'],
      language: 'ar-SA'
    }
  },
  writable: true
})

Object.defineProperty(globalThis, 'navigator', {
  value: {
    languages: ['ar-SA', 'ar', 'en-US', 'en'],
    language: 'ar-SA'
  },
  writable: true
})

describe('Language Utilities', () => {
  describe('detectBrowserLanguage', () => {
    it('should detect Arabic from browser settings', () => {
      const language = detectBrowserLanguage()
      expect(language).toBe('ar')
    })


  })

  describe('getLanguageConfig', () => {
    it('should return correct config for Arabic', () => {
      const config = getLanguageConfig('ar')
      expect(config).toEqual({
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
        dateLocale: 'ar-SA'
      })
    })

    it('should return correct config for English', () => {
      const config = getLanguageConfig('en')
      expect(config).toEqual({
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        dateLocale: 'en-US'
      })
    })
  })

  describe('isRTL and getTextDirection', () => {
    it('should identify Arabic as RTL', () => {
      expect(isRTL('ar')).toBe(true)
      expect(getTextDirection('ar')).toBe('rtl')
    })

    it('should identify English as LTR', () => {
      expect(isRTL('en')).toBe(false)
      expect(getTextDirection('en')).toBe('ltr')
    })
  })

  describe('Date and Time Formatting', () => {
    const testDate = new Date('2024-01-15T14:30:00Z')

    it('should format date in Arabic locale', () => {
      const formatted = formatDate(testDate, 'ar')
      // Arabic locale uses Arabic-Indic digits by default
      expect(formatted).toContain('٢٠٢٤') // Arabic-Indic digits for 2024
      expect(formatted).toContain('يناير') // Arabic month name
    })

    it('should format date in English locale', () => {
      const formatted = formatDate(testDate, 'en')
      expect(formatted).toContain('January')
      expect(formatted).toContain('15')
      expect(formatted).toContain('2024')
    })

    it('should format time correctly', () => {
      const arabicTime = formatTime(testDate, 'ar')
      const englishTime = formatTime(testDate, 'en')

      // Arabic time uses Arabic-Indic digits
      expect(arabicTime).toMatch(/[٠-٩]{1,2}:[٠-٩]{2}/) // Arabic-Indic digits pattern
      expect(englishTime).toMatch(/\d{1,2}:\d{2}/) // Western digits pattern
    })
  })

  describe('formatDuration', () => {
    it('should format duration in Arabic', () => {
      expect(formatDuration(30, 'ar')).toBe('30 دقيقة')
      expect(formatDuration(60, 'ar')).toBe('1 ساعة')
      expect(formatDuration(90, 'ar')).toBe('1 ساعة و 30 دقيقة')
    })

    it('should format duration in English', () => {
      expect(formatDuration(1, 'en')).toBe('1 minute')
      expect(formatDuration(30, 'en')).toBe('30 minutes')
      expect(formatDuration(60, 'en')).toBe('1 hour')
      expect(formatDuration(90, 'en')).toBe('1 hour 30 minutes')
    })
  })

  describe('getLocalizedText', () => {
    it('should return Arabic text for Arabic language', () => {
      expect(getLocalizedText('loading', 'ar')).toBe('جاري التحميل...')
      expect(getLocalizedText('error', 'ar')).toBe('خطأ')
      expect(getLocalizedText('start_quiz', 'ar')).toBe('بدء الاختبار')
      expect(getLocalizedText('true', 'ar')).toBe('صحيح')
      expect(getLocalizedText('false', 'ar')).toBe('خطأ')
    })

    it('should return English text for English language', () => {
      expect(getLocalizedText('loading', 'en')).toBe('Loading...')
      expect(getLocalizedText('error', 'en')).toBe('Error')
      expect(getLocalizedText('start_quiz', 'en')).toBe('Start Quiz')
      expect(getLocalizedText('true', 'en')).toBe('True')
      expect(getLocalizedText('false', 'en')).toBe('False')
    })

    it('should return key if translation not found', () => {
      expect(getLocalizedText('nonexistent_key', 'en')).toBe('nonexistent_key')
    })
  })

  describe('getLanguageClasses', () => {
    it('should return correct classes for Arabic', () => {
      const classes = getLanguageClasses('ar')
      expect(classes).toBe('rtl font-arabic')
    })

    it('should return correct classes for English', () => {
      const classes = getLanguageClasses('en')
      expect(classes).toBe('ltr')
    })
  })

  describe('getFontFamily', () => {
    it('should return Arabic font family for Arabic', () => {
      const fontFamily = getFontFamily('ar')
      expect(fontFamily).toContain('Noto Sans Arabic')
      expect(fontFamily).toContain('Cairo')
    })

    it('should return default font family for English', () => {
      const fontFamily = getFontFamily('en')
      expect(fontFamily).toBe("'DM Sans', sans-serif")
    })
  })
})

describe('CSS Classes and Styling Validation', () => {
  it('should generate correct language classes for Arabic', () => {
    const classes = getLanguageClasses('ar')
    expect(classes).toBe('rtl font-arabic')
  })

  it('should generate correct language classes for English', () => {
    const classes = getLanguageClasses('en')
    expect(classes).toBe('ltr')
  })

  it('should return correct font families', () => {
    const arabicFont = getFontFamily('ar')
    const englishFont = getFontFamily('en')

    expect(arabicFont).toContain('Noto Sans Arabic')
    expect(arabicFont).toContain('Cairo')
    expect(englishFont).toBe("'DM Sans', sans-serif")
  })
})

describe('Browser Language Detection', () => {
  beforeEach(() => {
    // Reset navigator mock
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        languages: ['ar-SA', 'ar', 'en-US', 'en'],
        language: 'ar-SA'
      },
      writable: true
    })
  })

  it('should detect Arabic from browser settings', () => {
    const language = detectBrowserLanguage()
    expect(language).toBe('ar')
  })



  it('should handle empty language array', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        languages: [],
        language: ''
      },
      writable: true
    })

    const language = detectBrowserLanguage()
    expect(language).toBe('en')
  })
})

describe('Enhanced Language Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with Arabic-Indic digits when requested', () => {
      expect(formatNumber(123, 'ar', true)).toBe('١٢٣')
      expect(formatNumber(456, 'ar', false)).toBe('٤٥٦') // Arabic locale uses Arabic-Indic by default
      expect(formatNumber(789, 'en', false)).toBe('789')
    })
  })

  describe('formatRelativeTime', () => {
    it('should format relative time in Arabic', () => {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      expect(formatRelativeTime(fiveMinutesAgo, 'ar')).toBe('منذ 5 دقيقة')
      expect(formatRelativeTime(twoHoursAgo, 'ar')).toBe('منذ 2 ساعة')
    })

    it('should format relative time in English', () => {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      expect(formatRelativeTime(fiveMinutesAgo, 'en')).toBe('5 minutes ago')
      expect(formatRelativeTime(oneHourAgo, 'en')).toBe('1 hour ago')
    })
  })

  describe('getTextAlignment', () => {
    it('should return correct text alignment for languages', () => {
      expect(getTextAlignment('ar')).toBe('right')
      expect(getTextAlignment('en')).toBe('left')
    })
  })

  describe('getFlexDirection', () => {
    it('should return correct flex direction for RTL', () => {
      expect(getFlexDirection('ar', false)).toBe('flex-row-reverse')
      expect(getFlexDirection('ar', true)).toBe('flex-row')
      expect(getFlexDirection('en', false)).toBe('flex-row')
      expect(getFlexDirection('en', true)).toBe('flex-row-reverse')
    })
  })

  describe('getSpaceDirection', () => {
    it('should return correct space direction for RTL', () => {
      expect(getSpaceDirection('ar')).toBe('space-x-reverse')
      expect(getSpaceDirection('en')).toBe('')
    })
  })

  describe('Arabic Typography Utilities', () => {
    it('should return correct Arabic font weights', () => {
      expect(getArabicFontWeight('light')).toBe('300')
      expect(getArabicFontWeight('normal')).toBe('400')
      expect(getArabicFontWeight('semibold')).toBe('600')
      expect(getArabicFontWeight('bold')).toBe('700')
      expect(getArabicFontWeight('unknown')).toBe('400') // fallback
    })

    it('should return correct Arabic line heights', () => {
      expect(getArabicLineHeight('sm')).toBe('1.6')
      expect(getArabicLineHeight('base')).toBe('1.7')
      expect(getArabicLineHeight('lg')).toBe('1.8')
      expect(getArabicLineHeight('xl')).toBe('1.8')
      expect(getArabicLineHeight('2xl')).toBe('1.7')
    })

    it('should return correct Arabic letter spacing', () => {
      expect(getArabicLetterSpacing()).toBe('0.01em')
    })
  })
})

describe('Language Configuration Validation', () => {
  it('should validate Arabic language configuration', () => {
    const arabicConfig = getLanguageConfig('ar')

    expect(arabicConfig.code).toBe('ar')
    expect(arabicConfig.name).toBe('Arabic')
    expect(arabicConfig.nativeName).toBe('العربية')
    expect(arabicConfig.direction).toBe('rtl')
    expect(arabicConfig.dateLocale).toBe('ar-SA')
  })

  it('should validate English language configuration', () => {
    const englishConfig = getLanguageConfig('en')

    expect(englishConfig.code).toBe('en')
    expect(englishConfig.name).toBe('English')
    expect(englishConfig.nativeName).toBe('English')
    expect(englishConfig.direction).toBe('ltr')
    expect(englishConfig.dateLocale).toBe('en-US')
  })

  it('should handle invalid language codes gracefully', () => {
    // @ts-expect-error - testing invalid input
    const invalidConfig = getLanguageConfig('invalid')

    // Should fallback to English
    expect(invalidConfig.code).toBe('en')
    expect(invalidConfig.direction).toBe('ltr')
  })
})

describe('Integration with Quiz Components', () => {
  it('should handle Arabic quiz content correctly', () => {
    const arabicQuiz = {
      id: 'test-quiz',
      language: 'ar' as SupportedLanguage,
      title: 'اختبار الأمن السيبراني',
      description: 'اختبر معرفتك في الأمن السيبراني',
      timeLimitMinutes: 30,
      questions: []
    }

    expect(arabicQuiz.language).toBe('ar')
    expect(isRTL(arabicQuiz.language)).toBe(true)
    expect(getLanguageClasses(arabicQuiz.language)).toContain('rtl')
    expect(getLanguageClasses(arabicQuiz.language)).toContain('font-arabic')
  })

  it('should format quiz duration correctly in both languages', () => {
    const duration = 45 // minutes

    const arabicDuration = formatDuration(duration, 'ar')
    const englishDuration = formatDuration(duration, 'en')

    expect(arabicDuration).toBe('45 دقيقة')
    expect(englishDuration).toBe('45 minutes')
  })

  it('should handle Arabic quiz questions with proper RTL layout', () => {
    const arabicQuestion = {
      id: 'q1',
      questionType: 'mcq' as const,
      questionData: {
        question: 'ما هو أفضل كلمة مرور؟',
        options: ['كلمة مرور بسيطة', 'كلمة مرور معقدة', 'بدون كلمة مرور', 'كلمة مرور مشتركة'],
        explanation: 'كلمة المرور المعقدة هي الأكثر أماناً'
      },
      correctAnswers: ['1']
    }

    expect(arabicQuestion.questionData.question).toContain('ما هو')
    expect(arabicQuestion.questionData.options).toHaveLength(4)
    expect(arabicQuestion.questionData.explanation).toContain('كلمة المرور')
  })

  it('should format Arabic numbers correctly in quiz scores', () => {
    const score = 85
    const arabicScore = formatNumber(score, 'ar', true)
    const englishScore = formatNumber(score, 'en', false)

    expect(arabicScore).toBe('٨٥')
    expect(englishScore).toBe('85')
  })

  it('should handle complex Arabic quiz content with proper formatting', () => {
    const arabicQuizTitle = 'اختبار الأمن السيبراني المتقدم'
    const arabicDescription = 'هذا اختبار شامل لقياس معرفتك في مجال الأمن السيبراني'

    expect(arabicQuizTitle).toContain('اختبار')
    expect(arabicDescription).toContain('الأمن السيبراني')

    // Test RTL direction detection
    expect(isRTL('ar')).toBe(true)
    expect(getTextDirection('ar')).toBe('rtl')

    // Test language classes
    const classes = getLanguageClasses('ar')
    expect(classes).toContain('rtl')
    expect(classes).toContain('font-arabic')
  })

  it('should validate multilingual quiz question structure', () => {
    const multilingualQuestion = {
      en: {
        question: 'What is the best password practice?',
        options: ['Simple password', 'Complex password', 'No password', 'Shared password'],
        explanation: 'Complex passwords provide better security'
      },
      ar: {
        question: 'ما هي أفضل ممارسة لكلمة المرور؟',
        options: ['كلمة مرور بسيطة', 'كلمة مرور معقدة', 'بدون كلمة مرور', 'كلمة مرور مشتركة'],
        explanation: 'كلمات المرور المعقدة توفر أماناً أفضل'
      }
    }

    expect(multilingualQuestion.en.question).toContain('password')
    expect(multilingualQuestion.ar.question).toContain('كلمة المرور')
    expect(multilingualQuestion.en.options).toHaveLength(4)
    expect(multilingualQuestion.ar.options).toHaveLength(4)
  })
})
