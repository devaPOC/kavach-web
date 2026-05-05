# Authentication Components

## Overview

The authentication components provide a complete user authentication system supporting multiple user roles (Customer, Expert, Admin) with real-time validation, error handling, and accessibility features.

## Components

### LoginForm

A comprehensive login form component with role-based authentication and validation.

**Location:** `src/components/custom/auth/LoginForm.tsx`

**Import:**
```typescript
import { LoginForm } from '@/components/custom/auth';
```

**Props:**
```typescript
interface LoginFormProps {
  role: 'customer' | 'expert';
  onSubmit: (data: LoginFormData) => Promise<void>;
  loading?: boolean;
  error?: string | ApiErrorResponse;
  className?: string;
}

interface LoginFormData {
  email: string;
  password: string;
  role: UserRole;
}
```

**Usage Example:**
```tsx
import { LoginForm } from '@/components/custom/auth';
import { useState } from 'react';

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData);
        return;
      }
      
      // Handle successful login
      const result = await response.json();
      console.log('Login successful:', result);
      
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginForm
      role="customer"
      onSubmit={handleLogin}
      loading={loading}
      error={error}
      className="max-w-md mx-auto"
    />
  );
}
```

**Features:**
- **Role-based authentication**: Supports customer and expert roles
- **Real-time validation**: Validates fields on blur and form submission
- **Error handling**: Displays both general and field-specific errors
- **Loading states**: Shows loading indicators during submission
- **Accessibility**: Full keyboard navigation and screen reader support
- **Auto-complete**: Proper autocomplete attributes for password managers

**Validation Rules:**
- **Email**: Must be a valid email format
- **Password**: Required field, minimum length validation
- **Form-level**: Prevents submission with invalid data

**Error Handling:**
The component handles multiple error formats:
```typescript
// String error
error="Invalid credentials"

// API error response
error={{
  error: "Authentication failed",
  details: {
    validationErrors: [
      { field: "email", message: "Email is required" },
      { field: "password", message: "Password is too short" }
    ]
  }
}}
```

### SignupWizard

A comprehensive registration form with real-time email validation and multi-step validation.

**Location:** `src/components/custom/auth/SignupWizard.tsx`

**Import:**
```typescript
import { SignupWizard } from '@/components/custom/auth';
```

**Props:**
```typescript
interface SignupWizardProps {
  role: 'customer' | 'expert';
  onSubmit: (data: SignupData) => Promise<void>;
  loading?: boolean;
  error?: string | ApiErrorResponse;
  className?: string;
}

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  agreedToTerms: boolean;
  role: UserRole;
}
```

**Usage Example:**
```tsx
import { SignupWizard } from '@/components/custom/auth';
import { useState } from 'react';

function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (data: SignupData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData);
        return;
      }
      
      // Handle successful signup
      const result = await response.json();
      console.log('Signup successful:', result);
      
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignupWizard
      role="customer"
      onSubmit={handleSignup}
      loading={loading}
      error={error}
      className="max-w-md mx-auto"
    />
  );
}
```

**Features:**
- **Real-time email validation**: Checks email availability as user types
- **Comprehensive validation**: Validates all fields with immediate feedback
- **Terms acceptance**: Required terms and conditions checkbox
- **Password visibility**: Toggle password visibility
- **Loading states**: Shows loading during email validation and form submission
- **Responsive design**: Works on all screen sizes
- **Accessibility**: Full ARIA support and keyboard navigation

**Real-time Email Validation:**
The component uses the `useEmailValidation` hook to check email availability:
```typescript
const emailValidation = useEmailValidation(formData.email, 500);

// Shows different states:
// - Checking: Loading spinner
// - Available: Green checkmark with success message
// - Taken: Red error message
// - Error: Error message from validation service
```

**Validation Rules:**
- **First Name**: Required, minimum 2 characters
- **Last Name**: Required, minimum 2 characters
- **Email**: Valid email format, must be available
- **Password**: Strong password requirements (length, complexity)
- **Terms**: Must be accepted to proceed

### TabNavigation

A navigation component for switching between different authentication modes.

**Location:** `src/components/custom/auth/TabNavigation.tsx`

**Import:**
```typescript
import { TabNavigation } from '@/components/custom/auth';
```

**Props:**
```typescript
interface TabNavigationProps {
  activeTab: 'customer' | 'expert';
  onTabChange: (tab: 'customer' | 'expert') => void;
  className?: string;
}
```

**Usage Example:**
```tsx
import { TabNavigation } from '@/components/custom/auth';
import { useState } from 'react';

function AuthPage() {
  const [activeRole, setActiveRole] = useState<'customer' | 'expert'>('customer');

  return (
    <div>
      <TabNavigation
        activeTab={activeRole}
        onTabChange={setActiveRole}
        className="mb-6"
      />
      
      {/* Render appropriate form based on active tab */}
      <LoginForm role={activeRole} onSubmit={handleLogin} />
    </div>
  );
}
```

**Features:**
- **Role switching**: Toggle between customer and expert modes
- **Visual feedback**: Clear indication of active tab
- **Keyboard accessible**: Full keyboard navigation support
- **Responsive**: Adapts to different screen sizes

## Integration Patterns

### Complete Authentication Flow

Here's how to combine all authentication components for a complete flow:

