import { useCallback } from 'react';
import { formatCurrency, formatCurrencyIntl, parseCurrency, isValidCurrencyAmount } from '@/lib/utils/currency';

/**
 * Custom hook for currency formatting and operations
 */
export function useCurrency() {
  const format = useCallback((amount: number | string, showSymbol: boolean = true) => {
    return formatCurrency(amount, showSymbol);
  }, []);

  const formatIntl = useCallback((amount: number | string, locale: string = 'en-OM') => {
    return formatCurrencyIntl(amount, locale);
  }, []);

  const parse = useCallback((currencyString: string) => {
    return parseCurrency(currencyString);
  }, []);

  const validate = useCallback((value: string) => {
    return isValidCurrencyAmount(value);
  }, []);

  return {
    format,
    formatIntl,
    parse,
    validate,
    currencyCode: 'OMR',
    currencySymbol: 'OMR'
  };
}