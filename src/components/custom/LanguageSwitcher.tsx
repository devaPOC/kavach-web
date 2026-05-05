'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/lib/utils/language';

interface LanguageSwitcherProps {
  variant?: 'button' | 'badge' | 'minimal';
  showLabel?: boolean;
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'button', 
  showLabel = true,
  className = '' 
}: LanguageSwitcherProps) {
  const { language, setLanguage, config } = useLanguage();

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
  };

  const renderTrigger = () => {
    switch (variant) {
      case 'badge':
        return (
          <Badge variant="outline" className={`cursor-pointer hover:bg-gray-100 ${className}`}>
            <Globe className="h-3 w-3 mr-1" />
            {config.code.toUpperCase()}
          </Badge>
        );
      
      case 'minimal':
        return (
          <button className={`flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 ${className}`}>
            <Globe className="h-4 w-4" />
            <span>{config.code.toUpperCase()}</span>
          </button>
        );
      
      default:
        return (
          <Button variant="outline" size="sm" className={className}>
            <Globe className="h-4 w-4 mr-2" />
            {showLabel && (
              <span className="hidden sm:inline">
                {config.nativeName}
              </span>
            )}
            <span className="sm:hidden">
              {config.code.toUpperCase()}
            </span>
          </Button>
        );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {renderTrigger()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`flex items-center justify-between cursor-pointer ${
              lang.direction === 'rtl' ? 'flex-row-reverse' : ''
            }`}
          >
            <div className={`flex items-center space-x-2 ${
              lang.direction === 'rtl' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <span className={lang.code === 'ar' ? 'font-arabic' : ''}>
                {lang.nativeName}
              </span>
              <span className="text-xs text-gray-500">
                ({lang.name})
              </span>
            </div>
            {language === lang.code && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;