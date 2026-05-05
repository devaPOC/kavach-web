'use client';

import React, { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  errorMessage?: string;
  helperText?: string;
  showCharCount?: boolean;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  validationRules?: {
    maxLength?: number;
    minLength?: number;
    required?: boolean;
    pattern?: RegExp;
    customValidator?: (value: string) => string | null;
  };
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({
    label,
    required = false,
    maxLength,
    minLength,
    errorMessage,
    helperText,
    showCharCount = true,
    onValidationChange,
    validationRules,
    className,
    value: controlledValue,
    onChange,
    ...props
  }, ref) => {
    const [value, setValue] = useState<string>(controlledValue?.toString() || '');
    const [error, setError] = useState<string>('');
    const [touched, setTouched] = useState(false);

    // Use validation rules or props
    const rules = validationRules || {
      maxLength,
      minLength,
      required
    };

    // Update local value when controlled value changes
    useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue.toString());
      }
    }, [controlledValue]);

    const validateValue = (val: string): string => {
      // Required validation
      if (rules.required && (!val || val.trim() === '')) {
        return 'This field is required';
      }

      // Min length validation
      if (rules.minLength && val.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters long`;
      }

      // Max length validation
      if (rules.maxLength && val.length > rules.maxLength) {
        return `Must be less than ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(val)) {
        return 'Invalid format';
      }

      // Custom validation
      if (rules.customValidator) {
        const customError = rules.customValidator(val);
        if (customError) {
          return customError;
        }
      }

      return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);

      // Call parent onChange if provided
      if (onChange) {
        onChange(e);
      }

      // Validate the new value
      const validationError = validateValue(newValue);
      setError(validationError);

      // Notify parent of validation status
      if (onValidationChange) {
        onValidationChange(validationError === '', validationError || undefined);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setTouched(true);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    // Calculate character count and status
    const charCount = value.length;
    const maxChars = rules.maxLength || maxLength;
    const isOverLimit = maxChars ? charCount > maxChars : false;
    const isNearLimit = maxChars ? charCount > maxChars * 0.8 : false;

    // Determine if we should show error
    const showError = (touched || errorMessage) && (error || errorMessage);
    const displayError = errorMessage || error;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id} className="text-sm font-medium text-foreground/80">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}

        <div className="relative">
          <Textarea
            ref={ref}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn(
              'transition-all duration-200',
              showError && 'border-destructive focus:ring-destructive',
              isOverLimit && 'border-destructive focus:ring-destructive',
              className
            )}
            {...props}
            maxLength={maxChars} // HTML maxlength as fallback
          />

          {showCharCount && maxChars && (
            <div
              className={cn(
                'absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-card/80 backdrop-blur-sm border',
                isOverLimit && 'text-destructive border-destructive bg-destructive/10/80',
                isNearLimit && !isOverLimit && 'text-accent border-accent/50 bg-accent/10/80',
                !isNearLimit && 'text-muted-foreground border-border'
              )}
            >
              {charCount}/{maxChars}
            </div>
          )}
        </div>

        {/* Helper text or error message */}
        {(helperText || showError) && (
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {showError ? (
                <p className="text-sm text-destructive">{displayError}</p>
              ) : helperText ? (
                <p className="text-sm text-muted-foreground">{helperText}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';

// Export specific validation rule presets for common use cases
export const TextareaValidationPresets = {
  shortDescription: {
    maxLength: 500,
    minLength: 10,
    required: true
  },
  longDescription: {
    maxLength: 5000,
    minLength: 20,
    required: true
  },
  additionalContext: {
    maxLength: 2000,
    required: false
  },
  emailContent: {
    maxLength: 10000,
    minLength: 10,
    required: true
  },
  url: {
    maxLength: 2048,
    minLength: 1,
    required: true,
    customValidator: (value: string) => {
      // Allow any text input for URL analysis, not just valid URLs
      // as users might input malformed/suspicious URLs
      if (value.length < 3) {
        return 'Please enter a URL or link to analyze';
      }
      return null;
    }
  },
  incidentDetails: {
    maxLength: 5000,
    minLength: 50,
    required: true
  }
} as const;
