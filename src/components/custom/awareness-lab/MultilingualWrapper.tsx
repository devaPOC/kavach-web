'use client';

import React from 'react';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import { getRTLLayoutConfig } from '@/lib/utils/rtl-layout';
import { getArabicTypographyStyles, containsArabic, detectTextDirection } from '@/lib/utils/arabic-typography';

interface MultilingualWrapperProps {
  children: React.ReactNode;
  className?: string;
  forceDirection?: 'ltr' | 'rtl';
  adaptToContent?: boolean;
  textContent?: string;
}

/**
 * Wrapper component that automatically handles RTL/LTR layout and typography
 */
export function MultilingualWrapper({
  children,
  className = '',
  forceDirection,
  adaptToContent = false,
  textContent,
}: MultilingualWrapperProps) {
  const { language } = useLanguage();
  const config = getRTLLayoutConfig(language);
  
  // Determine direction
  let direction = forceDirection || config.direction;
  
  if (adaptToContent && textContent) {
    direction = detectTextDirection(textContent);
  }
  
  // Build classes
  const classes = [
    className,
    direction === 'rtl' ? 'rtl' : 'ltr',
    direction === 'rtl' ? 'text-right' : 'text-left',
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes} dir={direction}>
      {children}
    </div>
  );
}

interface MultilingualTextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
  adaptToContent?: boolean;
  useArabicNumerals?: boolean;
}

/**
 * Text component that automatically adapts typography based on language and content
 */
export function MultilingualText({
  children,
  size = 'base',
  weight = 'normal',
  className = '',
  adaptToContent = true,
  useArabicNumerals = false,
}: MultilingualTextProps) {
  const { language } = useLanguage();
  const config = getRTLLayoutConfig(language);
  
  // Convert children to string for analysis
  const textContent = React.Children.toArray(children).join('');
  
  // Determine if we need Arabic typography
  const needsArabicTypography = language === 'ar' || (adaptToContent && containsArabic(textContent));
  
  // Determine direction
  const direction = adaptToContent ? detectTextDirection(textContent) : config.direction;
  
  // Build styles and classes
  let styles: React.CSSProperties = {};
  let classes = className;
  
  if (needsArabicTypography) {
    styles = getArabicTypographyStyles(size, weight);
    classes += ' font-arabic';
  } else {
    // English typography classes
    const sizeClassMap = {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    };
    
    const weightClassMap = {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    };
    
    classes += ` ${sizeClassMap[size]} ${weightClassMap[weight]} leading-normal`;
    styles.direction = direction;
    styles.textAlign = direction === 'rtl' ? 'right' : 'left';
  }
  
  // Format text with Arabic numerals if needed
  let formattedContent = children;
  if (useArabicNumerals && language === 'ar' && typeof textContent === 'string') {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const formattedText = textContent.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
    formattedContent = formattedText;
  }
  
  return (
    <span className={classes.trim()} style={styles} dir={direction}>
      {formattedContent}
    </span>
  );
}

interface MultilingualHeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  className?: string;
  adaptToContent?: boolean;
}

/**
 * Heading component with multilingual support
 */
export function MultilingualHeading({
  level,
  children,
  weight = 'bold',
  className = '',
  adaptToContent = true,
}: MultilingualHeadingProps) {
  const { language } = useLanguage();
  const config = getRTLLayoutConfig(language);
  
  const textContent = React.Children.toArray(children).join('');
  const needsArabicTypography = language === 'ar' || (adaptToContent && containsArabic(textContent));
  const direction = adaptToContent ? detectTextDirection(textContent) : config.direction;
  
  const HeadingTag = `h${level}` as React.ElementType;
  
  let classes = className;
  let styles: React.CSSProperties = {};
  
  if (needsArabicTypography) {
    const headingMap = {
      1: { size: '4xl' as const, lineHeight: 'leading-tight' },
      2: { size: '3xl' as const, lineHeight: 'leading-tight' },
      3: { size: '2xl' as const, lineHeight: 'leading-snug' },
      4: { size: 'xl' as const, lineHeight: 'leading-snug' },
      5: { size: 'lg' as const, lineHeight: 'leading-normal' },
      6: { size: 'base' as const, lineHeight: 'leading-normal' },
    };
    
    const config = headingMap[level];
    styles = getArabicTypographyStyles(config.size, weight);
    classes += ` font-arabic ${config.lineHeight}`;
  } else {
    const headingClasses = {
      1: 'text-4xl font-bold leading-tight',
      2: 'text-3xl font-bold leading-tight',
      3: 'text-2xl font-semibold leading-snug',
      4: 'text-xl font-semibold leading-snug',
      5: 'text-lg font-medium leading-normal',
      6: 'text-base font-medium leading-normal',
    };
    
    classes += ` ${headingClasses[level]}`;
    styles.direction = direction;
    styles.textAlign = direction === 'rtl' ? 'right' : 'left';
  }
  
  return React.createElement(
    HeadingTag,
    {
      className: classes.trim(),
      style: styles,
      dir: direction,
    },
    children
  );
}

