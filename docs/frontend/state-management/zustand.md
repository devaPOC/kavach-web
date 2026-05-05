# State Management with Zustand

## Overview

Kavach uses **Zustand** for client-side state management, providing a lightweight, TypeScript-friendly solution for managing application state. The architecture emphasizes simplicity, performance, and developer experience while maintaining type safety throughout the application.

## Why Zustand?

- **Lightweight**: Minimal bundle size (~2.5kb gzipped)
- **TypeScript-first**: Excellent TypeScript support out of the box
- **No boilerplate**: Simple API without reducers or actions
- **React integration**: Seamless integration with React hooks
- **DevTools support**: Built-in Redux DevTools integration
- **SSR compatible**: Works well with Next.js server-side rendering

## Basic Store Setup

### Creating a Store

```typescript
// src/lib/stores/auth-store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'expert' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // Actions
        setUser: (user) => set(
          { user, isAuthenticated: !!user },
          false,
          'auth/setUser'
        ),

        setLoading: (isLoading) => set(
          { isLoading },
          false,
          'auth/setLoading'
        ),

        setError: (error) => set(
          { error },
          false,
          'auth/setError'
        ),

        login: async (credentials) => {
          set({ isLoading: true, error: null }, false, 'auth/login/start');
          
          try {
            const response = await authApi.login(credentials);
            
            if (response.success) {
              set({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null
              }, false, 'auth/login/success');
            } else {
              set({
                error: response.error || 'Login failed',
                isLoading: false
              }, false, 'auth/login/error');
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Login failed',
              isLoading: false
            }, false, 'auth/login/error');
          }
        },

        logout: () => {
          // Clear auth tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          
          set({
            user: null,
            isAuthenticated: false,
            error: null
          }, false, 'auth/logout');
        },

        clearError: () => set(
          { error: null },
          false,
          'auth/clearError'
        ),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: 'auth-store',
    }
  )
);
```

### Using the Store in Components

```tsx
// src/components/auth/LoginStatus.tsx
'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function LoginStatus() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <Button variant="outline" asChild>
        <a href="/login">Sign In</a>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>
          {user.firstName[0]}{user.lastName[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {user.firstName} {user.lastName}
        </span>
        <span className="text-xs text-muted-foreground">
          {user.role}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={logout}>
        Sign Out
      </Button>
    </div>
  );
}
```

## Advanced Patterns

### Computed Values with Selectors

```typescript
// src/lib/stores/auth-store.ts
export const useAuthStore = create<AuthState>()(/* ... */);

// Selector hooks for computed values
export const useIsAdmin = () => useAuthStore(state => state.user?.role === 'admin');
export const useIsExpert = () => useAuthStore(state => state.user?.role === 'expert');
export const useIsCustomer = () => useAuthStore(state => state.user?.role === 'customer');

export const useUserDisplayName = () => useAuthStore(state => {
  if (!state.user) return null;
  return `${state.user.firstName} ${state.user.lastName}`;
});

export const useCanAccessAdmin = () => useAuthStore(state => {
  return state.isAuthenticated && state.user?.role === 'admin';
});

export const useProfileCompletionStatus = () => useAuthStore(state => {
  if (!state.user) return { completed: false, percentage: 0 };
  
  const fields = [
    state.user.firstName,
    state.user.lastName,
    state.user.email,
    state.user.isEmailVerified,
    state.user.isProfileCompleted,
  ];
  
  const completedFields = fields.filter(Boolean).length;
  const percentage = (completedFields / fields.length) * 100;
  
  return {
    completed: state.user.isProfileCompleted,
    percentage: Math.round(percentage),
  };
});
```

### Store Composition

