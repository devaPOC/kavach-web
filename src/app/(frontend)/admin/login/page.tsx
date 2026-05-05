'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input, PasswordInput, Button, Label, Alert, AlertDescription, Card, CardHeader, CardContent, CardTitle } from '@/components/ui';
import { RateLimitTimer, RateLimitButtonTimer } from '@/components/ui/rate-limit-timer';
import { Loader2 } from 'lucide-react';
import { validateField, loginSchema } from '@/lib/utils/validation';
import { adminApi } from '@/lib/api/client';
import { extractRateLimitFromError, type RateLimitInfo } from '@/lib/utils/rate-limit-utils';
import { type ApiErrorResponse } from '@/lib/errors/response-utils';

export default function AdminLoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | ApiErrorResponse>('');
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({ isRateLimited: false });

  // Extract rate limit information from error
  useEffect(() => {
    if (error) {
      const rateLimitData = extractRateLimitFromError(error);
      setRateLimitInfo(rateLimitData);
    } else {
      setRateLimitInfo({ isRateLimited: false });
    }
  }, [error]);

  // Handle rate limit timer completion
  const handleRateLimitComplete = useCallback(() => {
    setRateLimitInfo({ isRateLimited: false });
  }, []);

  // Enhanced error message parsing
  const getErrorMessage = useCallback((error: string | ApiErrorResponse | undefined): string => {
    if (!error) return '';

    if (typeof error === 'string') {
      // Suppress raw auth/middleware transient messages
      if (/access denied|authentication failed|authentication required/i.test(error)) {
        return 'Unable to authenticate. Please verify credentials and try again.';
      }
      return error;
    }

    if (typeof error === 'object') {
      // Don't show rate limit errors in the main error area since we have a dedicated timer
      if (error.code === 'RATE_LIMIT_EXCEEDED' || error.code === 'TOO_MANY_REQUESTS') {
        return '';
      }

      // Handle unified API error response format
      if ('error' in error && error.error) {
        if (/access denied|authentication failed|authentication required/i.test(error.error)) {
          return 'Unable to authenticate. Please verify credentials and try again.';
        }
        return error.error;
      }

      // Handle legacy error formats
      if ('message' in error && typeof error.message === 'string') {
        if (/access denied|authentication failed|authentication required/i.test(error.message)) {
          return 'Unable to authenticate. Please verify credentials and try again.';
        }
        return error.message;
      }
    }

    return 'An unexpected error occurred';
  }, []);

  // Check if error is account locked
  const isAccountLocked = useCallback((error: string | ApiErrorResponse | undefined): boolean => {
    if (!error) return false;

    if (typeof error === 'object') {
      return error.code === 'ACCOUNT_LOCKED';
    }

    return false;
  }, []);

  const validateFieldValue = (name: keyof typeof formData, value: string) => {
    let fieldSchema;

    switch (name) {
      case 'email':
        fieldSchema = loginSchema.shape.email;
        break;
      case 'password':
        fieldSchema = loginSchema.shape.password;
        break;
      default:
        return null;
    }

    return validateField(fieldSchema, value);
  };

  const handleFieldChange = (name: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear general error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleFieldBlur = (name: keyof typeof formData) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    const fieldError = validateFieldValue(name, formData[name]);
    if (fieldError) {
      setFieldErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't allow submission if rate limited
    if (rateLimitInfo.isRateLimited && (rateLimitInfo.retryAfter || 0) > 0) {
      return;
    }

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate all fields
    const emailError = validateFieldValue('email', formData.email);
    const passwordError = validateFieldValue('password', formData.password);

    const errors: Record<string, string> = {};
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    setFieldErrors(errors);

    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Perform admin login via API client (sets httpOnly cookies in response)
      const result = await adminApi.login({
        email: formData.email,
        password: formData.password
      });

      if (!result.success) {
        // Convert API response to error format for better error handling
        setError({
          success: false,
          error: result.error || 'Authentication failed',
          code: result.errorCode || 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
          requestId: 'unknown',
          details: result
        } as ApiErrorResponse);
        return;
      }

      // Critical change: force a full page navigation so the next request to /admin/dashboard
      // is a fresh GET including the newly set httpOnly cookies. Client-side routing can race
      // before cookies are persisted. A hard navigation avoids the 401/Access Denied flash.
      // Small timeout lets browser commit Set-Cookie headers.
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 50);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = !fieldErrors.email && !fieldErrors.password && formData.email && formData.password;
  const isRateLimited = rateLimitInfo.isRateLimited && (rateLimitInfo.retryAfter || 0) > 0;
  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="text-4xl font-bold tracking-tight text-foreground uppercase">
              Kavach
            </div>
          </div>

          {/* Admin Shield Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-6">
            <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold">
            Admin Access
          </h1>
          <p className="mt-2 text-sm text-foreground">
            Secure administrative portal
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-border">
          {/* Security Notice */}
          <div className="bg-accent/10 border border-accent/50 rounded-md p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-accent mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-accent">
                  Restricted Access
                </h3>
                <div className="mt-1 text-sm text-accent">
                  <p>
                    This is a secure administrative area. All access attempts are logged and monitored.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rate Limit Timer */}
            {rateLimitInfo.isRateLimited && (
              <RateLimitTimer
                rateLimitInfo={rateLimitInfo}
                onComplete={handleRateLimitComplete}
                context="try accessing the admin panel"
                variant="destructive"
                className="mb-4"
              />
            )}

            {/* Regular Error Message (excluding rate limit errors) */}
            {errorMessage && (
              <Alert variant={isAccountLocked(error) ? "destructive" : "destructive"} className={isAccountLocked(error) ? "border-accent/50 bg-accent/10" : ""}>
                <AlertDescription className={isAccountLocked(error) ? "text-accent" : ""}>
                  {isAccountLocked(error) && (
                    <div className="flex items-center space-x-2 mb-2">
                      <svg className="h-4 w-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="font-medium">Admin Account Locked</span>
                    </div>
                  )}
                  {errorMessage}
                  {isAccountLocked(error) && (
                    <div className="mt-2 text-sm">
                      Contact a super administrator to unlock this admin account.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Administrator Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleFieldBlur('email')}
                required
                autoComplete="email"
                placeholder="Enter your admin email"
                disabled={isRateLimited}
                className={`bg-muted/50 ${touched.email && fieldErrors.email ? 'border-destructive' : ''}`}
              />
              {touched.email && fieldErrors.email && (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Administrator Password</Label>
              <PasswordInput
                id="password"
                value={formData.password}
                onChange={(e: any) => handleFieldChange('password', e.target.value)}
                onBlur={() => handleFieldBlur('password')}
                required
                autoComplete="current-password"
                placeholder="Enter your admin password"
                disabled={isRateLimited}
                className={`bg-muted/50 ${touched.password && fieldErrors.password ? 'border-destructive' : ''}`}
              />
              {touched.password && fieldErrors.password && (
                <p className="text-sm text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit Button with Timer */}
            <RateLimitButtonTimer
              rateLimitInfo={rateLimitInfo}
              onComplete={handleRateLimitComplete}
              defaultText="Access Admin Panel"
              waitingText="Try again in"
            >
              <Button
                type="submit"
                className="w-full bg-destructive hover:bg-destructive focus:ring-destructive"
                disabled={!isFormValid || loading || isRateLimited}
              >
                {loading && !isRateLimited ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Access Admin Panel'
                )}
              </Button>
            </RateLimitButtonTimer>
          </form>
        </div>
      </div>

      {/* Back to Main Site */}
      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-muted-foreground/80 hover:text-muted-foreground/80 focus:outline-none focus:underline transition-colors"
        >
          ← Back to Main Site
        </button>
      </div>
    </div>
  );
}
