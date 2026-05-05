'use client';

import { SupportedLanguage, isRTL } from './language';

/**
 * Enhanced RTL layout utilities for proper Arabic support
 */

export interface RTLLayoutConfig {
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  textAlign: 'left' | 'right';
  flexDirection: string;
  spaceDirection: string;
  marginDirection: string;
  paddingDirection: string;
}

/**
 * Get comprehensive RTL layout configuration
 */
export function getRTLLayoutConfig(language: SupportedLanguage): RTLLayoutConfig {
  const rtl = isRTL(language);
  
  return {
    isRTL: rtl,
    direction: rtl ? 'rtl' : 'ltr',
    textAlign: rtl ? 'right' : 'left',
    flexDirection: rtl ? 'flex-row-reverse' : 'flex-row',
    spaceDirection: rtl ? 'space-x-reverse' : '',
    marginDirection: rtl ? 'ml' : 'mr',
    paddingDirection: rtl ? 'pl' : 'pr',
  };
}

/**
 * Generate RTL-aware CSS classes
 */
export function getRTLClasses(language: SupportedLanguage, baseClasses: string = ''): string {
  const config = getRTLLayoutConfig(language);
  const classes = [baseClasses];
  
  if (config.isRTL) {
    classes.push('rtl');
    classes.push('text-right');
  } else {
    classes.push('ltr');
    classes.push('text-left');
  }
  
  return classes.filter(Boolean).join(' ');
}

/**
 * Get flex container classes with RTL support
 */
export function getFlexClasses(
  language: SupportedLanguage,
  options: {
    direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
    justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    wrap?: boolean;
    gap?: number | string;
  } = {}
): string {
  const config = getRTLLayoutConfig(language);
  const classes = ['flex'];
  
  // Handle direction
  if (options.direction === 'row' && config.isRTL) {
    classes.push('flex-row-reverse');
  } else if (options.direction) {
    classes.push(`flex-${options.direction}`);
  }
  
  // Handle justify content
  if (options.justify) {
    if (options.justify === 'start' || options.justify === 'end') {
      // Flip start/end for RTL
      const justifyValue = config.isRTL && options.direction === 'row' 
        ? (options.justify === 'start' ? 'end' : 'start')
        : options.justify;
      classes.push(`justify-${justifyValue}`);
    } else {
      classes.push(`justify-${options.justify}`);
    }
  }
  
  // Handle align items
  if (options.align) {
    classes.push(`items-${options.align}`);
  }
  
  // Handle wrap
  if (options.wrap) {
    classes.push('flex-wrap');
  }
  
  // Handle gap
  if (options.gap) {
    if (typeof options.gap === 'number') {
      classes.push(`gap-${options.gap}`);
    } else {
      classes.push(options.gap);
    }
  }
  
  return classes.join(' ');
}

/**
 * Get spacing classes with RTL support
 */
