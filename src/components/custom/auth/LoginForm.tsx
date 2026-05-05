'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input, PasswordInput, Button } from '@/components/ui';
import { Label } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { ValidationService, authSchemas, validateField, type LoginFormData, UserRole } from '@/lib/validation';
import { type ApiErrorResponse } from '@/lib/errors/response-utils';
import Link from 'next/link';

interface LoginFormProps {
  role: 'customer' | 'expert';
  onSubmit: (data: LoginFormData) => Promise<void>;
  loading?: boolean;
  error?: string | ApiErrorResponse;
  className?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  role,
  onSubmit,
  loading = false,
  error,
  className = ''
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    role: role === 'customer' ? UserRole.CUSTOMER : UserRole.EXPERT
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep internal role in sync if parent changes active tab and clear form
  useEffect(() => {
    setFormData({
      email: '',
      password: '',
      role: role === 'customer' ? UserRole.CUSTOMER : UserRole.EXPERT
    });
    // Clear field errors and touched state when switching tabs
    setFieldErrors({});
    setTouched({});
    // Reset submitting state when switching tabs
    setIsSubmitting(false);
  }, [role]);

  // Enhanced error parsing with better handling of API responses
  const getErrorMessage = useCallback((error: string | ApiErrorResponse | undefined): string => {
    if (!error) return '';

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object') {
      // Handle unified API error response format
      if ('error' in error && error.error) {
        return error.error;
      }

      // Handle legacy error formats
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }

      // Handle validation errors as general message
      if ('details' in error && error.details?.validationErrors) {
        return 'Please correct the highlighted fields';
      }
    }

    return 'An unexpected error occurred';
  }, []);

  // Check if error is account locked
  const isAccountLocked = useCallback((error: string | ApiErrorResponse | undefined): boolean => {
    if (!error) return false;

    if (typeof error === 'object') {
      return Boolean(error.code === 'ACCOUNT_LOCKED') ||
        Boolean(error.details && error.details.isAccountLocked);
    }

    return false;
  }, []);

  // Enhanced field error parsing with better API response handling
  const getFieldErrors = useCallback((error: string | ApiErrorResponse | undefined): Record<string, string> => {
    if (!error || typeof error === 'string') {
      return {};
    }

    if (typeof error === 'object' && 'details' in error) {
      const fieldErrors: Record<string, string> = {};

      // Handle validation errors array
      if (error.details?.validationErrors && Array.isArray(error.details.validationErrors)) {
        error.details.validationErrors.forEach((validationError: { field: string; message: string }) => {
          fieldErrors[validationError.field] = validationError.message;
        });
      }

      // Handle direct field errors object
      if (error.details?.fieldErrors && typeof error.details.fieldErrors === 'object') {
        Object.assign(fieldErrors, error.details.fieldErrors);
      }

      return fieldErrors;
    }

    return {};
  }, []);

  const validateFieldValue = useCallback((name: keyof LoginFormData, value: string) => {
    let fieldSchema;

    switch (name) {
      case 'email':
        fieldSchema = authSchemas.loginForm.shape.email;
        break;
      case 'password':
        fieldSchema = authSchemas.loginForm.shape.password;
        break;
      default:
        return null;
    }

    return validateField(fieldSchema, value);
  }, []);

  const handleFieldChange = useCallback((name: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    setFieldErrors(prev => {
      if (prev[name]) {
        return { ...prev, [name]: '' };
      }
      return prev;
    });
  }, []);

  const handleFieldBlur = useCallback((name: keyof LoginFormData) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateFieldValue(name, formData[name] as string);
    if (error) {
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [formData, validateFieldValue]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    if (isSubmitting || loading) return;

    setIsSubmitting(true);
    setFieldErrors({}); // Clear previous field errors

    try {
      // Mark all fields as touched
      setTouched({ email: true, password: true });

      // Use unified validation service
      const validationResult = ValidationService.validateLoginForm(formData);

      if (!validationResult.success) {
        setFieldErrors(validationResult.errors);
        return;
      }

      console.log('Submitting login form', { role, email: formData.email });
      await onSubmit(validationResult.data!);

    } catch (err) {
      console.error('[LoginForm.handleSubmit] Error during login', err);
      // Don't re-throw the error to prevent unhandled promise rejections
      // The parent component should handle errors through the error prop
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, loading, onSubmit, role]);

  // Merge API field errors with local validation errors
  const allFieldErrors = { ...fieldErrors, ...getFieldErrors(error) };

  // Enhanced form validation
  const isFormValid =
    !allFieldErrors.email &&
    !allFieldErrors.password &&
    formData.email.trim() &&
    formData.password;

  const errorMessage = getErrorMessage(error);
  const accountLocked = isAccountLocked(error);

  // Enhanced loading state management
  const isLoading = loading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {errorMessage && (
        <Alert variant={accountLocked ? "destructive" : "destructive"} className={accountLocked ? "border-orange-500 bg-orange-50 dark:bg-orange-950" : ""}>
          <AlertDescription className={accountLocked ? "text-orange-700 dark:text-orange-300" : ""}>
            {accountLocked && (
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="font-medium">Account Locked</span>
              </div>
            )}
            <div className={accountLocked ? "mt-2" : ""}>
              {errorMessage}
            </div>
            {accountLocked && (
              <div className="mt-2 text-sm">
                Contact your administrator to unlock your account.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          onBlur={() => handleFieldBlur('email')}
          required
          autoComplete="email"
          placeholder="Enter your email address"
          className={touched.email && allFieldErrors.email ? 'border-red-500' : ''}
        />
        {touched.email && allFieldErrors.email && (
          <p className="text-sm text-red-500">{allFieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <PasswordInput
          id="password"
          value={formData.password}
          onChange={(e: any) => handleFieldChange('password', e.target.value)}
          onBlur={() => handleFieldBlur('password')}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          className={touched.password && allFieldErrors.password ? 'border-red-500' : ''}
        />
        {touched.password && allFieldErrors.password && (
          <p className="text-sm text-red-500">{allFieldErrors.password}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || isLoading}
        onClick={(e) => {
          // Additional safety check to prevent double submission
          if (isSubmitting || loading || !isFormValid) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            {isSubmitting ? 'Signing In...' : 'Please wait...'}
          </div>
        ) : (
          'Sign In'
        )}
      </Button>
      <div className="flex justify-start">
        <Link
          style={{ color: "blue", padding: 0, margin: 0 }}
          className="text-sm px-0"
          href="/forgot-password"
        >
          Having trouble?
        </Link>
      </div>
    </form >
  );
};

export default LoginForm;
