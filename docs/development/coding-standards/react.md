# React Coding Standards

This document outlines the React and Next.js coding standards and best practices for the Kavach project. These guidelines ensure consistent, performant, and maintainable React components across the application.

## Table of Contents

- [General Principles](#general-principles)
- [Component Structure](#component-structure)
- [Hooks and State Management](#hooks-and-state-management)
- [Props and TypeScript](#props-and-typescript)
- [Event Handling](#event-handling)
- [Performance Optimization](#performance-optimization)
- [Next.js Specific Patterns](#nextjs-specific-patterns)
- [Examples](#examples)

## General Principles

### 1. Functional Components Only

Use functional components with hooks instead of class components.

```tsx
// ✅ Good - Functional component
interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="user-profile">
      {/* Component content */}
    </div>
  );
};

// ❌ Bad - Class component
class UserProfile extends React.Component<UserProfileProps> {
  // Avoid class components
}
```

### 2. TypeScript First

All React components must be fully typed with TypeScript.

```tsx
// ✅ Good - Fully typed component
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  className = ''
}) => {
  // Implementation
};
```

### 3. Composition Over Inheritance

Favor composition patterns and render props over complex inheritance hierarchies.

```tsx
// ✅ Good - Composition pattern
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, error, required, children }) => (
  <div className="form-field">
    <label className={required ? 'required' : ''}>
      {label}
      {children}
    </label>
    {error && <span className="error">{error}</span>}
  </div>
);

// Usage
<FormField label="Email" error={errors.email} required>
  <Input type="email" value={email} onChange={setEmail} />
</FormField>
```

## Component Structure

### 1. File Organization

Organize components with clear file structure and naming conventions:

```
components/
├── ui/                     # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── index.ts           # Barrel exports
├── custom/                # Feature-specific components
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupWizard.tsx
│   │   └── index.ts
│   └── profile/
│       ├── ProfileForm.tsx
│       └── index.ts
└── index.ts               # Main barrel export
```

### 2. Component Declaration Pattern

Follow a consistent pattern for component declarations:

```tsx
'use client'; // Only when needed for client components

import React, { useState, useCallback, useEffect } from 'react';
import type { User } from '@/types/user';
import { Button, Input } from '@/components/ui';
import { validateEmail } from '@/lib/utils';

// 1. Type definitions
interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  loading?: boolean;
  error?: string;
  className?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

// 2. Component implementation
const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
  error,
  className = ''
}) => {
  // 3. State declarations
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 4. Event handlers
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, [formData, loading, onSubmit]);

  const handleFieldChange = useCallback((field: keyof LoginCredentials, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [fieldErrors]);

  // 5. Effects
  useEffect(() => {
    // Validation or side effects
  }, [formData]);

  // 6. Render
  return (
    <form onSubmit={handleSubmit} className={`login-form ${className}`}>
      {/* Component JSX */}
    </form>
  );
};

// 7. Default export
export default LoginForm;

// 8. Named exports if needed
export type { LoginFormProps, LoginCredentials };
```

### 3. Props Interface Design

Design clear, well-documented props interfaces:

```tsx
// ✅ Good - Clear props interface
interface DataTableProps<T> {
  /** Array of data items to display */
  data: T[];
  /** Column definitions for the table */
  columns: ColumnDefinition<T>[];
  /** Loading state indicator */
  loading?: boolean;
  /** Error message to display */
  error?: string;
  /** Callback when row is selected */
  onRowSelect?: (item: T) => void;
  /** Callback when data needs to be refreshed */
  onRefresh?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Pagination configuration */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

// ✅ Good - Optional props with defaults
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick
}) => {
  // Implementation
};
```

## Hooks and State Management

### 1. useState Patterns

Use useState effectively with proper typing and initialization:

```tsx
// ✅ Good - Typed state with proper initialization
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(false);
const [errors, setErrors] = useState<Record<string, string>>({});

// ✅ Good - Complex state with interface
interface FormState {
  data: FormData;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

const [formState, setFormState] = useState<FormState>({
  data: { email: '', password: '' },
  errors: {},
  touched: {},
  isSubmitting: false
});

// ✅ Good - State updates with functional updates
const updateFormField = useCallback((field: string, value: string) => {
  setFormState(prev => ({
    ...prev,
    data: { ...prev.data, [field]: value },
    errors: { ...prev.errors, [field]: '' } // Clear error
  }));
}, []);
```

### 2. useEffect Best Practices

Use useEffect properly with correct dependencies and cleanup:

```tsx
// ✅ Good - Effect with proper dependencies
useEffect(() => {
  const fetchUser = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const userData = await userService.getUser(userId);
      setUser(userData);
    } catch (error) {
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  fetchUser();
}, [userId]); // Proper dependency

// ✅ Good - Effect with cleanup
useEffect(() => {
  const controller = new AbortController();
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data', {
        signal: controller.signal
      });
      const data = await response.json();
      setData(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError('Failed to fetch data');
      }
    }
  };

  fetchData();

  return () => {
    controller.abort(); // Cleanup
  };
}, []);
```

### 3. Custom Hooks

Create reusable custom hooks for shared logic:

```tsx
// ✅ Good - Custom hook for form validation
interface UseFormValidationOptions<T> {
  initialData: T;
  validationSchema: ValidationSchema<T>;
  onSubmit: (data: T) => Promise<void>;
}

function useFormValidation<T extends Record<string, any>>({
  initialData,
  validationSchema,
  onSubmit
}: UseFormValidationOptions<T>) {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  }, [errors]);

  const validateField = useCallback((field: keyof T) => {
    const fieldValue = data[field];
    const fieldSchema = validationSchema[field];
    
    if (fieldSchema) {
      const result = fieldSchema.safeParse(fieldValue);
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message || 'Invalid value';
        setErrors(prev => ({ ...prev, [field as string]: errorMessage }));
        return false;
      }
    }
    
    setErrors(prev => ({ ...prev, [field as string]: '' }));
    return true;
  }, [data, validationSchema]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Validate all fields
      const isValid = Object.keys(data).every(field => validateField(field as keyof T));
      
      if (!isValid) return;
      
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [data, isSubmitting, onSubmit, validateField]);

  return {
    data,
    errors,
    touched,
    isSubmitting,
    updateField,
    validateField,
    handleSubmit,
    setTouched
  };
}

// Usage
const MyForm: React.FC = () => {
  const {
    data,
    errors,
    updateField,
    handleSubmit,
    isSubmitting
  } = useFormValidation({
    initialData: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (data) => {
      await authService.login(data);
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

## Props and TypeScript

### 1. Props Validation and Defaults

Use TypeScript interfaces with default values for props:

```tsx
// ✅ Good - Props with defaults and validation
interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  message,
  dismissible = false,
  onDismiss,
  className = '',
  children
}) => {
  const baseClasses = 'alert';
  const variantClasses = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error'
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {title && <h4 className="alert-title">{title}</h4>}
      <p className="alert-message">{message}</p>
      {children}
      {dismissible && onDismiss && (
        <button onClick={onDismiss} className="alert-dismiss">
          ×
        </button>
      )}
    </div>
  );
};
```

### 2. Generic Components

Create reusable generic components with proper type constraints:

```tsx
// ✅ Good - Generic component with constraints
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T extends SelectOption> {
  options: T[];
  value?: T['value'];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: T['value'], option: T) => void;
  renderOption?: (option: T) => React.ReactNode;
  className?: string;
}

function Select<T extends SelectOption>({
  options,
  value,
  placeholder = 'Select an option',
  disabled = false,
  onChange,
  renderOption,
  className = ''
}: SelectProps<T>) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    const selectedOption = options.find(option => option.value === selectedValue);
    
    if (selectedOption) {
      onChange(selectedValue as T['value'], selectedOption);
    }
  };

  return (
    <select
      value={value || ''}
      onChange={handleChange}
      disabled={disabled}
      className={`select ${className}`}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {renderOption ? renderOption(option) : option.label}
        </option>
      ))}
    </select>
  );
}
```

## Event Handling

### 1. Event Handler Patterns

Use proper event handler patterns with TypeScript:

```tsx
// ✅ Good - Typed event handlers
interface FormProps {
  onSubmit: (data: FormData) => Promise<void>;
}

