'use client';

import { useState, useCallback } from 'react';

/**
 * Check if text contains HTML tags (for XSS prevention)
 */
export const containsHtmlTags = (text: string): boolean => {
	return /<[^>]*>/g.test(text);
};

/**
 * Default error message for HTML tag validation
 */
export const HTML_ERROR_MESSAGE = 'HTML tags are not allowed. Please use plain text only.';

/**
 * Field errors type - generic interface for tracking validation errors
 */
export interface FieldErrors {
	[key: string]: string | undefined;
}

/**
 * Hook for form validation with XSS prevention
 *
 * @example
 * const { fieldErrors, validateField, validateAllFields, hasErrors, clearFieldError } = useFormValidation();
 *
 * // Validate on change
 * const handleChange = (value: string) => {
 *   setValue(value);
 *   validateField('fieldName', value);
 * };
 *
 * // Get error styling
 * className={fieldErrors.fieldName ? 'border-red-500' : ''}
 */
export function useFormValidation() {
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

	/**
	 * Validate a single field for HTML tags
	 * Returns true if valid, false if invalid
	 */
	const validateField = useCallback((fieldName: string, value: string): boolean => {
		if (containsHtmlTags(value)) {
			setFieldErrors(prev => ({ ...prev, [fieldName]: HTML_ERROR_MESSAGE }));
			return false;
		} else {
			setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
			return true;
		}
	}, []);

	/**
	 * Validate multiple fields at once
	 * Returns true if all fields are valid
	 */
	const validateAllFields = useCallback((fields: Record<string, string>): boolean => {
		const errors: FieldErrors = {};
		let isValid = true;

		Object.entries(fields).forEach(([fieldName, value]) => {
			if (value && containsHtmlTags(value)) {
				errors[fieldName] = HTML_ERROR_MESSAGE;
				isValid = false;
			}
		});

		setFieldErrors(prev => ({ ...prev, ...errors }));
		return isValid;
	}, []);

	/**
	 * Clear error for a specific field
	 */
	const clearFieldError = useCallback((fieldName: string) => {
		setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }));
	}, []);

	/**
	 * Clear all field errors
	 */
	const clearAllErrors = useCallback(() => {
		setFieldErrors({});
	}, []);

	/**
	 * Check if there are any field errors
	 */
	const hasErrors = useCallback((): boolean => {
		return Object.values(fieldErrors).some(error => error !== undefined);
	}, [fieldErrors]);

	/**
	 * Get input className with error styling
	 */
	const getInputClassName = useCallback((fieldName: string, baseClassName: string = ''): string => {
		const hasError = fieldErrors[fieldName];
		const errorClasses = 'border-red-500 focus:border-red-500 focus:ring-red-500/20';
		return hasError ? `${baseClassName} ${errorClasses}` : baseClassName;
	}, [fieldErrors]);

	return {
		fieldErrors,
		validateField,
		validateAllFields,
		clearFieldError,
		clearAllErrors,
		hasErrors,
		getInputClassName,
	};
}

/**
 * Input wrapper component props for validated inputs
 */
export interface ValidatedInputProps {
	error?: string;
	className?: string;
}

/**
 * Get error styling classes for an input
 */
export function getErrorInputClasses(hasError: boolean): string {
	return hasError
		? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
		: '';
}
