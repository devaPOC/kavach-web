'use client';

/**
 * Enhanced Arabic typography utilities for better text rendering
 */

export interface ArabicTypographyConfig {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  wordSpacing: string;
  textRendering: string;
  fontFeatureSettings: string;
}

/**
 * Get optimized typography configuration for Arabic text
 */
export function getArabicTypographyConfig(
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' = 'base',
  weight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' = 'normal'
): ArabicTypographyConfig {
  const fontSizeMap = {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  };

  const fontWeightMap = {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };

  const lineHeightMap = {
    xs: '1.6',
    sm: '1.65',
    base: '1.7',
    lg: '1.75',
    xl: '1.8',
    '2xl': '1.75',
    '3xl': '1.7',
    '4xl': '1.65',
  };

  return {
    fontFamily: "'Noto Sans Arabic', 'Amiri', 'Scheherazade New', 'Cairo', 'Tajawal', 'IBM Plex Sans Arabic', sans-serif",
    fontSize: fontSizeMap[size],
    fontWeight: fontWeightMap[weight],
    lineHeight: lineHeightMap[size],
    letterSpacing: '0.01em',
    wordSpacing: '0.05em',
    textRendering: 'optimizeLegibility',
    fontFeatureSettings: '"kern" 1, "liga" 1, "calt" 1',
  };
}

/**
 * Get CSS classes for Arabic typography
 */
export function getArabicTypographyClasses(
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' = 'base',
  weight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' = 'normal'
): string {
  const classes = ['font-arabic'];
  
  // Font size classes
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
  
  // Font weight classes
  const weightClassMap = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };
  
  // Line height classes for Arabic
  const lineHeightClassMap = {
    xs: 'leading-relaxed',
    sm: 'leading-relaxed',
    base: 'leading-relaxed',
    lg: 'leading-relaxed',
    xl: 'leading-relaxed',
    '2xl': 'leading-relaxed',
    '3xl': 'leading-normal',
    '4xl': 'leading-normal',
  };
  
  classes.push(sizeClassMap[size]);
  classes.push(weightClassMap[weight]);
  classes.push(lineHeightClassMap[size]);
  
  return classes.join(' ');
}

/**
 * Get inline styles for Arabic typography (for dynamic content)
 */
export function getArabicTypographyStyles(
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' = 'base',
  weight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' = 'normal'
): React.CSSProperties {
  const config = getArabicTypographyConfig(size, weight);
  
  return {
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fontWeight: config.fontWeight,
    lineHeight: config.lineHeight,
    letterSpacing: config.letterSpacing,
    wordSpacing: config.wordSpacing,
    textRendering: config.textRendering as any,
    fontFeatureSettings: config.fontFeatureSettings,
    direction: 'rtl',
    textAlign: 'right',
  };
}

/**
 * Get heading classes for Arabic text
 */
export function getArabicHeadingClasses(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  weight: 'normal' | 'medium' | 'semibold' | 'bold' = 'bold'
): string {
  const classes = ['font-arabic'];
  
  const headingMap = {
    1: { size: '4xl', lineHeight: 'leading-tight' },
    2: { size: '3xl', lineHeight: 'leading-tight' },
    3: { size: '2xl', lineHeight: 'leading-snug' },
    4: { size: 'xl', lineHeight: 'leading-snug' },
    5: { size: 'lg', lineHeight: 'leading-normal' },
    6: { size: 'base', lineHeight: 'leading-normal' },
  };
  
  const config = headingMap[level];
  const sizeClass = `text-${config.size}`;
  const weightClass = `font-${weight}`;
  
  classes.push(sizeClass, weightClass, config.lineHeight);
  
  return classes.join(' ');
}

/**
 * Get paragraph classes for Arabic text
 */
export function getArabicParagraphClasses(
  size: 'sm' | 'base' | 'lg' = 'base'
): string {
  const classes = ['font-arabic'];
  
  const paragraphMap = {
    sm: { textSize: 'text-sm', lineHeight: 'leading-relaxed' },
    base: { textSize: 'text-base', lineHeight: 'leading-relaxed' },
    lg: { textSize: 'text-lg', lineHeight: 'leading-relaxed' },
  };
  
  const config = paragraphMap[size];
  classes.push(config.textSize, config.lineHeight, 'font-normal');
  
  return classes.join(' ');
}

/**
 * Get list classes for Arabic text
 */
export function getArabicListClasses(
  type: 'ordered' | 'unordered' = 'unordered'
): string {
  const classes = ['font-arabic', 'leading-relaxed'];
  
  if (type === 'ordered') {
    classes.push('list-decimal', 'list-inside', 'space-y-1');
  } else {
    classes.push('list-disc', 'list-inside', 'space-y-1');
  }
  
  return classes.join(' ');
}

/**
 * Get form label classes for Arabic text
 */
export function getArabicLabelClasses(
  size: 'sm' | 'base' = 'base',
  weight: 'normal' | 'medium' | 'semibold' = 'medium'
): string {
  const classes = ['font-arabic', 'block', 'text-right'];
  
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-base';
  const weightClass = `font-${weight}`;
  
  classes.push(sizeClass, weightClass, 'leading-normal', 'mb-2');
  
  return classes.join(' ');
}

/**
 * Get button text classes for Arabic
 */
export function getArabicButtonClasses(
  size: 'sm' | 'base' | 'lg' = 'base'
): string {
  const classes = ['font-arabic', 'font-medium'];
  
  const sizeMap = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };
  
  classes.push(sizeMap[size], 'leading-none');
  
  return classes.join(' ');
}

/**
 * Get mixed content classes (Arabic + English)
 */
export function getMixedContentClasses(): string {
  return 'font-arabic leading-relaxed';
}

/**
 * Detect if text contains Arabic characters
 */
export function containsArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}

/**
 * Detect text direction based on content
 */
export function detectTextDirection(text: string): 'ltr' | 'rtl' {
  if (containsArabic(text)) {
    return 'rtl';
  }
  return 'ltr';
}

/**
 * Get appropriate classes based on text content
 */
export function getAdaptiveTextClasses(
  text: string,
  size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' = 'base',
  weight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' = 'normal'
): string {
  const direction = detectTextDirection(text);
  
  if (direction === 'rtl') {
    return getArabicTypographyClasses(size, weight) + ' text-right';
  } else {
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
    
    return `${sizeClassMap[size]} ${weightClassMap[weight]} text-left leading-normal`;
  }
}

/**
 * Format text with proper Arabic numerals if needed
 */
export function formatArabicText(text: string, useArabicNumerals: boolean = false): string {
  if (!useArabicNumerals) {
    return text;
  }
  
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return text.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}