```typescript
// src/lib/stores/ui-store.ts
interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  notifications: Notification[];
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        theme: 'system',
        sidebarOpen: false,
        notifications: [],

        setTheme: (theme) => set({ theme }, false, 'ui/setTheme'),
        
        toggleSidebar: () => set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'ui/toggleSidebar'
        ),

        addNotification: (notification) => set(
          (state) => ({
            notifications: [
              ...state.notifications,
              { ...notification, id: crypto.randomUUID() }
            ]
          }),
          false,
          'ui/addNotification'
        ),

        removeNotification: (id) => set(
          (state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }),
          false,
          'ui/removeNotification'
        ),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: 'ui-store' }
  )
);

// src/lib/stores/form-store.ts
interface FormState {
  formData: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  
  setFieldValue: (field: string, value: any) => void;
  setFieldError: (field: string, error: string) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
  setSubmitting: (submitting: boolean) => void;
  resetForm: () => void;
}

export const useFormStore = create<FormState>()(
  devtools(
    (set, get) => ({
      formData: {},
      errors: {},
      touched: {},
      isSubmitting: false,

      setFieldValue: (field, value) => set(
        (state) => ({
          formData: { ...state.formData, [field]: value },
          errors: { ...state.errors, [field]: '' }, // Clear error on change
        }),
        false,
        'form/setFieldValue'
      ),

      setFieldError: (field, error) => set(
        (state) => ({
          errors: { ...state.errors, [field]: error }
        }),
        false,
        'form/setFieldError'
      ),

      setFieldTouched: (field, touched) => set(
        (state) => ({
          touched: { ...state.touched, [field]: touched }
        }),
        false,
        'form/setFieldTouched'
      ),

      setSubmitting: (isSubmitting) => set(
        { isSubmitting },
        false,
        'form/setSubmitting'
      ),

      resetForm: () => set(
        {
          formData: {},
          errors: {},
          touched: {},
          isSubmitting: false,
        },
        false,
        'form/resetForm'
      ),
    }),
    { name: 'form-store' }
  )
);
```

### Async Actions with Error Handling

```typescript
// src/lib/stores/user-store.ts
interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  
  fetchUsers: () => Promise<void>;
  fetchUser: (id: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      users: [],
      currentUser: null,
      isLoading: false,
      error: null,

      fetchUsers: async () => {
        set({ isLoading: true, error: null }, false, 'users/fetchUsers/start');
        
        try {
          const response = await userApi.getUsers();
          
          if (response.success) {
            set({
              users: response.data,
              isLoading: false,
              error: null,
            }, false, 'users/fetchUsers/success');
          } else {
            set({
              error: response.error || 'Failed to fetch users',
              isLoading: false,
            }, false, 'users/fetchUsers/error');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch users',
            isLoading: false,
          }, false, 'users/fetchUsers/error');
        }
      },

      fetchUser: async (id) => {
        set({ isLoading: true, error: null }, false, 'users/fetchUser/start');
        
        try {
          const response = await userApi.getUser(id);
          
          if (response.success) {
            set({
              currentUser: response.data,
              isLoading: false,
              error: null,
            }, false, 'users/fetchUser/success');
          } else {
            set({
              error: response.error || 'Failed to fetch user',
              isLoading: false,
            }, false, 'users/fetchUser/error');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch user',
            isLoading: false,
          }, false, 'users/fetchUser/error');
        }
      },

      updateUser: async (id, data) => {
        set({ isLoading: true, error: null }, false, 'users/updateUser/start');
        
        try {
          const response = await userApi.updateUser(id, data);
          
          if (response.success) {
            const updatedUser = response.data;
            
            set((state) => ({
              users: state.users.map(user => 
                user.id === id ? updatedUser : user
              ),
              currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
              isLoading: false,
              error: null,
            }), false, 'users/updateUser/success');
          } else {
            set({
              error: response.error || 'Failed to update user',
              isLoading: false,
            }, false, 'users/updateUser/error');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update user',
            isLoading: false,
          }, false, 'users/updateUser/error');
        }
      },

      deleteUser: async (id) => {
        set({ isLoading: true, error: null }, false, 'users/deleteUser/start');
        
        try {
          const response = await userApi.deleteUser(id);
          
          if (response.success) {
            set((state) => ({
              users: state.users.filter(user => user.id !== id),
              currentUser: state.currentUser?.id === id ? null : state.currentUser,
              isLoading: false,
              error: null,
            }), false, 'users/deleteUser/success');
          } else {
            set({
              error: response.error || 'Failed to delete user',
              isLoading: false,
            }, false, 'users/deleteUser/error');
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete user',
            isLoading: false,
          }, false, 'users/deleteUser/error');
        }
      },
    }),
    { name: 'user-store' }
  )
);
```