export function getSpacingClasses(
  language: SupportedLanguage,
  spacing: {
    margin?: string | number;
    marginX?: string | number;
    marginY?: string | number;
    marginStart?: string | number;
    marginEnd?: string | number;
    padding?: string | number;
    paddingX?: string | number;
    paddingY?: string | number;
    paddingStart?: string | number;
    paddingEnd?: string | number;
  }
): string {
  const config = getRTLLayoutConfig(language);
  const classes: string[] = [];
  
  // Helper to convert logical properties to physical ones
  const getPhysicalProperty = (logical: 'start' | 'end', type: 'm' | 'p') => {
    if (logical === 'start') {
      return config.isRTL ? `${type}r` : `${type}l`;
    } else {
      return config.isRTL ? `${type}l` : `${type}r`;
    }
  };
  
  // Handle margins
  if (spacing.margin !== undefined) {
    classes.push(`m-${spacing.margin}`);
  }
  if (spacing.marginX !== undefined) {
    classes.push(`mx-${spacing.marginX}`);
  }
  if (spacing.marginY !== undefined) {
    classes.push(`my-${spacing.marginY}`);
  }
  if (spacing.marginStart !== undefined) {
    const property = getPhysicalProperty('start', 'm');
    classes.push(`${property}-${spacing.marginStart}`);
  }
  if (spacing.marginEnd !== undefined) {
    const property = getPhysicalProperty('end', 'm');
    classes.push(`${property}-${spacing.marginEnd}`);
  }
  
  // Handle padding
  if (spacing.padding !== undefined) {
    classes.push(`p-${spacing.padding}`);
  }
  if (spacing.paddingX !== undefined) {
    classes.push(`px-${spacing.paddingX}`);
  }
  if (spacing.paddingY !== undefined) {
    classes.push(`py-${spacing.paddingY}`);
  }
  if (spacing.paddingStart !== undefined) {
    const property = getPhysicalProperty('start', 'p');
    classes.push(`${property}-${spacing.paddingStart}`);
  }
  if (spacing.paddingEnd !== undefined) {
    const property = getPhysicalProperty('end', 'p');
    classes.push(`${property}-${spacing.paddingEnd}`);
  }
  
  return classes.join(' ');
}

/**
 * Get border classes with RTL support
 */
export function getBorderClasses(
  language: SupportedLanguage,
  borders: {
    border?: boolean | string;
    borderStart?: boolean | string;
    borderEnd?: boolean | string;
    borderTop?: boolean | string;
    borderBottom?: boolean | string;
    rounded?: string;
    roundedStart?: string;
    roundedEnd?: string;
  }
): string {
  const config = getRTLLayoutConfig(language);
  const classes: string[] = [];
  
  // Helper to convert logical border properties
  const getPhysicalBorder = (logical: 'start' | 'end') => {
    return logical === 'start' 
      ? (config.isRTL ? 'border-r' : 'border-l')
      : (config.isRTL ? 'border-l' : 'border-r');
  };
  
  // Helper to convert logical rounded properties
  const getPhysicalRounded = (logical: 'start' | 'end') => {
    if (logical === 'start') {
      return config.isRTL ? 'rounded-r' : 'rounded-l';
    } else {
      return config.isRTL ? 'rounded-l' : 'rounded-r';
    }
  };
  
  // Handle borders
  if (borders.border) {
    classes.push(typeof borders.border === 'string' ? borders.border : 'border');
  }
  if (borders.borderStart) {
    const property = getPhysicalBorder('start');
    classes.push(typeof borders.borderStart === 'string' ? borders.borderStart : property);
  }
  if (borders.borderEnd) {
    const property = getPhysicalBorder('end');
    classes.push(typeof borders.borderEnd === 'string' ? borders.borderEnd : property);
  }
  if (borders.borderTop) {
    classes.push(typeof borders.borderTop === 'string' ? borders.borderTop : 'border-t');
  }
  if (borders.borderBottom) {
    classes.push(typeof borders.borderBottom === 'string' ? borders.borderBottom : 'border-b');
  }
  
  // Handle rounded corners
  if (borders.rounded) {
    classes.push(`rounded-${borders.rounded}`);
  }
  if (borders.roundedStart) {
    const property = getPhysicalRounded('start');
    classes.push(`${property}-${borders.roundedStart}`);
  }
  if (borders.roundedEnd) {
    const property = getPhysicalRounded('end');
    classes.push(`${property}-${borders.roundedEnd}`);
  }
  
  return classes.join(' ');
}

/**
 * Get icon positioning classes with RTL support
 */
export function getIconClasses(
  language: SupportedLanguage,
  position: 'start' | 'end',
  size?: 'sm' | 'md' | 'lg'
): string {
  const config = getRTLLayoutConfig(language);
  const classes: string[] = [];
  
  // Size classes
  if (size === 'sm') {
    classes.push('w-4 h-4');
  } else if (size === 'lg') {
    classes.push('w-6 h-6');
  } else {
    classes.push('w-5 h-5');
  }
  
  // Position classes
  if (position === 'start') {
    classes.push(config.isRTL ? 'ml-2' : 'mr-2');
  } else {
    classes.push(config.isRTL ? 'mr-2' : 'ml-2');
  }
  
  return classes.join(' ');
}

