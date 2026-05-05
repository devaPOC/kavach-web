# Form Components

## Overview

The form components provide a comprehensive form handling system built on React Hook Form, Zod validation, and shadcn/ui components. They offer real-time validation, error handling, accessibility features, and consistent styling across the application.

## Core Form System

### Form Architecture

The form system is built on several key technologies:
- **React Hook Form**: Form state management and validation
- **Zod**: Schema-based validation
- **shadcn/ui Form**: Accessible form components
- **Custom Validation Service**: Centralized validation logic

### Form Component Structure

```typescript
// Basic form structure
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { /* ... */ }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="fieldName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field Label</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## Form Components

### FormField

The core component for creating form fields with validation and error handling.

**Import:**
```typescript
import { FormField } from '@/components/ui/form';
```

**Usage:**
```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email Address</FormLabel>
      <FormControl>
        <Input 
          type="email" 
          placeholder="Enter your email"
          {...field} 
        />
      </FormControl>
      <FormDescription>
        We'll never share your email with anyone else.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Features:**
- Automatic field registration with React Hook Form
- Built-in validation state management
- Error message display
- Accessibility attributes (aria-invalid, aria-describedby)

### FormItem

Container component that provides proper spacing and layout for form fields.

**Usage:**
```tsx
<FormItem>
  <FormLabel>Username</FormLabel>
  <FormControl>
    <Input placeholder="Enter username" />
  </FormControl>
  <FormDescription>
    This will be your public display name.
  </FormDescription>
  <FormMessage />
</FormItem>
```

### FormLabel

Accessible label component with error state styling.

**Features:**
- Automatic association with form controls
- Error state styling (red text when field has errors)
- Proper accessibility attributes

### FormControl

Wrapper component that adds validation attributes to form controls.

**Features:**
- Automatic `aria-invalid` attribute based on field state
- `aria-describedby` linking to description and error messages
- Focus management

### FormDescription

Component for providing additional context about form fields.

**Usage:**
```tsx
<FormDescription>
  Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.
</FormDescription>
```

### FormMessage

Component for displaying validation error messages.

**Features:**
- Automatic error message display from validation
- Accessible error announcement
- Consistent error styling

## Form Patterns

### Basic Form with Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input, Button } from '@/components/ui';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  age: z.number().min(18, 'Must be at least 18 years old'),
});

type FormData = z.infer<typeof formSchema>;

function UserForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      age: 18,
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </Form>
  );
}
```

### Form with Select Fields

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const countries = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
];

<FormField
  control={form.control}
  name="country"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Country</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {countries.map((country) => (
            <SelectItem key={country.value} value={country.value}>
              {country.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Form with Checkbox

```tsx
import { Checkbox } from '@/components/ui/checkbox';

<FormField
  control={form.control}
  name="acceptTerms"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>
          Accept terms and conditions
        </FormLabel>
        <FormDescription>
          You agree to our Terms of Service and Privacy Policy.
        </FormDescription>
      </div>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Form with File Upload

```tsx
import { Input } from '@/components/ui/input';

<FormField
  control={form.control}
  name="avatar"
  render={({ field: { value, onChange, ...field } }) => (
    <FormItem>
      <FormLabel>Profile Picture</FormLabel>
      <FormControl>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file);
          }}
          {...field}
        />
      </FormControl>
      <FormDescription>
        Upload a profile picture (max 5MB)
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Advanced Form Patterns

### Multi-Step Form

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const steps = [
    { title: 'Personal Info', fields: ['firstName', 'lastName', 'email'] },
    { title: 'Address', fields: ['street', 'city', 'zipCode'] },
    { title: 'Preferences', fields: ['newsletter', 'notifications'] },
  ];

  const nextStep = async () => {
    const currentFields = steps[currentStep].fields;
    const isValid = await form.trigger(currentFields);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const onSubmit = (data: any) => {
    console.log('Multi-step form submitted:', data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center ${
                index <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  index <= currentStep
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        {currentStep === 0 && (
          <div className="space-y-4">
            {/* Personal info fields */}
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* More fields... */}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          {currentStep === steps.length - 1 ? (
            <Button type="submit">Submit</Button>
          ) : (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
```

### Form with Dynamic Fields