const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });

  // Form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  }, [formData, onSubmit]);

  // Input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Button click handler
  const handleButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Handle button click
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
      />
      <button type="button" onClick={handleButtonClick}>
        Action
      </button>
      <button type="submit">Submit</button>
    </form>
  );
};
```

### 2. Debounced Event Handlers

Implement debounced handlers for performance:

```tsx
// ✅ Good - Debounced search input
import { useMemo, useCallback, useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface SearchInputProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  placeholder = 'Search...',
  debounceMs = 300
}) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder={placeholder}
      className="search-input"
    />
  );
};
```

## Performance Optimization

### 1. React.memo and useMemo

Use React.memo and useMemo for performance optimization:

```tsx
// ✅ Good - Memoized component
interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

const UserCard = React.memo<UserCardProps>(({ user, onEdit, onDelete }) => {
  const handleEdit = useCallback(() => {
    onEdit(user);
  }, [user, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(user.id);
  }, [user.id, onDelete]);

  const displayName = useMemo(() => {
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user.firstName, user.lastName]);

  return (
    <div className="user-card">
      <h3>{displayName}</h3>
      <p>{user.email}</p>
      <div className="actions">
        <button onClick={handleEdit}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
});

UserCard.displayName = 'UserCard';
```

### 2. Lazy Loading Components

Implement lazy loading for code splitting:

```tsx
// ✅ Good - Lazy loaded components
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui';

// Lazy load heavy components
const UserManagement = lazy(() => import('@/components/admin/UserManagement'));
const ReportsPanel = lazy(() => import('@/components/admin/ReportsPanel'));

interface AdminDashboardProps {
  activeTab: 'users' | 'reports';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab }) => {
  return (
    <div className="admin-dashboard">
      <Suspense fallback={<LoadingSpinner />}>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'reports' && <ReportsPanel />}
      </Suspense>
    </div>
  );
};
```

## Next.js Specific Patterns

### 1. Client vs Server Components

Properly distinguish between client and server components:

```tsx
// ✅ Server Component (default)
import { userService } from '@/lib/services';
import UserProfile from './UserProfile';