## React Integration Patterns

### Custom Hooks for Store Logic

```typescript
// src/lib/hooks/use-auth.ts
import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const authStore = useAuthStore();
  
  return {
    ...authStore,
    isAdmin: authStore.user?.role === 'admin',
    isExpert: authStore.user?.role === 'expert',
    isCustomer: authStore.user?.role === 'customer',
    displayName: authStore.user 
      ? `${authStore.user.firstName} ${authStore.user.lastName}`
      : null,
  };
}

export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isAuthenticated, isLoading };
}

export function useRequireRole(requiredRole: string, redirectTo = '/unauthorized') {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== requiredRole)) {
      router.push(redirectTo);
    }
  }, [user, isAuthenticated, isLoading, requiredRole, router, redirectTo]);

  return { hasAccess: isAuthenticated && user?.role === requiredRole };
}
```

### Component Integration Examples

```tsx
// src/components/dashboard/UserDashboard.tsx
'use client';

import { useAuth, useRequireAuth } from '@/lib/hooks/use-auth';
import { useUserStore } from '@/lib/stores/user-store';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function UserDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const { user, displayName } = useAuth();
  const { users, isLoading: usersLoading, fetchUsers } = useUserStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, fetchUsers]);

  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useRequireAuth
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {displayName}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Role: {user?.role}</p>
          <p>Email verified: {user?.isEmailVerified ? 'Yes' : 'No'}</p>
          <p>Profile completed: {user?.isProfileCompleted ? 'Yes' : 'No'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <p>Loading users...</p>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <div key={user.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{user.firstName} {user.lastName}</span>
                  <span className="text-sm text-muted-foreground">{user.role}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Form Integration

```tsx
// src/components/forms/UserForm.tsx
'use client';

import { useFormStore } from '@/lib/stores/form-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';

interface UserFormProps {
  userId?: string;
  onSuccess?: () => void;
}

