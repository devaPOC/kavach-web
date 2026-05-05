'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ValidationService } from '@/lib/validation/service';
import { validateField } from '@/lib/validation/utils';
import { fieldSchemas, type CustomerProfileData } from '@/lib/validation/schemas';
import type { ValidationResult } from '@/lib/validation/types';
import { countries, nationalities, governorates, getWilayatOptions } from '@/lib/data/locations';

interface CustomerProfileWizardProps {
  onComplete: () => void;
}

interface LoadingState {
  isSubmitting: boolean;
  isValidating: boolean;
  currentOperation?: string;
}

export function CustomerProfileWizard({ onComplete }: CustomerProfileWizardProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isSubmitting: false,
    isValidating: false
  });
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomerProfileData>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => new Set(prev).add(field));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Clear general error when user starts typing
    if (error) {
      setError(null);
    }

    // Validate field immediately using unified validation
    validateSingleField(field, value);
  };

  const validateSingleField = (field: string, value: any) => {
    // Map form fields to validation schema fields
    const fieldSchemaMap: Record<string, keyof typeof fieldSchemas> = {
      phoneNumber: 'requiredPhoneNumber',
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
      nationality: 'nationality',
      countryOfResidence: 'country',
      governorate: 'governorate',
      wilayat: 'wilayat'
    };

    const schemaField = fieldSchemaMap[field];
    if (schemaField) {
      const errorMessage = validateField(fieldSchemas[schemaField], value);
      if (errorMessage) {
        setValidationErrors(prev => ({
          ...prev,
          [field]: errorMessage
        }));
      }
    }
  };

  const handleSubmit = async () => {
    setLoadingState(prev => ({ ...prev, isSubmitting: true, currentOperation: 'Validating profile data...' }));
    setError(null);

    try {
      // Validate the entire form using unified validation
      const validationResult: ValidationResult<CustomerProfileData> = ValidationService.validateCustomerProfile(formData);
      
      if (!validationResult.success) {
        setValidationErrors(validationResult.errors);
        setError('Please fix the validation errors before proceeding.');
        return;
      }

      setLoadingState(prev => ({ ...prev, currentOperation: 'Creating your profile...' }));

      // Submit the validated data
      const response = await apiClient.profile.createCustomerProfile(validationResult.data);

      if (response.success) {
        setLoadingState(prev => ({ ...prev, currentOperation: 'Profile created successfully!' }));
        // Small delay to show success message
        setTimeout(() => {
          onComplete();
        }, 1000);
      } else {
        // Handle different types of API errors
        if (response.errorCode === 'VALIDATION_ERROR') {
          // Handle validation errors from backend
          const errorResponse = response as any;
          if (errorResponse.details?.validationErrors) {
            const backendErrors: Record<string, string> = {};
            errorResponse.details.validationErrors.forEach((error: { field: string; message: string }) => {
              backendErrors[error.field] = error.message;
            });
            setValidationErrors(backendErrors);
            setError('Please fix the validation errors and try again.');
          } else {
            setError('Validation failed. Please check your input and try again.');
          }
        } else if (response.errorCode === 'RATE_LIMIT_EXCEEDED') {
          const errorResponse = response as any;
          setError(`Too many requests. Please try again in ${errorResponse.retryAfter || 60} seconds.`);
        } else {
          setError(response.error || 'Failed to create profile. Please try again.');
        }
      }
    } catch (err) {
      console.error('Profile creation error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoadingState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        currentOperation: undefined 
      }));
    }
  };

  const handleNext = () => {
    setShowReview(true);
  };

  const handleBack = () => {
    setShowReview(false);
  };

  const renderPersonalInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phoneNumber">Phone Number *</Label>
          <PhoneInput
            id="phoneNumber"
            value={formData.phoneNumber || ''}
            onChange={(value) => updateFormData('phoneNumber', value)}
            placeholder="Enter phone number"
            className={validationErrors.phoneNumber ? 'border-red-500' : ''}
            disabled={loadingState.isSubmitting}
            defaultCountry="OM"
            required
          />
          {validationErrors.phoneNumber && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.phoneNumber}</p>
          )}
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth || ''}
            onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
            className={validationErrors.dateOfBirth ? 'border-red-500' : ''}
            disabled={loadingState.isSubmitting}
            required
          />
          {validationErrors.dateOfBirth && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.dateOfBirth}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gender">Gender *</Label>
          <Select 
            value={formData.gender || ''} 
            onValueChange={(value) => updateFormData('gender', value)}
            disabled={loadingState.isSubmitting}
            required
          >
            <SelectTrigger className={validationErrors.gender ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.gender && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.gender}</p>
          )}
        </div>
        <div>
          <Label htmlFor="nationality">Nationality *</Label>
          <Select 
            value={formData.nationality || ''} 
            onValueChange={(value) => updateFormData('nationality', value)}
            disabled={loadingState.isSubmitting}
            required
          >
            <SelectTrigger className={validationErrors.nationality ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select nationality" />
            </SelectTrigger>
            <SelectContent>
              {nationalities.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.nationality && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.nationality}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="countryOfResidence">Country of Residence *</Label>
          <Select
            value={formData.countryOfResidence || ''}
            onValueChange={(value) => {
              updateFormData('countryOfResidence', value);
              // If changing from Oman to another country, clear governorate and wilayat
              if (value !== 'om') {
                if (formData.governorate) updateFormData('governorate', '');
                if (formData.wilayat) updateFormData('wilayat', '');
              }
            }}
            disabled={loadingState.isSubmitting}
          >
            <SelectTrigger className={validationErrors.countryOfResidence ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.countryOfResidence && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.countryOfResidence}</p>
          )}
        </div>

        {formData.countryOfResidence === 'om' && (
          <div>
            <Label htmlFor="governorate">Governorate *</Label>
            <Select
              value={formData.governorate || ''}
              onValueChange={(value) => {
                updateFormData('governorate', value);
                // Clear wilayat when changing governorate
                if (formData.wilayat) updateFormData('wilayat', '');
              }}
              disabled={loadingState.isSubmitting}
            >
              <SelectTrigger className={validationErrors.governorate ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select governorate" />
              </SelectTrigger>
              <SelectContent>
                {governorates.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.governorate && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.governorate}</p>
            )}
          </div>
        )}
      </div>

      {formData.countryOfResidence === 'om' && formData.governorate && (
        <div>
          <Label htmlFor="wilayat">Wilayat *</Label>
          <Select
            value={formData.wilayat || ''}
            onValueChange={(value) => updateFormData('wilayat', value)}
            disabled={loadingState.isSubmitting}
          >
            <SelectTrigger className={validationErrors.wilayat ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select wilayat" />
            </SelectTrigger>
            <SelectContent>
              {getWilayatOptions(formData.governorate).map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validationErrors.wilayat && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.wilayat}</p>
          )}
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-2">Personal Information</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Phone: {formData.phoneNumber || 'Not provided'}</p>
          <p>Date of Birth: {formData.dateOfBirth || 'Not provided'}</p>
          <p>Gender: {formData.gender || 'Not provided'}</p>
          <p>Nationality: {formData.nationality || 'Not provided'}</p>
          <p>Location: {[formData.governorate, formData.wilayat, formData.countryOfResidence].filter(Boolean).join(', ') || 'Not provided'}</p>
        </div>
      </div>

      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Your profile will be created and approved automatically. You can start using the platform immediately after submission.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Customer Profile</CardTitle>
          <CardDescription>
            Please provide your contact information and basic details to get started on our platform. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${!showReview ? 'bg-primary text-primary-foreground' : 'bg-green-500 text-white'
                }`}>
                <User className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm ${!showReview ? 'font-medium' : 'text-muted-foreground'}`}>
                Personal Info
              </span>
              <div className={`w-8 h-px mx-4 ${showReview ? 'bg-green-500' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${showReview ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm ${showReview ? 'font-medium' : 'text-muted-foreground'}`}>
                Review
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="mb-8">
            {showReview ? renderReview() : renderPersonalInfo()}
          </div>

          {/* Loading Progress */}
          {loadingState.currentOperation && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800">{loadingState.currentOperation}</span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <div>
              {showReview && (
                <Button 
                  variant="outline" 
                  onClick={handleBack} 
                  disabled={loadingState.isSubmitting}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="space-x-2">
              {showReview ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={loadingState.isSubmitting || Object.keys(validationErrors).length > 0}
                  className="min-w-[140px]"
                >
                  {loadingState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Profile'
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={handleNext} 
                  disabled={loadingState.isSubmitting}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
