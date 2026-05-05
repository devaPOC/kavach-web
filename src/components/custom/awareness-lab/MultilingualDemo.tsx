'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Button } from '@/components/ui'
import { 
  Globe, 
  Clock, 
  Calendar,
  Hash,
  Type,
  AlignLeft,
  AlignRight
} from 'lucide-react'
import { 
  useLanguage, 
  useLocalizedText, 
  useLocalizedDate,
  useRTLLayout,
  useArabicTypography
} from '@/lib/contexts/LanguageContext'
import { 
  formatNumber,
  formatRelativeTime,
  getTextAlignment,
  getFlexDirection,
  getSpaceDirection
} from '@/lib/utils/language'
import LanguageSwitcher from '@/components/custom/LanguageSwitcher'

export const MultilingualDemo: React.FC = () => {
  const { language, direction, isRTL, languageClasses } = useLanguage()
  const t = useLocalizedText()
  const { formatDate, formatTime, formatDuration } = useLocalizedDate()
  const { getFlexDirection: getFlexDir, getSpaceDirection: getSpaceDir } = useRTLLayout()
  const { getFontFamily } = useArabicTypography()

  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const sampleScore = 85
  const sampleDuration = 45

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={direction}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CardTitle className={`flex items-center space-x-2 ${languageClasses} ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <Globe className="h-6 w-6 text-blue-600" />
              <span>
                {language === 'ar' ? 'عرض الدعم متعدد اللغات' : 'Multilingual Support Demo'}
              </span>
            </CardTitle>
            <LanguageSwitcher />
          </div>
        </CardHeader>
        <CardContent>
          <p className={`text-gray-600 ${languageClasses}`}>
            {language === 'ar' 
              ? 'هذا العرض يوضح الدعم الكامل للغة العربية مع التخطيط من اليمين إلى اليسار والطباعة المحسنة.'
              : 'This demo showcases comprehensive Arabic language support with RTL layout and enhanced typography.'
            }
          </p>
        </CardContent>
      </Card>

      {/* Language Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center space-x-2 ${languageClasses} ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <Type className="h-5 w-5" />
              <span>{language === 'ar' ? 'معلومات اللغة' : 'Language Information'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>
                {language === 'ar' ? 'اللغة الحالية:' : 'Current Language:'}
              </span>
              <Badge variant="outline">{language.toUpperCase()}</Badge>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>
                {language === 'ar' ? 'الاتجاه:' : 'Direction:'}
              </span>
              <Badge variant={isRTL ? 'default' : 'secondary'}>
                {isRTL ? 'RTL' : 'LTR'}
              </Badge>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>
                {language === 'ar' ? 'الخط:' : 'Font Family:'}
              </span>
              <span className="text-sm font-mono text-gray-800">
                {getFontFamily().split(',')[0].replace(/'/g, '')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center space-x-2 ${languageClasses} ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {isRTL ? <AlignRight className="h-5 w-5" /> : <AlignLeft className="h-5 w-5" />}
              <span>{language === 'ar' ? 'خصائص التخطيط' : 'Layout Properties'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>
                {language === 'ar' ? 'محاذاة النص:' : 'Text Alignment:'}
              </span>
              <Badge variant="outline">{getTextAlignment(language)}</Badge>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>
                {language === 'ar' ? 'اتجاه الفليكس:' : 'Flex Direction:'}
              </span>
              <span className="text-sm font-mono text-gray-800">
                {getFlexDirection(language)}
              </span>
            </div>
            <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className={`text-gray-600 ${languageClasses}`}>
                {language === 'ar' ? 'اتجاه المسافة:' : 'Space Direction:'}
              </span>
              <span className="text-sm font-mono text-gray-800">
                {getSpaceDirection(language) || 'normal'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date and Time Formatting */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 ${languageClasses} ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <Calendar className="h-5 w-5" />
            <span>{language === 'ar' ? 'تنسيق التاريخ والوقت' : 'Date & Time Formatting'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className={`font-medium text-gray-900 ${languageClasses}`}>
                {language === 'ar' ? 'التاريخ الحالي:' : 'Current Date:'}
              </h4>
              <p className={`text-lg ${languageClasses}`}>
                {formatDate(now)}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className={`font-medium text-gray-900 ${languageClasses}`}>
                {language === 'ar' ? 'الوقت الحالي:' : 'Current Time:'}
              </h4>
              <p className={`text-lg ${languageClasses}`}>
                {formatTime(now)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className={`font-medium text-gray-900 ${languageClasses}`}>
              {language === 'ar' ? 'الوقت النسبي:' : 'Relative Time:'}
            </h4>
            <p className={`text-lg ${languageClasses}`}>
              {formatRelativeTime(fiveMinutesAgo, language)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Number Formatting */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 ${languageClasses} ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <Hash className="h-5 w-5" />
            <span>{language === 'ar' ? 'تنسيق الأرقام' : 'Number Formatting'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className={`font-medium text-gray-900 ${languageClasses}`}>
                {language === 'ar' ? 'النتيجة (أرقام محلية):' : 'Score (Native Digits):'}
              </h4>
              <p className={`text-2xl font-bold text-blue-600 ${languageClasses}`}>
                {formatNumber(sampleScore, language, true)}%
              </p>
            </div>
            <div className="space-y-2">
              <h4 className={`font-medium text-gray-900 ${languageClasses}`}>
                {language === 'ar' ? 'النتيجة (أرقام غربية):' : 'Score (Western Digits):'}
              </h4>
              <p className={`text-2xl font-bold text-green-600 ${languageClasses}`}>
                {formatNumber(sampleScore, language, false)}%
              </p>
            </div>
            <div className="space-y-2">
              <h4 className={`font-medium text-gray-900 ${languageClasses}`}>
                {language === 'ar' ? 'المدة:' : 'Duration:'}
              </h4>
              <p className={`text-2xl font-bold text-purple-600 ${languageClasses}`}>
                {formatDuration(sampleDuration)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Sample */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 ${languageClasses} ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <Clock className="h-5 w-5" />
            <span>{language === 'ar' ? 'عينة من الاختبار' : 'Quiz Sample'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`p-4 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <h4 className={`font-semibold text-gray-900 mb-2 ${languageClasses}`}>
              {language === 'ar' 
                ? 'ما هي أفضل ممارسة لإنشاء كلمة مرور آمنة؟'
                : 'What is the best practice for creating a secure password?'
              }
            </h4>
            <div className="space-y-2">
              {(language === 'ar' 
                ? ['استخدام كلمة مرور بسيطة', 'استخدام كلمة مرور معقدة مع رموز خاصة', 'مشاركة كلمة المرور مع الآخرين', 'عدم استخدام كلمة مرور']
                : ['Use a simple password', 'Use a complex password with special characters', 'Share password with others', 'Don\'t use a password']
              ).map((option, index) => (
                <div key={index} className={`flex items-center space-x-2 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className="w-4 h-4 border border-gray-300 rounded"></div>
                  <span className={`${languageClasses}`}>{option}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className={`flex items-center justify-between pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" className={`${languageClasses}`}>
              {t('previous')}
            </Button>
            <Button className={`${languageClasses}`}>
              {t('next')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Common UI Elements */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center space-x-2 ${languageClasses} ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <Type className="h-5 w-5" />
            <span>{language === 'ar' ? 'عناصر واجهة المستخدم الشائعة' : 'Common UI Elements'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              'loading', 'error', 'success', 'cancel',
              'confirm', 'save', 'delete', 'edit',
              'back', 'next', 'submit', 'retry'
            ].map((key) => (
              <Badge key={key} variant="outline" className={`justify-center ${languageClasses}`}>
                {t(key)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MultilingualDemo