```tsx
import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

function DynamicForm() {
  const form = useForm({
    defaultValues: {
      skills: [{ name: '', level: 'beginner' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'skills',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Skills</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', level: 'beginner' })}
            >
              Add Skill
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-end">
              <FormField
                control={form.control}
                name={`skills.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Skill Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., JavaScript" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`skills.${index}.level`}
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel>Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="submit">Save Skills</Button>
      </form>
    </Form>
  );
}
```

### Form with Real-time Validation

```tsx
import { useEffect } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

function RealTimeValidationForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange', // Enable real-time validation
  });

  const email = form.watch('email');
  const debouncedEmail = useDebounce(email, 500);

  // Real-time email availability check
  useEffect(() => {
    if (debouncedEmail && debouncedEmail.includes('@')) {
      checkEmailAvailability(debouncedEmail);
    }
  }, [debouncedEmail]);

  const checkEmailAvailability = async (email: string) => {
    try {
      const response = await fetch('/api/v1/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();
      
      if (!result.available) {
        form.setError('email', {
          type: 'manual',
          message: 'This email is already taken',
        });
      } else {
        form.clearErrors('email');
      }
    } catch (error) {
      console.error('Email validation error:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input type="email" {...field} />
                  {form.formState.isValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## Form Validation

### Zod Schema Examples

```typescript
import { z } from 'zod';

// Basic validation schema
const userSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  age: z.number().min(18, 'Must be at least 18 years old').max(120, 'Age must be realistic'),
});

// Complex validation schema
const profileSchema = z.object({
  // Required fields
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  
  // Optional fields
  middleName: z.string().optional(),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
  
  // Conditional validation
  isExpert: z.boolean(),
  expertise: z.string().optional(),
  
  // Array validation
  skills: z.array(z.object({
    name: z.string().min(1, 'Skill name is required'),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
  })).min(1, 'At least one skill is required'),
  
  // File validation
  avatar: z.instanceof(File).optional(),
  
  // Custom validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number'),
    
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  // Conditional validation: if isExpert is true, expertise is required
  if (data.isExpert && !data.expertise) {
    return false;
  }
  return true;
}, {
  message: "Expertise is required for experts",
  path: ["expertise"],
});
```

### Custom Validation Hooks

```typescript
import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';

export function useFormValidation<T>(form: UseFormReturn<T>) {
  const validateField = useCallback(async (fieldName: keyof T) => {
    const isValid = await form.trigger(fieldName);
    return isValid;
  }, [form]);

  const validateForm = useCallback(async () => {
    const isValid = await form.trigger();
    return isValid;
  }, [form]);

  const getFieldError = useCallback((fieldName: keyof T) => {
    return form.formState.errors[fieldName]?.message;
  }, [form.formState.errors]);

  const hasFieldError = useCallback((fieldName: keyof T) => {
    return !!form.formState.errors[fieldName];
  }, [form.formState.errors]);

  const isFieldTouched = useCallback((fieldName: keyof T) => {
    return !!form.formState.touchedFields[fieldName];
  }, [form.formState.touchedFields]);

  const isFieldDirty = useCallback((fieldName: keyof T) => {
    return !!form.formState.dirtyFields[fieldName];
  }, [form.formState.dirtyFields]);

  return {
    validateField,
    validateForm,
    getFieldError,
    hasFieldError,
    isFieldTouched,
    isFieldDirty,
    isValid: form.formState.isValid,
    isSubmitting: form.formState.isSubmitting,
    isDirty: form.formState.isDirty,
  };
}
```

## Error Handling

### Error Display Patterns

```tsx
// Field-level errors
<FormField
  control={form.control}
  name="email"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input 
          {...field} 
          className={fieldState.error ? 'border-red-500' : ''}
        />
      </FormControl>
      {fieldState.error && (
        <FormMessage className="text-red-500">
          {fieldState.error.message}
        </FormMessage>
      )}
    </FormItem>
  )}
/>

// Form-level errors
function FormWithGlobalErrors() {
  const [globalError, setGlobalError] = useState<string | null>(null);

  const onSubmit = async (data: any) => {
    try {
      setGlobalError(null);
      await submitForm(data);
    } catch (error) {
      setGlobalError('Failed to submit form. Please try again.');
    }
  };

  return (
    <Form {...form}>
      {globalError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

### Server-side Error Integration

```tsx
import { ApiErrorResponse } from '@/lib/errors/response-utils';

function FormWithServerErrors() {
  const [serverError, setServerError] = useState<ApiErrorResponse | null>(null);

  const handleServerError = (error: ApiErrorResponse) => {
    // Set global error message
    if (error.error) {
      setServerError(error);
    }

    // Set field-specific errors
    if (error.details?.validationErrors) {
      error.details.validationErrors.forEach((validationError) => {
        form.setError(validationError.field as any, {
          type: 'server',
          message: validationError.message,
        });
      });
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setServerError(null);
      form.clearErrors();
      
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        handleServerError(errorData);
        return;
      }

      // Handle success
    } catch (error) {
      setServerError({
        error: 'Network error occurred',
        success: false,
      });
    }
  };

  return (
    <Form {...form}>
      {serverError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{serverError.error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

## Testing Form Components

### Unit Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserForm } from './UserForm';

describe('UserForm', () => {
  it('validates required fields', async () => {
    render(<UserForm onSubmit={jest.fn()} />);
    
    // Try to submit empty form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const mockOnSubmit = jest.fn();
    render(<UserForm onSubmit={mockOnSubmit} />);
    
    // Fill out form
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' }
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john.doe@example.com' }
    });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });
    });
  });

  it('displays server errors', async () => {
    const mockOnSubmit = jest.fn().mockRejectedValue({
      error: 'Email already exists',
      details: {
        validationErrors: [
          { field: 'email', message: 'This email is already taken' }
        ]
      }
    });

    render(<UserForm onSubmit={mockOnSubmit} />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/this email is already taken/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { SignupForm } from './SignupForm';

const server = setupServer(
  rest.post('/api/v1/auth/check-email', (req, res, ctx) => {
    return res(ctx.json({ available: true }));
  }),
  rest.post('/api/v1/auth/signup', (req, res, ctx) => {
    return res(ctx.json({ success: true, user: { id: '1' } }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SignupForm Integration', () => {
  it('completes full signup flow', async () => {
    const mockOnSubmit = jest.fn();
    render(<SignupForm onSubmit={mockOnSubmit} />);
    
    // Fill out form
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' }
    });
    
    // Wait for email validation
    await waitFor(() => {
      expect(screen.getByText(/email is available/i)).toBeInTheDocument();
    });
    
    // Complete and submit form
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'SecurePass123!' }
    });
    fireEvent.click(screen.getByLabelText(/accept terms/i));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
```

## Best Practices

### Form Design
1. **Clear Labels**: Use descriptive labels for all form fields
2. **Helpful Placeholders**: Provide examples of expected input
3. **Logical Grouping**: Group related fields together
4. **Progressive Disclosure**: Show advanced options only when needed
5. **Consistent Styling**: Use consistent spacing and styling

### Validation
1. **Client-side First**: Validate on the client for immediate feedback
2. **Server-side Always**: Always validate on the server for security
3. **Real-time Feedback**: Provide immediate feedback for critical fields
4. **Clear Error Messages**: Write helpful, actionable error messages
5. **Accessibility**: Ensure errors are announced to screen readers

### Performance
1. **Debounce Validation**: Debounce real-time validation to reduce API calls
2. **Lazy Validation**: Only validate fields that have been touched
3. **Memoize Components**: Use React.memo for expensive form components
4. **Optimize Re-renders**: Minimize unnecessary re-renders with proper dependencies

### Accessibility
1. **Proper Labels**: Associate labels with form controls
2. **Error Announcements**: Ensure errors are announced to screen readers
3. **Keyboard Navigation**: Support full keyboard navigation
4. **Focus Management**: Manage focus appropriately, especially in multi-step forms
5. **ARIA Attributes**: Use appropriate ARIA attributes for complex forms

## Related Documentation

- [UI Components](./ui-components.md) - Base UI component reference
- [Authentication Components](./auth-components.md) - Auth-specific form components
- [Validation Service](../../backend/services/validation.md) - Server-side validation
- [Accessibility Guide](../../development/coding-standards/accessibility.md) - Accessibility standards
- [Testing Guide](../../development/coding-standards/testing.md) - Testing best practices