```tsx
import { useState } from 'react';
import { LoginForm, SignupWizard, TabNavigation } from '@/components/custom/auth';

function AuthenticationPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'customer' | 'expert'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (data: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = mode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData);
        return;
      }
      
      // Handle success (redirect, update state, etc.)
      const result = await response.json();
      console.log('Authentication successful:', result);
      
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="mb-6">
        <TabNavigation
          activeTab={role}
          onTabChange={setRole}
        />
      </div>
      
      <div className="mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('login')}
            className={`px-4 py-2 rounded ${mode === 'login' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`px-4 py-2 rounded ${mode === 'signup' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Sign Up
          </button>
        </div>
      </div>
      
      {mode === 'login' ? (
        <LoginForm
          role={role}
          onSubmit={handleAuth}
          loading={loading}
          error={error}
        />
      ) : (
        <SignupWizard
          role={role}
          onSubmit={handleAuth}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
```

### Error Handling Best Practices

```tsx
// Centralized error handling
const handleAuthError = (error: any) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

// Field-specific error extraction
const getFieldErrors = (error: any) => {
  if (error?.details?.validationErrors) {
    const fieldErrors: Record<string, string> = {};
    error.details.validationErrors.forEach((err: any) => {
      fieldErrors[err.field] = err.message;
    });
    return fieldErrors;
  }
  return {};
};
```

### Loading State Management

```tsx
// Comprehensive loading state
const [loadingStates, setLoadingStates] = useState({
  login: false,
  signup: false,
  emailValidation: false,
});

const updateLoadingState = (key: string, value: boolean) => {
  setLoadingStates(prev => ({ ...prev, [key]: value }));
};

// Usage in components
<LoginForm
  loading={loadingStates.login}
  onSubmit={async (data) => {
    updateLoadingState('login', true);
    try {
      await handleLogin(data);
    } finally {
      updateLoadingState('login', false);
    }
  }}
/>
```

## Validation Integration

### Custom Validation Hook

```typescript
import { useCallback, useState } from 'react';
import { ValidationService } from '@/lib/validation';

export function useFormValidation<T>(validationSchema: any) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((name: string, value: any) => {
    const result = ValidationService.validateField(validationSchema, name, value);
    
    if (result.success) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    } else {
      setErrors(prev => ({ ...prev, [name]: result.error }));
    }
    
    return result.success;
  }, [validationSchema]);

  const validateForm = useCallback((data: T) => {
    const result = ValidationService.validate(validationSchema, data);
    
    if (!result.success) {
      setErrors(result.errors);
      setTouched(Object.keys(result.errors).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>));
    }
    
    return result;
  }, [validationSchema]);

  const markFieldTouched = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateForm,
    markFieldTouched,
    clearErrors,
  };
}
```

## Testing

### Component Testing Examples

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/custom/auth';

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders login form with required fields', () => {
    render(<LoginForm role="customer" onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates email field on blur', async () => {
    render(<LoginForm role="customer" onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    render(<LoginForm role="customer" onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        role: 'CUSTOMER'
      });
    });
  });

  it('displays error messages', () => {
    const error = 'Invalid credentials';
    render(<LoginForm role="customer" onSubmit={mockOnSubmit} error={error} />);
    
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<LoginForm role="customer" onSubmit={mockOnSubmit} loading={true} />);
    
    expect(screen.getByText(/please wait/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Accessibility Testing

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoginForm } from '@/components/custom/auth';

expect.extend(toHaveNoViolations);

describe('LoginForm Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(
      <LoginForm role="customer" onSubmit={jest.fn()} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper form labels', () => {
    render(<LoginForm role="customer" onSubmit={jest.fn()} />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation', () => {
    render(<LoginForm role="customer" onSubmit={jest.fn()} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Test tab order
    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);
    
    fireEvent.keyDown(emailInput, { key: 'Tab' });
    expect(document.activeElement).toBe(passwordInput);
    
    fireEvent.keyDown(passwordInput, { key: 'Tab' });
    expect(document.activeElement).toBe(submitButton);
  });
});
```

## Best Practices

### Component Design
1. **Single Responsibility**: Each component has a clear, focused purpose
2. **Prop Interface**: Well-defined TypeScript interfaces for all props
3. **Error Handling**: Comprehensive error handling with user-friendly messages
4. **Loading States**: Clear feedback during async operations
5. **Accessibility**: Full keyboard and screen reader support

### State Management
1. **Local State**: Use local state for component-specific data
2. **Validation State**: Separate validation state from form data
3. **Error State**: Centralized error handling and display
4. **Loading State**: Granular loading states for different operations

### Performance
1. **Memoization**: Use React.memo for expensive components
2. **Debouncing**: Debounce real-time validation to reduce API calls
3. **Lazy Loading**: Load validation schemas and heavy dependencies lazily
4. **Bundle Splitting**: Split authentication code into separate chunks

### Security
1. **Input Sanitization**: Validate and sanitize all user inputs
2. **XSS Prevention**: Escape user-generated content
3. **CSRF Protection**: Include CSRF tokens in form submissions
4. **Secure Defaults**: Use secure defaults for all configurations

## Related Documentation

- [UI Components](./ui-components.md) - Base UI component reference
- [Form Components](./form-components.md) - Form handling patterns
- [Validation Service](../../backend/services/validation.md) - Server-side validation
- [Authentication API](../../api/authentication.md) - Authentication endpoints
- [Security Guide](../../security/authentication/jwt-security.md) - Authentication security