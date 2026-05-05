'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Input, PasswordInput, Button, Checkbox, Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { ValidationService, authSchemas, validateField, type SignupFormData, type SignupData, UserRole } from '@/lib/validation';
import { useEmailValidation } from '@/lib/hooks/useEmailValidation';
import { type ApiErrorResponse } from '@/lib/errors/response-utils';
import LegalAgreements from './LegalAgreements';
import CustomerLegalAgreements from './CustomerLegalAgreements';
import { type ExpertLegalDocumentType, type CustomerLegalDocumentType } from '@/lib/constants/legal-documents';

interface SignupWizardProps {
  role: 'customer' | 'expert';
  onSubmit: (data: SignupData, legalAgreements?: Record<string, boolean>) => Promise<void>;
  loading?: boolean;
  error?: string | ApiErrorResponse;
  className?: string;
}

const SignupWizard: React.FC<SignupWizardProps> = ({
  role,
  onSubmit,
  loading = false,
  error,
  className = ''
}) => {
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: role === 'customer' ? UserRole.CUSTOMER : UserRole.EXPERT,
    verificationType: 'magic_link' as any // Add the required verificationType field
  });

  // Legal agreements state for experts
  const [expertLegalAgreements, setExpertLegalAgreements] = useState<Record<ExpertLegalDocumentType, boolean>>({
    NDA: false,
    CONTRACTOR_AGREEMENT: false,
    BACKGROUND_CHECK_CONSENT: false,
    DATA_PRIVACY_AGREEMENT: false,
    TERMS_OF_SERVICE: false,
    CODE_OF_CONDUCT: false
  });

  // Legal agreements state for customers
  const [customerLegalAgreements, setCustomerLegalAgreements] = useState<Record<CustomerLegalDocumentType, boolean>>({
    CUSTOMER_SERVICES_AGREEMENT: false,
    CUSTOMER_INFORMED_CONSENT: false,
    CUSTOMER_DATA_PROCESSING_CONSENT: false,
    DISPUTE_RESOLUTION_ARBITRATION: false,
    ACCEPTABLE_USE_POLICY: false
  });

  // Update role when prop changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      role: role === 'customer' ? UserRole.CUSTOMER : UserRole.EXPERT
    }));
  }, [role]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAgreements, setShowAgreements] = useState(true);

  // Real-time email validation
  const emailValidation = useEmailValidation(formData.email, 500);

  const expertDocuments: ExpertLegalDocumentType[] = [
    'NDA',
    'CONTRACTOR_AGREEMENT',
    'BACKGROUND_CHECK_CONSENT',
    'DATA_PRIVACY_AGREEMENT',
    'TERMS_OF_SERVICE',
    'CODE_OF_CONDUCT'
  ];

  const customerDocuments: CustomerLegalDocumentType[] = [
    'CUSTOMER_SERVICES_AGREEMENT',
    'CUSTOMER_INFORMED_CONSENT',
    'CUSTOMER_DATA_PROCESSING_CONSENT',
    'DISPUTE_RESOLUTION_ARBITRATION',
    'ACCEPTABLE_USE_POLICY'
  ];

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

  const validateFieldValue = useCallback((name: keyof SignupFormData, value: string | boolean) => {
    let fieldSchema;

    switch (name) {
      case 'firstName':
        fieldSchema = authSchemas.signupForm.shape.firstName;
        break;
      case 'lastName':
        fieldSchema = authSchemas.signupForm.shape.lastName;
        break;
      case 'email':
        fieldSchema = authSchemas.signupForm.shape.email;
        break;
      case 'password':
        fieldSchema = authSchemas.signupForm.shape.password;
        break;
      case 'confirmPassword':
        fieldSchema = authSchemas.signupForm.shape.confirmPassword;
        break;
      default:
        return null;
    }

    return validateField(fieldSchema, value);
  }, []);

  const validatePasswordMatch = useCallback((password: string, confirmPassword: string) => {
    if (!confirmPassword) return '';
    return password === confirmPassword ? '' : 'Passwords do not match';
  }, []);

  const setAllAgreements = useCallback((checked: boolean) => {
    if (role === 'expert') {
      const updated: Record<ExpertLegalDocumentType, boolean> = {} as any;
      expertDocuments.forEach(doc => {
        updated[doc] = checked;
      });
      setExpertLegalAgreements(updated);
    } else {
      const updated: Record<CustomerLegalDocumentType, boolean> = {} as any;
      customerDocuments.forEach(doc => {
        updated[doc] = checked;
      });
      setCustomerLegalAgreements(updated);
    }
  }, [role, expertDocuments, customerDocuments]);

  const handleFieldChange = useCallback((name: keyof SignupFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Keep confirmPassword mismatch state updated (single error source)
    if ((name === 'password' || name === 'confirmPassword') && typeof value === 'string') {
      const mismatch = validatePasswordMatch(
        name === 'password' ? value : formData.password,
        name === 'confirmPassword' ? value : formData.confirmPassword
      );
      setFieldErrors(prev => ({ ...prev, confirmPassword: mismatch }));
    }

    // Validate field if it has been touched
    if (touched[name] && typeof value === 'string') {
      const error = validateFieldValue(name, value);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [name]: error }));
      }

      if ((name === 'password' || name === 'confirmPassword') && !error) {
        const mismatch = validatePasswordMatch(
          name === 'password' ? value : formData.password,
          name === 'confirmPassword' ? value : formData.confirmPassword
        );
        setFieldErrors(prev => ({ ...prev, confirmPassword: mismatch }));
      }
    }
  }, [fieldErrors, touched, validateFieldValue]);

  const handleFieldBlur = useCallback((name: keyof SignupFormData) => {
    setTouched(prev => ({ ...prev, [name]: true }));

    const value = formData[name];
    if (typeof value === 'string') {
      const error = validateFieldValue(name, value);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [name]: error }));
        return;
      }

      if (name === 'password' || name === 'confirmPassword') {
        const mismatch = validatePasswordMatch(formData.password, formData.confirmPassword);
        setFieldErrors(prev => ({ ...prev, confirmPassword: mismatch }));
      }
    }
  }, [formData, validateFieldValue]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || loading) return;

    setIsSubmitting(true);
    setFieldErrors({}); // Clear previous field errors

    try {
      // Use frontend signup form validation (includes confirmPassword)
      const validationResult = ValidationService.validateSignupForm(formData);

      if (!validationResult.success) {
        setFieldErrors(validationResult.errors);
        setTouched({
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          confirmPassword: true
        });
        return;
      }

      const mismatch = validatePasswordMatch(formData.password, formData.confirmPassword);
      if (mismatch) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: mismatch }));
        setTouched(prev => ({ ...prev, confirmPassword: true, password: true }));
        return;
      }

      // Wait for email validation to complete if still checking
      if (emailValidation.isChecking) {
        // Wait for email validation to complete with timeout
        let attempts = 0;
        const maxAttempts = 10; // 5 seconds max wait

        while (emailValidation.isChecking && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
      }

      // Check email availability (after validation is complete)
      if (emailValidation.isAvailable === false) {
        setFieldErrors(prev => ({ ...prev, email: 'This email is already taken' }));
        setTouched(prev => ({ ...prev, email: true }));
        return;
      }

      // Check for email validation errors
      if (emailValidation.error) {
        setFieldErrors(prev => ({ ...prev, email: emailValidation.error || 'Email validation failed' }));
        setTouched(prev => ({ ...prev, email: true }));
        return;
      }

      const legalAgreements = role === 'expert' ? expertLegalAgreements : customerLegalAgreements;
      const { confirmPassword: _confirm, ...signupData } = validationResult.data!;
      await onSubmit(signupData as SignupData, legalAgreements);

    } catch (err) {
      console.error('Signup form submission error:', err);
      // Error handling is managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, emailValidation, isSubmitting, loading, onSubmit, role]);

  // Merge API field errors with local validation errors
  const allFieldErrors = { ...fieldErrors, ...getFieldErrors(error) };

  const allAgreementsChecked = role === 'expert'
    ? expertDocuments.every(doc => expertLegalAgreements[doc])
    : customerDocuments.every(doc => customerLegalAgreements[doc]);

  // Enhanced form validation with better email validation handling
  const basicFieldsValid =
    !allFieldErrors.firstName &&
    !allFieldErrors.lastName &&
    !allFieldErrors.email &&
    !allFieldErrors.password &&
    !allFieldErrors.confirmPassword &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.password &&
    formData.confirmPassword &&
    validatePasswordMatch(formData.password, formData.confirmPassword) === '';

  const emailValid =
    (emailValidation.isAvailable === true || !formData.email.includes('@')) &&
    !emailValidation.isChecking &&
    !emailValidation.error;

  const legalAgreementsValid = role === 'customer' ? (
    customerLegalAgreements.CUSTOMER_SERVICES_AGREEMENT &&
    customerLegalAgreements.CUSTOMER_INFORMED_CONSENT &&
    customerLegalAgreements.CUSTOMER_DATA_PROCESSING_CONSENT &&
    customerLegalAgreements.DISPUTE_RESOLUTION_ARBITRATION &&
    customerLegalAgreements.ACCEPTABLE_USE_POLICY
  ) : (
    expertLegalAgreements.NDA &&
    expertLegalAgreements.CONTRACTOR_AGREEMENT &&
    expertLegalAgreements.BACKGROUND_CHECK_CONSENT &&
    expertLegalAgreements.DATA_PRIVACY_AGREEMENT &&
    expertLegalAgreements.TERMS_OF_SERVICE &&
    expertLegalAgreements.CODE_OF_CONDUCT
  );

  const isFormValid = basicFieldsValid && emailValid && legalAgreementsValid;

  const errorMessage = getErrorMessage(error);

  // Enhanced loading state management
  const isLoading = loading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleFieldChange('firstName', e.target.value)}
            onBlur={() => handleFieldBlur('firstName')}
            required
            placeholder="First Name"
            className={touched.firstName && allFieldErrors.firstName ? 'border-destructive' : ''}
          />
          {touched.firstName && allFieldErrors.firstName && (
            <p className="text-sm text-destructive">{allFieldErrors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleFieldChange('lastName', e.target.value)}
            onBlur={() => handleFieldBlur('lastName')}
            required
            placeholder="Last Name"
            className={touched.lastName && allFieldErrors.lastName ? 'border-destructive' : ''}
          />
          {touched.lastName && allFieldErrors.lastName && (
            <p className="text-sm text-destructive">{allFieldErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleFieldBlur('email')}
            required
            autoComplete="email"
            placeholder="Email Address"
            className={`${touched.email && allFieldErrors.email ? 'border-destructive' : ''} ${emailValidation.isAvailable === false ? 'border-destructive' : ''
              } ${emailValidation.isAvailable === true ? 'border-secondary/50' : ''}`}
          />
          {emailValidation.isChecking && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-border/80"></div>
            </div>
          )}
        </div>
        {touched.email && allFieldErrors.email && (
          <p className="text-sm text-destructive">{allFieldErrors.email}</p>
        )}
        {emailValidation.isAvailable === false && formData.email.includes('@') && !allFieldErrors.email && (
          <p className="text-sm text-destructive">This email is already taken</p>
        )}
        {emailValidation.isAvailable === true && formData.email.includes('@') && !allFieldErrors.email && (
          <p className="text-sm text-secondary">Email is available</p>
        )}
        {emailValidation.error && (
          <p className="text-sm text-destructive">{emailValidation.error}</p>
        )}
      </div>

      <div className="space-y-2">
        <PasswordInput
          id="password"
          value={formData.password}
          onChange={(e: any) => handleFieldChange('password', e.target.value)}
          onBlur={() => handleFieldBlur('password')}
          required
          autoComplete="new-password"
          placeholder="Password"
          className={touched.password && allFieldErrors.password ? 'border-destructive' : ''}
        />
        {touched.password && allFieldErrors.password && (
          <p className="text-sm text-destructive">{allFieldErrors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <PasswordInput
          id="confirmPassword"
          value={formData.confirmPassword}
          onChange={(e: any) => handleFieldChange('confirmPassword', e.target.value)}
          onBlur={() => handleFieldBlur('confirmPassword')}
          required
          autoComplete="new-password"
          placeholder="Confirm Password"
          className={touched.confirmPassword && allFieldErrors.confirmPassword ? 'border-destructive' : ''}
        />
        {touched.confirmPassword && allFieldErrors.confirmPassword && (
          <p className="text-sm text-destructive">{allFieldErrors.confirmPassword}</p>
        )}
      </div>


      {/* Legal Agreements */}
      <div className="pt-6 border-t-2 border-border space-y-4 text-left">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Legal Agreements</h3>
          <p className="text-sm text-muted-foreground">Please review and accept all agreements to continue.</p>
        </div>

        <div className="flex items-center justify-start space-x-3">
          <Checkbox
            id="accept-all"
            checked={allAgreementsChecked}
            onCheckedChange={(checked) => setAllAgreements(checked === true)}
            className="data-[state=checked]:bg-secondary data-[state=checked]:border-secondary/50"
          />
          <label htmlFor="accept-all" className="text-sm text-foreground cursor-pointer">
            I agree to all Terms and Conditions
          </label>
        </div>

        <Collapsible open={showAgreements} onOpenChange={setShowAgreements} className="space-y-3">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className={`text-lg leading-none transition-transform ${showAgreements ? 'rotate-90' : ''}`}>
              ›
            </span>
            <span>View all agreements</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 flex w-full flex-col items-start justify-start">
            {role === 'expert' ? (
              <LegalAgreements
                agreements={expertLegalAgreements}
                onAgreementChange={setExpertLegalAgreements}
              />
            ) : (
              <CustomerLegalAgreements
                agreements={customerLegalAgreements}
                onAgreementChange={setCustomerLegalAgreements}
              />
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            {isSubmitting ? 'Creating Account...' : 'Please wait...'}
          </div>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  );
};

export default SignupWizard;
