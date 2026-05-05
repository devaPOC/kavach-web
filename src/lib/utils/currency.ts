/**
 * Currency formatting utilities for INR (Indian Rupee)
 */

export const CURRENCY_CODE = 'INR';
export const CURRENCY_SYMBOL = '₹';

/**
 * Format a number as INR currency
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, showSymbol: boolean = true): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return showSymbol ? `₹0.00` : '0.00';
  }

  // Format with 2 decimal places
  const formatted = numericAmount.toFixed(2);
  
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format currency using Intl.NumberFormat for proper localization
 * @param amount - The amount to format
 * @param locale - The locale to use (default: 'en-IN' for India)
 * @returns Formatted currency string
 */
export function formatCurrencyIntl(amount: number | string, locale: string = 'en-IN'): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return `₹0.00`;
  }

  // Use Intl.NumberFormat for INR
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR'
  }).format(numericAmount);
}

/**
 * Parse a currency string to a number
 * @param currencyString - The currency string to parse (e.g., "₹10.50" or "10.50")
 * @returns The numeric value
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString) return 0;
  
  // Remove currency symbol and extra spaces
  const cleanString = currencyString
    .replace(/₹|INR/gi, '')
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
  const cleaned = value.replace(/₹|INR/gi, '').trim();
  const number = parseFloat(cleaned);
  return !isNaN(number) && number >= 0;
}

/**
 * Convert currency amount to the smallest unit (paise for INR)
 * 1 INR = 100 paise
 * @param inrAmount - Amount in INR
 * @returns Amount in paise
 */
export function inrToPaise(inrAmount: number | string): number {
  const amount = typeof inrAmount === 'string' ? parseFloat(inrAmount) : inrAmount;
  return Math.round(amount * 100);
}

/**
 * Convert from smallest unit (paise) to INR
 * @param paiseAmount - Amount in paise
 * @returns Amount in INR
 */
export function paiseToInr(paiseAmount: number): number {
  return paiseAmount / 100;
}