export function UserForm({ userId, onSuccess }: UserFormProps) {
  const {
    formData,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setSubmitting,
    resetForm,
  } = useFormStore();

  const { updateUser, fetchUser, currentUser } = useUserStore();

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
    return () => resetForm();
  }, [userId, fetchUser, resetForm]);

  useEffect(() => {
    if (currentUser && userId) {
      setFieldValue('firstName', currentUser.firstName);
      setFieldValue('lastName', currentUser.lastName);
      setFieldValue('email', currentUser.email);
    }
  }, [currentUser, userId, setFieldValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) return;
    
    setSubmitting(true);
    
    try {
      await updateUser(userId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });
      
      onSuccess?.();
    } catch (error) {
      setFieldError('general', 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          value={formData.firstName || ''}
          onChange={(e) => setFieldValue('firstName', e.target.value)}
          onBlur={() => setFieldTouched('firstName', true)}
          className={touched.firstName && errors.firstName ? 'border-red-500' : ''}
        />
        {touched.firstName && errors.firstName && (
          <p className="text-sm text-red-500">{errors.firstName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          value={formData.lastName || ''}
          onChange={(e) => setFieldValue('lastName', e.target.value)}
          onBlur={() => setFieldTouched('lastName', true)}
          className={touched.lastName && errors.lastName ? 'border-red-500' : ''}
        />
        {touched.lastName && errors.lastName && (
          <p className="text-sm text-red-500">{errors.lastName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFieldValue('email', e.target.value)}
          onBlur={() => setFieldTouched('email', true)}
          className={touched.email && errors.email ? 'border-red-500' : ''}
        />
        {touched.email && errors.email && (
          <p className="text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {errors.general && (
        <p className="text-sm text-red-500">{errors.general}</p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Updating...' : 'Update User'}
      </Button>
    </form>
  );
}
```

## Server-Side Rendering (SSR) Considerations

### Hydration-Safe Stores

```typescript
// src/lib/stores/hydration-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HydrationState {
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'hydration-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Custom hook for hydration-safe rendering
export function useHydrated() {
  return useHydrationStore((state) => state.hasHydrated);
}
```

### Client-Only Components

```tsx
// src/components/ClientOnly.tsx
'use client';

import { useHydrated } from '@/lib/stores/hydration-store';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const hasHydrated = useHydrated();

  if (!hasHydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Usage in components
export function UserProfile() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Profile</h1>
      <ClientOnly fallback={<div>Loading profile...</div>}>
        <div>
          <p>Name: {user?.firstName} {user?.lastName}</p>
          <p>Email: {user?.email}</p>
        </div>
      </ClientOnly>
    </div>
  );
}
```

## Testing Stores

### Unit Testing

```typescript
// src/lib/stores/__tests__/auth-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../auth-store';

// Mock API
jest.mock('@/lib/api/auth', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout(); // Reset store
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set user on login success', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'customer' as const,
      isEmailVerified: true,
      isProfileCompleted: true,
      isApproved: true,
    };

    const mockAuthApi = require('@/lib/api/auth').authApi;
    mockAuthApi.login.mockResolvedValue({
      success: true,
      user: mockUser,
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password',
        role: 'customer',
      });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle login error', async () => {
    const mockAuthApi = require('@/lib/api/auth').authApi;
    mockAuthApi.login.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'wrong-password',
        role: 'customer',
      });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('should clear state on logout', () => {
    const { result } = renderHook(() => useAuthStore());

    // Set some state first
    act(() => {
      result.current.setUser({
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true,
      });
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
```

### Integration Testing

```typescript
// src/components/__tests__/UserDashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { UserDashboard } from '../dashboard/UserDashboard';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUserStore } from '@/lib/stores/user-store';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock stores
jest.mock('@/lib/stores/auth-store');
jest.mock('@/lib/stores/user-store');

describe('UserDashboard', () => {
  const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
  const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer',
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true,
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      setUser: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });

    mockUseUserStore.mockReturnValue({
      users: [
        { id: '1', firstName: 'John', lastName: 'Doe', role: 'customer' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', role: 'expert' },
      ],
      currentUser: null,
      isLoading: false,
      error: null,
      fetchUsers: jest.fn(),
      fetchUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    });
  });

  it('should render user dashboard with user info', async () => {
    render(<UserDashboard />);

    expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    expect(screen.getByText('Role: customer')).toBeInTheDocument();
    expect(screen.getByText('Email verified: Yes')).toBeInTheDocument();
    expect(screen.getByText('Profile completed: Yes')).toBeInTheDocument();
  });

  it('should display users list', async () => {
    render(<UserDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Users (2)')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should call fetchUsers on mount', () => {
    const mockFetchUsers = jest.fn();
    mockUseUserStore.mockReturnValue({
      ...mockUseUserStore(),
      fetchUsers: mockFetchUsers,
    });

    render(<UserDashboard />);

    expect(mockFetchUsers).toHaveBeenCalledTimes(1);
  });
});
```

## Best Practices

### Store Organization

1. **Single responsibility**: Each store should handle one domain of state
2. **Flat structure**: Avoid deeply nested state objects
3. **Immutable updates**: Always return new objects/arrays in actions
4. **Type safety**: Use TypeScript interfaces for all state and actions
5. **Action naming**: Use descriptive action names with domain prefixes

### Performance Optimization

1. **Selective subscriptions**: Use selectors to subscribe to specific state slices
2. **Memoization**: Memoize expensive computations in selectors
3. **Batch updates**: Group related state updates together
4. **Avoid unnecessary re-renders**: Use shallow equality checks in selectors

### Error Handling

1. **Consistent error format**: Use consistent error message format across stores
2. **Error boundaries**: Implement error boundaries for store-related errors
3. **Graceful degradation**: Provide fallback states for error conditions
4. **User feedback**: Always provide user-friendly error messages

### Testing Strategy

1. **Unit test stores**: Test store logic in isolation
2. **Integration tests**: Test store integration with components
3. **Mock external dependencies**: Mock API calls and external services
4. **Test error scenarios**: Include tests for error conditions
5. **Snapshot testing**: Use snapshots for complex state structures

## Related Documentation

- [Authentication Components](../components/auth-components.md) - Auth component integration
- [API Client](../../backend/services/api-client.md) - API integration patterns
- [Testing Guide](../../development/coding-standards/testing.md) - Testing best practices
- [TypeScript Guide](../../development/coding-standards/typescript.md) - TypeScript patterns