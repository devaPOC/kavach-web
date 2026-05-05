import React from 'react';
import { formatCurrency, formatCurrencyIntl } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';

interface CurrencyProps {
  amount: number | string;
  className?: string;
  showSymbol?: boolean;
  useIntlFormat?: boolean;
  locale?: string;
  variant?: 'default' | 'large' | 'small';
}

/**
 * Currency component for displaying OMR amounts consistently
 */
export function Currency({ 
  amount, 
  className, 
  showSymbol = true, 
  useIntlFormat = false,
  locale = 'en-OM',
  variant = 'default'
}: CurrencyProps) {
  const formattedAmount = useIntlFormat 
    ? formatCurrencyIntl(amount, locale)
    : formatCurrency(amount, showSymbol);

  const variantClasses = {
    default: 'text-base',
    large: 'text-lg font-semibold',
    small: 'text-sm'
  };

  return (
    <span className={cn(
      'font-mono tabular-nums',
      variantClasses[variant],
      className
    )}>
      {formattedAmount}
    </span>
  );
}

/**
 * Currency input component for forms
 */
interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function CurrencyInput({ 
  value, 
  onChange, 
  error, 
  className, 
  ...props 
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Remove any non-numeric characters except decimal point
    inputValue = inputValue.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = inputValue.split('.');
    if (parts.length > 2) {
      inputValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 3 decimal places for OMR
    if (parts[1] && parts[1].length > 3) {
      inputValue = parts[0] + '.' + parts[1].substring(0, 3);
    }
    
    onChange(inputValue);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">OMR</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        className={cn(
          'block w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm',
          error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
          className
        )}
        placeholder="0.000"
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}