interface UserPageProps {
  params: { id: string };
}

// Server component - can access server-side data
export default async function UserPage({ params }: UserPageProps) {
  const user = await userService.getUser(params.id);
  
  return (
    <div>
      <h1>User Profile</h1>
      <UserProfile user={user} />
    </div>
  );
}

// ✅ Client Component
'use client';

import { useState, useCallback } from 'react';
import type { User } from '@/types/user';

interface UserProfileProps {
  user: User;
}

// Client component - can use hooks and browser APIs
export default function UserProfile({ user }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  return (
    <div className="user-profile">
      {/* Interactive content */}
    </div>
  );
}
```

### 2. Form Handling with Server Actions

Use Server Actions for form handling:

```tsx
// ✅ Server Action
import { redirect } from 'next/navigation';
import { userService } from '@/lib/services';

export async function updateUserAction(formData: FormData) {
  const userId = formData.get('userId') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;

  await userService.updateUser(userId, { firstName, lastName });
  
  redirect('/profile');
}

// ✅ Client Component using Server Action
'use client';

import { updateUserAction } from './actions';
import { Button, Input } from '@/components/ui';

interface UserFormProps {
  user: User;
}

export default function UserForm({ user }: UserFormProps) {
  return (
    <form action={updateUserAction}>
      <input type="hidden" name="userId" value={user.id} />
      
      <Input
        name="firstName"
        defaultValue={user.firstName}
        placeholder="First Name"
        required
      />
      
      <Input
        name="lastName"
        defaultValue={user.lastName}
        placeholder="Last Name"
        required
      />
      
      <Button type="submit">Update Profile</Button>
    </form>
  );
}
```

## Examples

### 1. Complete Form Component

```tsx
'use client';

import React, { useState, useCallback } from 'react';
import { Button, Input, Alert } from '@/components/ui';
import { ValidationService } from '@/lib/validation';
import type { LoginFormData } from '@/lib/validation/types';

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
  className?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  loading = false,
  error,
  className = ''
}) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    role: 'customer'
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleFieldChange = useCallback((field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [fieldErrors]);

  const handleFieldBlur = useCallback((field: keyof LoginFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate field on blur
    const validationResult = ValidationService.validateLoginForm(formData);
    if (!validationResult.success && validationResult.errors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: validationResult.errors[field] }));
    }
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    // Mark all fields as touched
    setTouched({ email: true, password: true, role: true });
    
    // Validate form
    const validationResult = ValidationService.validateLoginForm(formData);
    if (!validationResult.success) {
      setFieldErrors(validationResult.errors);
      return;
    }
    
    try {
      await onSubmit(validationResult.data);
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, [formData, loading, onSubmit]);

  const isFormValid = !Object.values(fieldErrors).some(error => error) &&
    formData.email && formData.password;

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive" message={error} />
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          onBlur={() => handleFieldBlur('email')}
          required
          autoComplete="email"
          placeholder="Enter your email address"
          className={touched.email && fieldErrors.email ? 'border-red-500' : ''}
        />
        {touched.email && fieldErrors.email && (
          <p className="text-sm text-red-500">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => handleFieldChange('password', e.target.value)}
          onBlur={() => handleFieldBlur('password')}
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          className={touched.password && fieldErrors.password ? 'border-red-500' : ''}
        />
        {touched.password && fieldErrors.password && (
          <p className="text-sm text-red-500">{fieldErrors.password}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!isFormValid || loading}
        loading={loading}
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;
```

## Best Practices Summary

1. **Use functional components** with hooks instead of class components
2. **Type everything** with TypeScript interfaces and proper prop types
3. **Follow consistent patterns** for component structure and organization
4. **Optimize performance** with React.memo, useMemo, and useCallback when needed
5. **Handle events properly** with typed event handlers and proper cleanup
6. **Use composition** over inheritance for component design
7. **Implement proper error boundaries** and error handling
8. **Follow Next.js patterns** for client/server component distinction
9. **Write reusable components** with clear, well-documented APIs
10. **Test your components** with comprehensive unit and integration tests

---

*These standards evolve with React and Next.js best practices. Please suggest improvements and updates as the ecosystem changes.*