interface MultilingualButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

/**
 * Button component with multilingual support and proper icon positioning
 */
export function MultilingualButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  startIcon,
  endIcon,
}: MultilingualButtonProps) {
  const { language } = useLanguage();
  const config = getRTLLayoutConfig(language);
  
  const textContent = React.Children.toArray(children).join('');
  const needsArabicTypography = language === 'ar' || containsArabic(textContent);
  
  // Base button classes
  let classes = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Variant classes
  if (variant === 'primary') {
    classes += ' bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
  } else if (variant === 'secondary') {
    classes += ' bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500';
  } else {
    classes += ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500';
  }
  
  // Size classes
  if (size === 'sm') {
    classes += ' px-3 py-2 text-sm';
  } else if (size === 'lg') {
    classes += ' px-6 py-3 text-lg';
  } else {
    classes += ' px-4 py-2';
  }
  
  // Typography classes
  if (needsArabicTypography) {
    classes += ' font-arabic';
  }
  
  // Icon spacing
  if (startIcon || endIcon) {
    classes += ' space-x-2';
    if (config.isRTL) {
      classes += ' space-x-reverse';
    }
  }
  
  // Disabled state
  if (disabled) {
    classes += ' opacity-50 cursor-not-allowed';
  }
  
  classes += ` ${className}`;
  
  // Arrange icons based on RTL
  const iconStart = config.isRTL ? endIcon : startIcon;
  const iconEnd = config.isRTL ? startIcon : endIcon;
  
  return (
    <button
      className={classes.trim()}
      onClick={onClick}
      disabled={disabled}
      dir={config.direction}
    >
      {iconStart}
      <span>{children}</span>
      {iconEnd}
    </button>
  );
}

interface MultilingualInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  disabled?: boolean;
  className?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Input component with multilingual support
 */
export function MultilingualInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  className = '',
  startIcon,
  endIcon,
  size = 'md',
}: MultilingualInputProps) {
  const { language } = useLanguage();
  const config = getRTLLayoutConfig(language);
  
  // Detect direction from current value or placeholder
  const textContent = value || placeholder || '';
  const direction = detectTextDirection(textContent) || config.direction;
  const needsArabicTypography = language === 'ar' || containsArabic(textContent);
  
  // Base input classes
  let classes = 'w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
  
  // Size classes
  if (size === 'sm') {
    classes += ' px-3 py-2 text-sm';
  } else if (size === 'lg') {
    classes += ' px-4 py-3 text-lg';
  } else {
    classes += ' px-3 py-2';
  }
  
  // Icon padding
  if (startIcon) {
    classes += config.isRTL ? ' pr-10' : ' pl-10';
  }
  if (endIcon) {
    classes += config.isRTL ? ' pl-10' : ' pr-10';
  }
  
  // Typography
  if (needsArabicTypography) {
    classes += ' font-arabic';
  }
  
  // Text alignment
  classes += direction === 'rtl' ? ' text-right' : ' text-left';
  
  // Disabled state
  if (disabled) {
    classes += ' bg-gray-100 cursor-not-allowed';
  }
  
  classes += ` ${className}`;
  
  return (
    <div className="relative">
      {startIcon && (
        <div className={`absolute inset-y-0 ${config.isRTL ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
          {startIcon}
        </div>
      )}
      
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={classes.trim()}
        dir={direction}
      />
      
      {endIcon && (
        <div className={`absolute inset-y-0 ${config.isRTL ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none`}>
          {endIcon}
        </div>
      )}
    </div>
  );
}