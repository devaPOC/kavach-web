'use client';

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateTimePicker } from '@/components/ui/date-time-picker';

import { createAwarenessSessionSchema, type CreateAwarenessSessionData as CreateAwarenessSessionFormData } from '@/lib/validation/awareness-session-schemas';
import { type CreateAwarenessSessionData } from '@/types/awareness-session';
import {
  DURATION_LABELS,
  SESSION_MODE_LABELS,
  AUDIENCE_TYPE_LABELS,
  type AudienceType,
} from '@/types/awareness-session';

interface AwarenessSessionRequestFormProps {
  onSubmit: (data: CreateAwarenessSessionFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  className?: string;
  initialData?: CreateAwarenessSessionFormData;
}

interface FormStep {
  id: number;
  title: string;
  description: string;
  fields: string[];
}

const FORM_STEPS: FormStep[] = [
  {
    id: 1,
    title: 'Session Details',
    description: 'Basic information about your awareness session',
    fields: ['sessionDate', 'location', 'duration', 'subject'],
  },
  {
    id: 2,
    title: 'Audience Information',
    description: 'Details about your target audience',
    fields: ['audienceSize', 'audienceTypes', 'sessionMode'],
  },
  {
    id: 3,
    title: 'Organization & Contact',
    description: 'Your organization and contact information',
    fields: ['organizationName', 'contactEmail', 'contactPhone', 'specialRequirements'],
  },
];

export function AwarenessSessionRequestForm({
  onSubmit,
  isLoading = false,
  error,
  className = '',
  initialData,
}: AwarenessSessionRequestFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(createAwarenessSessionSchema),
    defaultValues: initialData ? {
      sessionDate: initialData.sessionDate, // Already a string
      location: initialData.location,
      duration: initialData.duration,
      subject: initialData.subject,
      audienceSize: initialData.audienceSize,
      audienceTypes: initialData.audienceTypes,
      sessionMode: initialData.sessionMode,
      specialRequirements: initialData.specialRequirements || '',
      organizationName: initialData.organizationName,
      contactEmail: initialData.contactEmail,
      contactPhone: initialData.contactPhone,
    } : {
      sessionDate: '',
      location: '',
      duration: undefined,
      subject: '',
      audienceSize: undefined,
      audienceTypes: [],
      sessionMode: undefined,
      specialRequirements: '',
      organizationName: '',
      contactEmail: '',
      contactPhone: '',
    },
    mode: 'onChange',
  });

  const { trigger, formState: { errors, isValid } } = form;

  // Validate current step fields
  const validateCurrentStep = useCallback(async () => {
    const currentStepFields = FORM_STEPS.find(step => step.id === currentStep)?.fields || [];
    const isStepValid = await trigger(currentStepFields as any);
    return isStepValid;
  }, [currentStep, trigger]);

  // Check if current step is valid
  const isCurrentStepValid = useCallback(() => {
    const currentStepFields = FORM_STEPS.find(step => step.id === currentStep)?.fields || [];
    return currentStepFields.every(field => !errors[field as keyof typeof errors]);
  }, [currentStep, errors]);

  // Handle next step
  const handleNextStep = useCallback(async () => {
    const isStepValid = await validateCurrentStep();
    if (isStepValid && currentStep < FORM_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateCurrentStep]);

  // Handle previous step
  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Handle form submission
  const handleSubmit = useCallback(async (data: CreateAwarenessSessionFormData) => {
    if (isSubmitting || isLoading) return;

    setIsSubmitting(true);
    try {
      console.log('Form data before onSubmit:', data);
      console.log('Form sessionDate type:', typeof data.sessionDate);
      console.log('Form sessionDate value:', data.sessionDate);
      
      // Pass the form data as-is (with sessionDate as string)
      await onSubmit(data as any);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isLoading, onSubmit]);

  // Get minimum date (today)
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {FORM_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step.id < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.id}
              </div>
              {index < FORM_STEPS.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    step.id < currentStep ? 'bg-green-500' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {FORM_STEPS.find(step => step.id === currentStep)?.title}
          </h2>
          <p className="text-muted-foreground text-sm">
            {FORM_STEPS.find(step => step.id === currentStep)?.description}
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Step 1: Session Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>
                  Provide basic information about your cybersecurity awareness session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="sessionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Date & Time *</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(date?.toISOString())}
                          placeholder="Select date and time"
                          minDate={minDate}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Choose when you would like the awareness session to take place
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter session location or online platform details"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Specify the venue address or online platform (e.g., Zoom, Teams)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select session duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(DURATION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How long should the awareness session be?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject/Topic *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter the main topic or focus area"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        What cybersecurity topic would you like the session to focus on?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Audience Information */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Audience Information</CardTitle>
                <CardDescription>
                  Tell us about your target audience and session format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="audienceSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Audience Size *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter number of participants"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        How many people do you expect to attend?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="audienceTypes"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Audience Types *</FormLabel>
                        <FormDescription>
                          Select all audience types that apply to your session
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(AUDIENCE_TYPE_LABELS).map(([value, label]) => (
                          <FormField
                            key={value}
                            control={form.control}
                            name="audienceTypes"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={value}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(value as AudienceType)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (val) => val !== value
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sessionMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Mode *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select session mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(SESSION_MODE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Will this be an in-person or online session?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Organization & Contact */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Organization & Contact Information</CardTitle>
                <CardDescription>
                  Provide your organization details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your organization name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The name of your company, school, or organization
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        We'll use this email to communicate about your request
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone *</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Enter your phone number"
                          defaultCountry="OM"
                        />
                      </FormControl>
                      <FormDescription>
                        A phone number where we can reach you if needed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requirements (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements, accessibility needs, or additional information..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Let us know about any specific needs or requirements for your session
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep < FORM_STEPS.length ? (
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={!isCurrentStepValid()}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || isLoading || !isValid}
                className="flex items-center gap-2"
              >
                {(isSubmitting || isLoading) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Submit Request
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}