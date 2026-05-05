'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api/client';

interface EmailValidationResult {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
}

export function useEmailValidation(email: string, debounceMs: number = 500) {
  const [validationState, setValidationState] = useState<EmailValidationResult>({
    isChecking: false,
    isAvailable: null,
    error: null,
  });

  const checkEmailAvailability = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@')) {
      setValidationState(prev => ({ ...prev, isChecking: false, isAvailable: null, error: null }));
      return;
    }

    setValidationState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Use the unified API client for consistent error handling and automatic token refresh
      const response = await fetch('/api/v1/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email: emailToCheck }),
      });

      const result = await response.json();

      if (result.success) {
        setValidationState({
          isChecking: false,
          isAvailable: result.data?.available ?? null,
          error: null,
        });
      } else {
        // Enhanced error handling with better user messages
        let errorMessage = 'Failed to check email availability';
        
        if (result.error) {
          errorMessage = result.error;
        } else if (result.message) {
          errorMessage = result.message;
        }
        
        // Handle specific error codes
        if (result.code === 'RATE_LIMIT_EXCEEDED') {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (result.code === 'INVALID_INPUT') {
          errorMessage = 'Please enter a valid email address';
        }
        
        setValidationState({
          isChecking: false,
          isAvailable: null,
          error: errorMessage,
        });
      }
    } catch (error) {
      console.error('Email validation network error:', error);
      setValidationState({
        isChecking: false,
        isAvailable: null,
        error: 'Network error while checking email. Please check your connection.',
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkEmailAvailability(email);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [email, debounceMs, checkEmailAvailability]);

  return validationState;
}
