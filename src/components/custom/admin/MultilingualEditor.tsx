'use client'
import React, { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Globe, Type, AlignLeft, AlignRight } from 'lucide-react'

interface MultilingualEditorProps {
  value: string
  onChange: (value: string) => void
  language: 'en' | 'ar'
  placeholder?: string
  disabled?: boolean
  compact?: boolean
  maxLength?: number
}

export default function MultilingualEditor({
  value,
  onChange,
  language,
  placeholder = '',
  disabled = false,
  compact = false,
  maxLength = 5000
}: MultilingualEditorProps) {
  const [textDirection, setTextDirection] = useState<'ltr' | 'rtl'>('ltr')
  const [detectedLanguage, setDetectedLanguage] = useState<'en' | 'ar' | 'mixed'>('en')

  // Detect text direction and language based on content
  useEffect(() => {
    if (!value) {
      setTextDirection(language === 'ar' ? 'rtl' : 'ltr')
      setDetectedLanguage('en')
      return
    }

    // Simple Arabic detection using Unicode ranges
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
    const englishRegex = /[A-Za-z]/
    
    const hasArabic = arabicRegex.test(value)
    const hasEnglish = englishRegex.test(value)
    
    if (hasArabic && hasEnglish) {
      setDetectedLanguage('mixed')
      // For mixed content, use the primary language setting
      setTextDirection(language === 'ar' ? 'rtl' : 'ltr')
    } else if (hasArabic) {
      setDetectedLanguage('ar')
      setTextDirection('rtl')
    } else {
      setDetectedLanguage('en')
      setTextDirection('ltr')
    }
  }, [value, language])

  const handleTextChange = (newValue: string) => {
    // Validate length
    if (maxLength && newValue.length > maxLength) {
      return
    }
    
    onChange(newValue)
  }

  const toggleTextDirection = () => {
    setTextDirection(prev => prev === 'ltr' ? 'rtl' : 'ltr')
  }

  const getLanguageBadgeColor = (lang: string) => {
    switch (lang) {
      case 'ar': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'en': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'mixed': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'ar': return 'Arabic'
      case 'en': return 'English'
      case 'mixed': return 'Mixed'
      default: return 'Unknown'
    }
  }

  const characterCount = value.length
  const isNearLimit = maxLength && characterCount > maxLength * 0.8
  const isAtLimit = maxLength && characterCount >= maxLength

  const commonProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
      handleTextChange(e.target.value),
    placeholder,
    disabled,
    dir: textDirection,
    style: {
      textAlign: textDirection === 'rtl' ? 'right' as const : 'left' as const,
      fontFamily: detectedLanguage === 'ar' ? 
        'system-ui, -apple-system, "Segoe UI", "Noto Sans Arabic", sans-serif' : 
        'system-ui, -apple-system, "Segoe UI", sans-serif'
    },
    className: `resize-none transition-all duration-200 ${
      textDirection === 'rtl' ? 'text-right' : 'text-left'
    } ${detectedLanguage === 'ar' ? 'leading-relaxed' : ''}`
  }

  return (
    <div className="space-y-2">
      {/* Editor Controls */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getLanguageBadgeColor(detectedLanguage)}>
              <Globe className="h-3 w-3 mr-1" />
              {getLanguageLabel(detectedLanguage)}
            </Badge>
            
            <Badge variant="outline" className="text-xs">
              <Type className="h-3 w-3 mr-1" />
              {textDirection.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTextDirection}
              disabled={disabled}
              className="flex items-center gap-1 text-xs"
            >
              {textDirection === 'rtl' ? (
                <AlignRight className="h-3 w-3" />
              ) : (
                <AlignLeft className="h-3 w-3" />
              )}
              {textDirection === 'rtl' ? 'RTL' : 'LTR'}
            </Button>
          </div>
        </div>
      )}

      {/* Text Input */}
      {compact ? (
        <Input {...commonProps} />
      ) : (
        <Textarea 
          {...commonProps}
          rows={4}
          className={`min-h-[100px] ${commonProps.className}`}
        />
      )}

      {/* Character Count and Validation */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {compact && detectedLanguage !== 'en' && (
            <Badge className={getLanguageBadgeColor(detectedLanguage)} variant="outline">
              {getLanguageLabel(detectedLanguage)}
            </Badge>
          )}
          
          {textDirection === 'rtl' && (
            <span className="text-gray-500">Right-to-left text detected</span>
          )}
        </div>
        
        {maxLength && (
          <span className={`${
            isAtLimit ? 'text-red-600' : 
            isNearLimit ? 'text-orange-600' : 
            'text-gray-500'
          }`}>
            {characterCount}/{maxLength}
          </span>
        )}
      </div>

      {/* Validation Messages */}
      {isAtLimit && (
        <div className="text-xs text-red-600">
          Character limit reached
        </div>
      )}
      
      {detectedLanguage === 'mixed' && !compact && (
        <div className="text-xs text-orange-600">
          Mixed language content detected. Ensure proper formatting for both languages.
        </div>
      )}
      
      {language === 'ar' && detectedLanguage === 'en' && !compact && (
        <div className="text-xs text-blue-600">
          Quiz language is set to Arabic, but English text detected. Consider switching text direction if needed.
        </div>
      )}
      
      {language === 'en' && detectedLanguage === 'ar' && !compact && (
        <div className="text-xs text-purple-600">
          Quiz language is set to English, but Arabic text detected. Consider switching text direction if needed.
        </div>
      )}
    </div>
  )
}