/**
 * Get form input classes with RTL support
 */
export function getInputClasses(
  language: SupportedLanguage,
  options: {
    hasStartIcon?: boolean;
    hasEndIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
  } = {}
): string {
  const config = getRTLLayoutConfig(language);
  const classes = ['w-full', 'border', 'rounded-md', 'focus:ring-2', 'focus:ring-blue-500'];
  
  // Base padding
  if (options.size === 'sm') {
    classes.push('px-3 py-2 text-sm');
  } else if (options.size === 'lg') {
    classes.push('px-4 py-3 text-lg');
  } else {
    classes.push('px-3 py-2');
  }
  
  // Icon padding adjustments
  if (options.hasStartIcon) {
    classes.push(config.isRTL ? 'pr-10' : 'pl-10');
  }
  if (options.hasEndIcon) {
    classes.push(config.isRTL ? 'pl-10' : 'pr-10');
  }
  
  // Text direction
  classes.push(config.direction);
  classes.push(`text-${config.textAlign}`);
  
  return classes.join(' ');
}

/**
 * Get button classes with RTL support
 */
export function getButtonClasses(
  language: SupportedLanguage,
  options: {
    hasStartIcon?: boolean;
    hasEndIcon?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
  } = {}
): string {
  const config = getRTLLayoutConfig(language);
  const classes = ['inline-flex', 'items-center', 'justify-center', 'rounded-md', 'font-medium', 'transition-colors'];
  
  // Variant styles
  if (options.variant === 'primary') {
    classes.push('bg-blue-600 text-white hover:bg-blue-700');
  } else if (options.variant === 'secondary') {
    classes.push('bg-gray-600 text-white hover:bg-gray-700');
  } else {
    classes.push('border border-gray-300 bg-white text-gray-700 hover:bg-gray-50');
  }
  
  // Size styles
  if (options.size === 'sm') {
    classes.push('px-3 py-2 text-sm');
  } else if (options.size === 'lg') {
    classes.push('px-6 py-3 text-lg');
  } else {
    classes.push('px-4 py-2');
  }
  
  // Icon spacing
  if (options.hasStartIcon || options.hasEndIcon) {
    classes.push('space-x-2');
    if (config.isRTL) {
      classes.push('space-x-reverse');
    }
  }
  
  return classes.join(' ');
}

/**
 * Get navigation classes with RTL support
 */
export function getNavigationClasses(
  language: SupportedLanguage,
  type: 'horizontal' | 'vertical' = 'horizontal'
): string {
  const config = getRTLLayoutConfig(language);
  const classes = ['flex'];
  
  if (type === 'horizontal') {
    classes.push(config.isRTL ? 'flex-row-reverse' : 'flex-row');
    classes.push('space-x-4');
    if (config.isRTL) {
      classes.push('space-x-reverse');
    }
  } else {
    classes.push('flex-col');
    classes.push('space-y-2');
  }
  
  return classes.join(' ');
}

/**
 * Get card classes with RTL support
 */
export function getCardClasses(
  language: SupportedLanguage,
  options: {
    padding?: 'sm' | 'md' | 'lg';
    shadow?: boolean;
    border?: boolean;
  } = {}
): string {
  const config = getRTLLayoutConfig(language);
  const classes = ['bg-white', 'rounded-lg'];
  
  // Padding
  if (options.padding === 'sm') {
    classes.push('p-4');
  } else if (options.padding === 'lg') {
    classes.push('p-8');
  } else {
    classes.push('p-6');
  }
  
  // Shadow
  if (options.shadow !== false) {
    classes.push('shadow-md');
  }
  
  // Border
  if (options.border) {
    classes.push('border border-gray-200');
  }
  
  // Text direction
  classes.push(config.direction);
  
  return classes.join(' ');
}