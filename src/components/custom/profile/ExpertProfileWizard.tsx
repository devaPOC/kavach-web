'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Briefcase, Settings, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ValidationService } from '@/lib/validation/service';
import { validateField } from '@/lib/validation/utils';
import { fieldSchemas, type ExpertProfileData } from '@/lib/validation/schemas';
import type { ValidationResult } from '@/lib/validation/types';
import { countries, nationalities, governorates, getWilayatOptions } from '@/lib/data/locations';
import SpecializationSelector from '@/components/custom/SpecializationSelector';
import { CountryNationalitySelector } from '@/components/custom/CountryNationalitySelector';

interface ExpertProfileWizardProps {
  onComplete: () => void;
}

type Step = 'personal' | 'professional' | 'preferences' | 'review';

const steps: { id: Step; title: string; icon: any }[] = [
  { id: 'personal', title: 'Personal Info', icon: User },
  { id: 'professional', title: 'Professional', icon: Briefcase },
  { id: 'preferences', title: 'Preferences', icon: Settings },
  { id: 'review', title: 'Review', icon: CheckCircle },
];

interface LoadingState {
  isSubmitting: boolean;
  isValidating: boolean;
  currentOperation?: string;
}

export function ExpertProfileWizard({ onComplete }: ExpertProfileWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isSubmitting: false,
    isValidating: false
  });
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ExpertProfileData>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [otherSpecialization, setOtherSpecialization] = useState('');

  // Initialize specializations from formData
  useEffect(() => {
    if (formData.areasOfSpecialization && typeof formData.areasOfSpecialization === 'string') {
      // Parse existing specializations - could be from previous saves
      const specializations = formData.areasOfSpecialization.split(',').map(s => s.trim()).filter(s => s.length > 0);

      // Map of predefined specialization labels to IDs
      const labelToIdMap: Record<string, string> = {
        'Digital Footprint & Privacy Specialist': 'digital-footprint',
        'Endpoint & Device Security Specialist': 'endpoint-security',
        'Home & WiFi Security Specialist': 'home-wifi-security',
        'Incident Response Specialist': 'incident-response',
        'Threat Intelligence & Dark Web Analyst': 'threat-intelligence',
        'Cyber Awareness & Training Specialist': 'cyber-awareness',
        'Executive & VIP Cybersecurity Advisor': 'executive-advisor',
        'Compliance & Governance Specialist': 'compliance-governance',
        'PC & Mobile Repair Specialist': 'pc-mobile-repair',
        'PC/Mobile Forensics Specialist': 'forensics',
        'Data Recovery Specialist': 'data-recovery'
      };

      const selected: string[] = [];
      const otherSpecs: string[] = [];

      specializations.forEach(spec => {
        const matchedId = labelToIdMap[spec];
        if (matchedId) {
          selected.push(matchedId);
        } else {
          // Treat as "other" specialization
          otherSpecs.push(spec);
        }
      });

      if (otherSpecs.length > 0) {
        selected.push('other');
        setOtherSpecialization(otherSpecs.join(', '));
      }

      setSelectedSpecializations(selected);
    }
  }, [formData.areasOfSpecialization]);

  // Validate current step fields when step changes or form data updates
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      validateCurrentStepFields();
    }
  }, [currentStep, formData]);

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

  const handleSpecializationsChange = (specializations: string[]) => {
    setSelectedSpecializations(specializations);

    // Convert selected specializations to display text for form data
    const specializationLabels: string[] = [];

    specializations.forEach(id => {
      if (id === 'other') {
        // Include other specialization text if it exists
        if (otherSpecialization.trim()) {
          specializationLabels.push(otherSpecialization.trim());
        }
      } else {
        // Map IDs to display labels
        const labelMap: Record<string, string> = {
          'digital-footprint': 'Digital Footprint & Privacy Specialist',
          'endpoint-security': 'Endpoint & Device Security Specialist',
          'home-wifi-security': 'Home & WiFi Security Specialist',
          'incident-response': 'Incident Response Specialist',
          'threat-intelligence': 'Threat Intelligence & Dark Web Analyst',
          'cyber-awareness': 'Cyber Awareness & Training Specialist',
          'executive-advisor': 'Executive & VIP Cybersecurity Advisor',
          'compliance-governance': 'Compliance & Governance Specialist',
          'pc-mobile-repair': 'PC & Mobile Repair Specialist',
          'forensics': 'PC/Mobile Forensics Specialist',
          'data-recovery': 'Data Recovery Specialist'
        };

        if (labelMap[id]) {
          specializationLabels.push(labelMap[id]);
        }
      }
    });

    updateFormData('areasOfSpecialization', specializationLabels.join(', '));
  };

  const handleOtherSpecializationChange = (value: string) => {
    setOtherSpecialization(value);

    // Always update form data when other specialization changes
    // This ensures the form data stays in sync with the UI
    handleSpecializationsChange(selectedSpecializations);
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
      wilayat: 'wilayat',
      areasOfSpecialization: 'longText',
      professionalExperience: 'longText',
      relevantCertifications: 'longText',
      currentEmploymentStatus: 'employmentStatus',
      currentEmployer: 'shortText',
      availability: 'availability',
      preferredWorkArrangement: 'workArrangement',
      preferredPaymentMethods: 'longText'
    };

    const schemaField = fieldSchemaMap[field];
    if (schemaField) {
      const errorMessage = validateField(fieldSchemas[schemaField], value);
      if (errorMessage) {
        setValidationErrors(prev => ({
          ...prev,
          [field]: errorMessage
        }));
      } else {
        // Clear error if validation passes
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  // Real-time validation for current step
  const validateCurrentStepFields = () => {
    const stepValidation = getStepValidation(currentStep);
    stepValidation.forEach(field => {
      const value = (formData as any)[field];
      validateSingleField(field, value);
    });
  };

  // Check if current step has any validation errors
  const hasCurrentStepErrors = (): boolean => {
    const stepValidation = getStepValidation(currentStep);
    return stepValidation.some(field => validationErrors[field]);
  };

  const validateCurrentStep = (): boolean => {
    const stepValidation = getStepValidation(currentStep);
    const stepErrors: Record<string, string> = {};
    let hasErrors = false;
    const errorMessages: string[] = [];

    stepValidation.forEach(field => {
      const value = (formData as any)[field];
      const errorMessage = validateField(getFieldSchema(field), value);
      if (errorMessage) {
        stepErrors[field] = errorMessage;
        hasErrors = true;

        // Create user-friendly field names for error messages
        const fieldDisplayNames: Record<string, string> = {
          phoneNumber: 'Phone Number',
          dateOfBirth: 'Date of Birth',
          gender: 'Gender',
          nationality: 'Nationality',
          countryOfResidence: 'Country of Residence',
          governorate: 'Governorate',
          wilayat: 'Wilayat',
          areasOfSpecialization: 'Areas of Specialization',
          professionalExperience: 'Professional Experience',
          relevantCertifications: 'Relevant Certifications',
          currentEmploymentStatus: 'Employment Status',
          currentEmployer: 'Current Employer',
          availability: 'Availability',
          preferredWorkArrangement: 'Work Arrangement',
          preferredPaymentMethods: 'Payment Methods'
        };

        const displayName = fieldDisplayNames[field] || field;
        errorMessages.push(`• ${displayName}: ${errorMessage}`);
      }
    });

    if (hasErrors) {
      setValidationErrors(prev => ({ ...prev, ...stepErrors }));
      const errorText = `Please fix the following validation errors before proceeding:\n\n${errorMessages.join('\n')}`;
      setError(errorText);
      return false;
    }

    return true;
  };

  const getStepValidation = (step: Step): string[] => {
    switch (step) {
      case 'personal':
        return ['phoneNumber', 'dateOfBirth', 'gender', 'nationality', 'countryOfResidence', 'governorate', 'wilayat'];
      case 'professional':
        const professionalFields = ['areasOfSpecialization', 'professionalExperience', 'relevantCertifications', 'currentEmploymentStatus'];
        // Only require currentEmployer if not unemployed
        if (formData.currentEmploymentStatus !== 'unemployed') {
          professionalFields.push('currentEmployer');
        }
        return professionalFields;
      case 'preferences':
        return ['availability', 'preferredWorkArrangement', 'preferredPaymentMethods'];
      default:
        return [];
    }
  };

  const getFieldSchema = (field: string) => {
    const fieldSchemaMap: Record<string, keyof typeof fieldSchemas> = {
      phoneNumber: 'requiredPhoneNumber',
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
      nationality: 'nationality',
      countryOfResidence: 'country',
      governorate: 'governorate',
      wilayat: 'wilayat',
      areasOfSpecialization: 'longText',
      professionalExperience: 'longText',
      relevantCertifications: 'longText',
      currentEmploymentStatus: 'employmentStatus',
      currentEmployer: 'shortText',
      availability: 'availability',
      preferredWorkArrangement: 'workArrangement',
      preferredPaymentMethods: 'longText'
    };

    return fieldSchemas[fieldSchemaMap[field]] || fieldSchemas.shortText;
  };

  const nextStep = () => {
    // Clear any existing errors
    setError(null);

    // First validate all fields in current step
    validateCurrentStepFields();

    // Small delay to allow validation state to update
    setTimeout(() => {
      // Check if there are any validation errors after validation
      if (hasCurrentStepErrors()) {
        const stepValidation = getStepValidation(currentStep);
        const errorMessages: string[] = [];

        stepValidation.forEach(field => {
          if (validationErrors[field]) {
            const fieldDisplayNames: Record<string, string> = {
              phoneNumber: 'Phone Number',
              dateOfBirth: 'Date of Birth',
              gender: 'Gender',
              nationality: 'Nationality',
              countryOfResidence: 'Country of Residence',
              governorate: 'Governorate',
              wilayat: 'Wilayat',
              areasOfSpecialization: 'Areas of Specialization',
              professionalExperience: 'Professional Experience',
              relevantCertifications: 'Relevant Certifications',
              currentEmploymentStatus: 'Employment Status',
              currentEmployer: 'Current Employer',
              availability: 'Availability',
              preferredWorkArrangement: 'Work Arrangement',
              preferredPaymentMethods: 'Payment Methods'
            };

            const displayName = fieldDisplayNames[field] || field;
            errorMessages.push(`• ${displayName}: ${validationErrors[field]}`);
          }
        });

        if (errorMessages.length > 0) {
          const errorText = `Please fix the following errors before proceeding:\n\n${errorMessages.join('\n')}`;
          setError(errorText);
          return;
        }
      }

      // Validate current step before proceeding
      if (!validateCurrentStep()) {
        return;
      }

      const stepIndex = steps.findIndex(s => s.id === currentStep);
      if (stepIndex < steps.length - 1) {
        setCurrentStep(steps[stepIndex + 1].id);
      }
    }, 100);
  };

  const prevStep = () => {
    setError(null);
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const handleSubmit = async () => {
    setLoadingState(prev => ({ ...prev, isSubmitting: true, currentOperation: 'Validating profile data...' }));
    setError(null);

    try {
      // Validate the entire form using unified validation
      const validationResult: ValidationResult<ExpertProfileData> = ValidationService.validateExpertProfile(formData);

      if (!validationResult.success) {
        setValidationErrors(validationResult.errors);
        setError('Please fix the validation errors before proceeding.');
        return;
      }

      setLoadingState(prev => ({ ...prev, currentOperation: 'Creating your profile...' }));

      // Submit the validated data
      const response = await apiClient.profile.createExpertProfile(validationResult.data);

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
      </div>

      {/* Country and Nationality Selector */}
      <CountryNationalitySelector
        // Country props
        countryValue={formData.countryOfResidence}
        onCountryChange={(value) => {
          updateFormData('countryOfResidence', value);
          // If changing from Oman to another country, clear governorate and wilayat
          if (value !== 'om') {
            if (formData.governorate) updateFormData('governorate', '');
            if (formData.wilayat) updateFormData('wilayat', '');
          }
        }}
        countryLabel="Country of Residence"
        countryPlaceholder="Select country"
        countryError={validationErrors.countryOfResidence}
        countryRequired={true}
        countryDisabled={loadingState.isSubmitting}
        
        // Nationality props
        nationalityValue={formData.nationality}
        onNationalityChange={(value) => updateFormData('nationality', value)}
        nationalityLabel="Nationality"
        nationalityPlaceholder="Select nationality"
        nationalityError={validationErrors.nationality}
        nationalityRequired={true}
        nationalityDisabled={loadingState.isSubmitting}
        
        // Layout props
        layout="horizontal"
        showSearch={true}
      />

      {/* Governorate and Wilayat for Oman */}
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
              required
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

      {formData.countryOfResidence === 'om' && formData.governorate && (
        <div>
          <Label htmlFor="wilayat">Wilayat *</Label>
          <Select
            value={formData.wilayat || ''}
            onValueChange={(value) => updateFormData('wilayat', value)}
            disabled={loadingState.isSubmitting}
            required
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

  const renderProfessionalInfo = () => (
    <div className="space-y-4">
      <div>
        <SpecializationSelector
          selectedSpecializations={selectedSpecializations}
          onSpecializationsChange={handleSpecializationsChange}
          otherSpecialization={otherSpecialization}
          onOtherSpecializationChange={handleOtherSpecializationChange}
          title="Areas of Specialization *"
          className={validationErrors.areasOfSpecialization ? 'border-red-500' : ''}
        />
        {validationErrors.areasOfSpecialization && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.areasOfSpecialization}</p>
        )}
      </div>

      <div>
        <Label htmlFor="professionalExperience">Professional Experience *</Label>
        <textarea
          id="professionalExperience"
          className={`w-full px-3 py-2 text-sm rounded-md border border-input bg-background ${validationErrors.professionalExperience ? 'border-red-500' : ''
            }`}
          rows={4}
          value={formData.professionalExperience || ''}
          onChange={(e) => updateFormData('professionalExperience', e.target.value)}
          placeholder="Describe your work experience, key achievements, and relevant projects..."
          disabled={loadingState.isSubmitting}
          required
        />
        {validationErrors.professionalExperience && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.professionalExperience}</p>
        )}
      </div>

      <div>
        <Label htmlFor="relevantCertifications">Relevant Certifications *</Label>
        <Input
          id="relevantCertifications"
          value={formData.relevantCertifications || ''}
          onChange={(e) => updateFormData('relevantCertifications', e.target.value)}
          placeholder="e.g., CISSP, CEH, AWS Solutions Architect"
          className={validationErrors.relevantCertifications ? 'border-red-500' : ''}
          disabled={loadingState.isSubmitting}
          required
        />
        {validationErrors.relevantCertifications && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.relevantCertifications}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currentEmploymentStatus">Employment Status *</Label>
          <Select
            value={formData.currentEmploymentStatus || ''}
            onValueChange={(value) => updateFormData('currentEmploymentStatus', value)}
            disabled={loadingState.isSubmitting}
            required
          >
            <SelectTrigger className={validationErrors.currentEmploymentStatus ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employed">Employed</SelectItem>
              <SelectItem value="self-employed">Self-employed</SelectItem>
              <SelectItem value="unemployed">Unemployed</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.currentEmploymentStatus && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.currentEmploymentStatus}</p>
          )}
        </div>
        <div>
          {formData.currentEmploymentStatus === 'student' ? (
            <>
              <Label htmlFor="currentEmployer">Institute Name *</Label>
              <Input
                id="currentEmployer"
                value={formData.currentEmployer || ''}
                onChange={(e) => updateFormData('currentEmployer', e.target.value)}
                placeholder="University/Institute name"
                className={validationErrors.currentEmployer ? 'border-red-500' : ''}
                disabled={loadingState.isSubmitting}
                required
              />
            </>
          ) : (
            <>
              <Label htmlFor="currentEmployer">
                Current Employer {formData.currentEmploymentStatus === 'unemployed' ? '' : '*'}
              </Label>
              <Input
                id="currentEmployer"
                value={formData.currentEmployer || ''}
                onChange={(e) => updateFormData('currentEmployer', e.target.value)}
                placeholder={formData.currentEmploymentStatus === 'unemployed' ? 'Previous employer (optional)' : 'Company name'}
                className={validationErrors.currentEmployer ? 'border-red-500' : ''}
                disabled={loadingState.isSubmitting}
                required={formData.currentEmploymentStatus !== 'unemployed'}
              />
            </>
          )}
          {validationErrors.currentEmployer && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.currentEmployer}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="availability">Availability *</Label>
          <Select
            value={formData.availability || ''}
            onValueChange={(value) => updateFormData('availability', value)}
            disabled={loadingState.isSubmitting}
            required
          >
            <SelectTrigger className={validationErrors.availability ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.availability && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.availability}</p>
          )}
        </div>
        <div>
          <Label htmlFor="preferredWorkArrangement">Work Arrangement *</Label>
          <Select
            value={formData.preferredWorkArrangement || ''}
            onValueChange={(value) => updateFormData('preferredWorkArrangement', value)}
            disabled={loadingState.isSubmitting}
            required
          >
            <SelectTrigger className={validationErrors.preferredWorkArrangement ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select arrangement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="on-site">On-site</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          {validationErrors.preferredWorkArrangement && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.preferredWorkArrangement}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="preferredPaymentMethods">Preferred Payment Methods *</Label>
        <Select
          value={formData.preferredPaymentMethods || ''}
          onValueChange={(value) => updateFormData('preferredPaymentMethods', value)}
          disabled={loadingState.isSubmitting}
          required
        >
          <SelectTrigger className={validationErrors.preferredPaymentMethods ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
            <SelectItem value="digital-wallet">Digital Wallet</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
            <SelectItem value="bank-transfer-digital-wallet">Bank Transfer & Digital Wallet</SelectItem>
            <SelectItem value="all-methods">All Methods</SelectItem>
          </SelectContent>
        </Select>
        {validationErrors.preferredPaymentMethods && (
          <p className="text-sm text-red-500 mt-1">{validationErrors.preferredPaymentMethods}</p>
        )}
      </div>
    </div>
  );

  const renderReview = () => {
    const getLocationDisplay = () => {
      const parts = [];
      if (formData.wilayat) parts.push(formData.wilayat);
      if (formData.governorate) parts.push(formData.governorate);
      if (formData.countryOfResidence) {
        const country = countries.find(c => c.value === formData.countryOfResidence);
        if (country) parts.push(country.label);
      }
      return parts.length > 0 ? parts.join(', ') : 'Not provided';
    };

    const getGenderDisplay = () => {
      if (!formData.gender) return 'Not provided';
      switch (formData.gender) {
        case 'male': return 'Male';
        case 'female': return 'Female';
        case 'prefer-not-to-say': return 'Prefer not to say';
        default: return formData.gender;
      }
    };

    const getNationalityDisplay = () => {
      if (!formData.nationality) return 'Not provided';
      const nationality = nationalities.find(n => n.value === formData.nationality);
      return nationality ? nationality.label : formData.nationality;
    };

    const getEmploymentStatusDisplay = () => {
      if (!formData.currentEmploymentStatus) return 'Not provided';
      switch (formData.currentEmploymentStatus) {
        case 'employed': return 'Employed';
        case 'self-employed': return 'Self-employed';
        case 'unemployed': return 'Unemployed';
        case 'student': return 'Student';
        default: return formData.currentEmploymentStatus;
      }
    };

    const getAvailabilityDisplay = () => {
      if (!formData.availability) return 'Not provided';
      switch (formData.availability) {
        case 'full-time': return 'Full-time';
        case 'part-time': return 'Part-time';
        case 'flexible': return 'Flexible';
        default: return formData.availability;
      }
    };

    const getWorkArrangementDisplay = () => {
      if (!formData.preferredWorkArrangement) return 'Not provided';
      switch (formData.preferredWorkArrangement) {
        case 'remote': return 'Remote';
        case 'on-site': return 'On-site';
        case 'hybrid': return 'Hybrid';
        default: return formData.preferredWorkArrangement;
      }
    };

    const getPaymentMethodsDisplay = () => {
      if (!formData.preferredPaymentMethods) return 'Not provided';
      switch (formData.preferredPaymentMethods) {
        case 'bank-transfer': return 'Bank Transfer';
        case 'digital-wallet': return 'Digital Wallet';
        case 'cash': return 'Cash';
        case 'cryptocurrency': return 'Cryptocurrency';
        case 'bank-transfer-digital-wallet': return 'Bank Transfer & Digital Wallet';
        case 'all-methods': return 'All Methods';
        default: return formData.preferredPaymentMethods;
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-2">Personal Information</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Phone: {formData.phoneNumber || 'Not provided'}</p>
            <p>Date of Birth: {formData.dateOfBirth || 'Not provided'}</p>
            <p>Gender: {getGenderDisplay()}</p>
            <p>Nationality: {getNationalityDisplay()}</p>
            <p>Location: {getLocationDisplay()}</p>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-2">Professional Information</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Specialization: {formData.areasOfSpecialization || 'Not provided'}</p>
            <p>Experience: {formData.professionalExperience ? 'Provided' : 'Not provided'}</p>
            <p>Certifications: {formData.relevantCertifications || 'Not provided'}</p>
            <p>Employment: {getEmploymentStatusDisplay()}</p>
            <p>{formData.currentEmploymentStatus === 'student' ? 'Institute' : 'Employer'}: {formData.currentEmployer || 'Not provided'}</p>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-2">Preferences</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Availability: {getAvailabilityDisplay()}</p>
            <p>Work Arrangement: {getWorkArrangementDisplay()}</p>
            <p>Payment Methods: {getPaymentMethodsDisplay()}</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your profile will be submitted for admin approval. You'll be notified once it's approved and you can start using the platform.
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal':
        return renderPersonalInfo();
      case 'professional':
        return renderProfessionalInfo();
      case 'preferences':
        return renderPreferences();
      case 'review':
        return renderReview();
      default:
        return null;
    }
  };

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Card className="min-h-[600px]">
        <CardHeader>
          <CardTitle>Complete Your Expert Profile</CardTitle>
          <CardDescription>
            Please provide your contact information and professional details to get started as an expert on our platform. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="mb-8">
            {/* Mobile: Vertical layout */}
            <div className="flex flex-col space-y-4 md:hidden">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`ml-3 text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                    {isActive && (
                      <div className="ml-auto text-xs text-primary font-medium">
                        Step {index + 1} of {steps.length}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: Horizontal layout */}
            <div className="hidden md:flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isActive ? 'bg-primary text-primary-foreground' :
                      isCompleted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`ml-2 text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div className={`w-8 h-px mx-4 ${isCompleted ? 'bg-green-500' : 'bg-muted'
                        }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Current Step Validation Summary */}
          {hasCurrentStepErrors() && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Please fix the following errors:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {getStepValidation(currentStep).map(field => {
                    if (validationErrors[field]) {
                      const fieldDisplayNames: Record<string, string> = {
                        phoneNumber: 'Phone Number',
                        dateOfBirth: 'Date of Birth',
                        gender: 'Gender',
                        nationality: 'Nationality',
                        countryOfResidence: 'Country of Residence',
                        governorate: 'Governorate',
                        wilayat: 'Wilayat',
                        areasOfSpecialization: 'Areas of Specialization',
                        professionalExperience: 'Professional Experience',
                        relevantCertifications: 'Relevant Certifications',
                        currentEmploymentStatus: 'Employment Status',
                        currentEmployer: 'Current Employer',
                        availability: 'Availability',
                        preferredWorkArrangement: 'Work Arrangement',
                        preferredPaymentMethods: 'Payment Methods'
                      };

                      const displayName = fieldDisplayNames[field] || field;
                      return (
                        <li key={field}>
                          <strong>{displayName}:</strong> {validationErrors[field]}
                        </li>
                      );
                    }
                    return null;
                  }).filter(Boolean)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading Progress */}
          {loadingState.currentOperation && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800">{loadingState.currentOperation}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <div>
              {currentStepIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={loadingState.isSubmitting || loadingState.isValidating}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="space-x-2">
              {currentStep === 'review' ? (
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
                  onClick={nextStep}
                  disabled={loadingState.isSubmitting || loadingState.isValidating || hasCurrentStepErrors()}
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
