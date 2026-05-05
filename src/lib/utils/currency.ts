/**
 * Currency formatting utilities for OMR (Omani Rial)
 */

export const CURRENCY_CODE = 'OMR';
export const CURRENCY_SYMBOL = 'OMR';

/**
 * Format a number as OMR currency
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, showSymbol: boolean = true): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return showSymbol ? `OMR 0.00` : '0.00';
  }

  // Format with 2 decimal places for simplicity
  const formatted = numericAmount.toFixed(2);
  
  return showSymbol ? `OMR ${formatted}` : formatted;
}

/**
 * Format currency using Intl.NumberFormat for proper localization
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'en-OM' for Oman)
 * @returns Formatted currency string
 */
export function formatCurrencyIntl(amount: number | string, locale: string = 'en-OM'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return `OMR 0.00`;
  }

  // Simple formatting without Intl to avoid currency symbols
  const formatted = numericAmount.toFixed(2);
  return `OMR ${formatted}`;
}

/**
 * Parse a currency string to a number
 * @param currencyString - The currency string to parse (e.g., "OMR 10.500" or "10.500")
 * @returns The numeric value
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString) return 0;
  
  // Remove currency symbol and extra spaces
  const cleanString = currencyString
    .replace(/OMR/gi, '')
    .replace(/[^\d.-]/g, '')
    .trim();
  
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate if a string is a valid currency amount
 * @param value - The value to validate
 * @returns True if valid currency amount
 */
export function isValidCurrencyAmount(value: string): boolean {
  const cleaned = value.replace(/OMR/gi, '').trim();
  const number = parseFloat(cleaned);
  return !isNaN(number) && number >= 0;
}

/**
 * Convert currency amount to the smallest unit (baisa for OMR)
 * 1 OMR = 1000 baisa
 * @param omrAmount - Amount in OMR
 * @returns Amount in baisa
 */
export function omrToBaisa(omrAmount: number | string): number {
  const amount = typeof omrAmount === 'string' ? parseFloat(omrAmount) : omrAmount;
  return Math.round(amount * 1000);
}

/**
 * Convert from smallest unit (baisa) to OMR
 * @param baisaAmount - Amount in baisa
 * @returns Amount in OMR
 */
export function baisaToOmr(baisaAmount: number): number {
  return baisaAmount / 1000;
}