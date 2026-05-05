# Testing Standards

This document outlines the testing standards and best practices for the Kavach project. We use Vitest as our primary testing framework with comprehensive coverage requirements and testing strategies.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Framework Setup](#testing-framework-setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [Component Testing](#component-testing)
- [API Testing](#api-testing)
- [Test Organization](#test-organization)
- [Coverage Requirements](#coverage-requirements)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Testing Philosophy

### 1. Test Pyramid

We follow the test pyramid approach with emphasis on:

- **Unit Tests (70%)**: Fast, isolated tests for individual functions and components
- **Integration Tests (20%)**: Tests for component interactions and API endpoints
- **End-to-End Tests (10%)**: Critical user journey testing

### 2. Testing Principles

- **Write tests first** (TDD approach when possible)
- **Test behavior, not implementation** details
- **Keep tests simple and focused** on single concerns
- **Make tests readable** with clear descriptions and arrange-act-assert pattern
- **Ensure tests are deterministic** and can run in any order

## Testing Framework Setup

### 1. Vitest Configuration

Our Vitest setup includes:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    coverage: {
      provider: 'istanbul',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'src/app/**',
        'src/lib/database/migrations/**'
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 70,
        functions: 75
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

### 2. Test Setup File

```typescript
// src/test/setup.ts
import { vi } from 'vitest';

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: console.warn,
  error: console.error
};

// Mock fetch globally
global.fetch = vi.fn();

// Setup test database or other global mocks here
```

## Unit Testing

### 1. Function Testing

Test pure functions with clear inputs and outputs:

```typescript
// src/lib/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, sanitizeInput } from '../validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('should return true for strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password1',
        'Complex#Pass99'
      ];

      strongPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true);
      });
    });

    it('should return false for weak passwords', () => {
      const weakPasswords = [
        'weak',
        '12345678',
        'password',
        'PASSWORD',
        'Pass123' // too short
      ];

      weakPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false);
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const expected = 'Hello World';
      
      expect(sanitizeInput(input)).toBe(expected);
    });

    it('should preserve safe content', () => {
      const input = 'Hello World! This is safe content.';
      
      expect(sanitizeInput(input)).toBe(input);
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });
  });
});
```

### 2. Class Testing

Test classes with proper setup and teardown:

```typescript
// src/lib/services/auth/authentication.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthenticationService } from '../authentication.service';
import { userRepository } from '../../database/repositories/user-repository';
import { emailService } from '../../email/email-service';

// Mock dependencies
vi.mock('../../database/repositories/user-repository');
vi.mock('../../email/email-service');

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  let mockUserRepository: any;
  let mockEmailService: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mock implementations
    mockUserRepository = vi.mocked(userRepository);
    mockEmailService = vi.mocked(emailService);
    
    authService = new AuthenticationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signup', () => {
    const validSignupData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'StrongPass123!',
      role: 'customer' as const
    };

    const mockContext = {
      correlationId: 'test-correlation-id',
      clientIP: '127.0.0.1',
      timestamp: new Date()
    };

    it('should successfully create a new user', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-123',
        ...validSignupData,
        passwordHash: 'hashed-password',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

      // Act
      const result = await authService.signup(validSignupData, mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(validSignupData.email);
      expect(result.data?.requiresVerification).toBe(true);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validSignupData.email,
          firstName: validSignupData.firstName,
          lastName: validSignupData.lastName,
          role: validSignupData.role
        })
      );
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should reject signup for existing email', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'existing-user',
        email: validSignupData.email
      });

      // Act
      const result = await authService.signup(validSignupData, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData = {
        ...validSignupData,
        email: 'invalid-email'
      };

      // Act
      const result = await authService.signup(invalidData, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'StrongPass123!'
    };

    const mockUser = {
      id: 'user-123',
      email: validLoginData.email,
      passwordHash: 'hashed-password',
      role: 'customer',
      isEmailVerified: true,
      isBanned: false,
      isPaused: false
    };

    const mockContext = {
      correlationId: 'test-correlation-id',
      clientIP: '127.0.0.1',
      timestamp: new Date()
    };

    it('should successfully authenticate valid credentials', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      
      // Mock password verification
      const mockVerifyPassword = vi.fn().mockResolvedValue(true);
      vi.doMock('../../auth/password-utils', () => ({
        verifyPassword: mockVerifyPassword
      }));

      // Act
      const result = await authService.login(validLoginData, mockContext);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe(validLoginData.email);
      expect(result.data?.accessToken).toBeDefined();
      expect(result.data?.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await authService.login(validLoginData, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject banned users', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isBanned: true
      });

      // Act
      const result = await authService.login(validLoginData, mockContext);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_ERROR');
    });
  });
});
```

## Integration Testing

### 1. Database Integration Tests

Test database operations with real database connections:

```typescript
// src/lib/database/repositories/user-repository.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../connection';
import { UserRepository } from '../user-repository';
import { users } from '../schema';

describe('UserRepository Integration', () => {
  let userRepository: UserRepository;

  beforeAll(async () => {
    // Setup test database connection
    userRepository = new UserRepository();
  });

  afterAll(async () => {
    // Cleanup database connection
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(users);
  });

  describe('create', () => {
    it('should create a new user in the database', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashed-password',
        role: 'customer' as const
      };

      // Act
      const createdUser = await userRepository.create(userData);

      // Assert
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.firstName).toBe(userData.firstName);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'duplicate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashed-password',
        role: 'customer' as const
      };

      await userRepository.create(userData);

      // Act & Assert
      await expect(userRepository.create(userData)).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const userData = {
        email: 'findme@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        passwordHash: 'hashed-password',
        role: 'expert' as const
      };

      const createdUser = await userRepository.create(userData);

      // Act
      const foundUser = await userRepository.findByEmail(userData.email);

      // Assert
      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should return null for non-existent email', async () => {
      // Act
      const foundUser = await userRepository.findByEmail('nonexistent@example.com');

      // Assert
      expect(foundUser).toBeNull();
    });
  });
});
```

## Component Testing

### 1. React Component Testing

Test React components with proper rendering and interaction:

```typescript
// src/components/custom/auth/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form fields correctly', () => {
    // Arrange & Act
    render(
      <LoginForm
        role="customer"
        onSubmit={mockOnSubmit}
      />
    );

    // Assert
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should validate email field on blur', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <LoginForm
        role="customer"
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = screen.getByLabelText(/email address/i);

    // Act
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    // Arrange
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <LoginForm
        role="customer"
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Act
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'StrongPass123!');
    await user.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongPass123!',
        role: 'customer'
      });
    });
  });

  it('should display loading state during submission', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <LoginForm
        role="customer"
        onSubmit={mockOnSubmit}
        loading={true}
      />
    );

    // Assert
    expect(screen.getByText(/please wait/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should display error message', () => {
    // Arrange & Act
    render(
      <LoginForm
        role="customer"
        onSubmit={mockOnSubmit}
        error="Invalid credentials"
      />
    );

    // Assert
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('should clear field errors when user starts typing', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <LoginForm
        role="customer"
        onSubmit={mockOnSubmit}
        error={{
          details: {
            validationErrors: [
              { field: 'email', message: 'Email is required' }
            ]
          }
        }}
      />
    );

    const emailInput = screen.getByLabelText(/email address/i);

    // Verify error is displayed
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();

    // Act
    await user.type(emailInput, 'test@example.com');

    // Assert
    await waitFor(() => {
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });
});
```

## API Testing

### 1. API Route Testing

Test Next.js API routes with proper request/response handling:

```typescript
// src/app/(backend)/api/v1/auth/login/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { authenticationService } from '@/lib/services/auth';

// Mock the authentication service
vi.mock('@/lib/services/auth');

describe('/api/v1/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully authenticate valid credentials', async () => {
    // Arrange
    const mockAuthService = vi.mocked(authenticationService);
    mockAuthService.login.mockResolvedValue({
      success: true,
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'customer'
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }
    });

    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Real-IP': '127.0.0.1'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'StrongPass123!'
      })
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.accessToken).toBe('mock-access-token');
    expect(data.refreshToken).toBe('mock-refresh-token');
  });

  it('should return 400 for invalid request body', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'invalid-email',
        // missing password
      })
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 401 for invalid credentials', async () => {
    // Arrange
    const mockAuthService = vi.mocked(authenticationService);
    mockAuthService.login.mockResolvedValue({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid credentials',
        statusCode: 401
      }
    });

    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Real-IP': '127.0.0.1'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrong-password'
      })
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid credentials');
  });

  it('should handle rate limiting', async () => {
    // Arrange
    const mockAuthService = vi.mocked(authenticationService);
    mockAuthService.login.mockResolvedValue({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts',
        statusCode: 429,
        retryAfter: 900
      }
    });

    const request = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Real-IP': '127.0.0.1'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(response.headers.get('Retry-After')).toBe('900');
  });
});
```

## Test Organization

### 1. File Structure

Organize tests alongside source files or in dedicated test directories:

```
src/
├── lib/
│   ├── auth/
│   │   ├── jwt-utils.ts
│   │   ├── jwt-utils.test.ts
│   │   └── __tests__/
│   │       ├── middleware.test.ts
│   │       └── session-manager.test.ts
│   ├── services/
│   │   ├── auth/
│   │   │   ├── authentication.service.ts
│   │   │   └── __tests__/
│   │   │       └── authentication.service.test.ts
│   └── database/
│       └── repositories/
│           ├── user-repository.ts
│           └── __tests__/
│               └── user-repository.test.ts
└── components/
    └── custom/
        └── auth/
            ├── LoginForm.tsx
            └── LoginForm.test.tsx
```

### 2. Test Naming Conventions

Use descriptive test names that explain the scenario:

```typescript
describe('AuthenticationService', () => {
  describe('login', () => {
    it('should successfully authenticate user with valid credentials', () => {});
    it('should reject login attempt with invalid email format', () => {});
    it('should reject login attempt with incorrect password', () => {});
    it('should reject login attempt for banned user account', () => {});
    it('should reject login attempt for unverified email address', () => {});
    it('should apply rate limiting after multiple failed attempts', () => {});
  });
});
```

## Coverage Requirements

### 1. Coverage Thresholds

Maintain high test coverage with these minimum requirements:

- **Lines**: 80%
- **Statements**: 80%
- **Branches**: 70%
- **Functions**: 75%

### 2. Coverage Commands

```bash
# Run tests with coverage
bun run test:coverage

# View coverage report
open coverage/index.html

# Check coverage thresholds
bun run test -- --coverage --reporter=verbose
```

### 3. Coverage Exclusions

Exclude certain files from coverage requirements:

- Configuration files
- Database migrations
- Type definition files
- Test setup files
- Next.js app directory (UI components)

## Best Practices

### 1. Test Structure (AAA Pattern)

Use Arrange-Act-Assert pattern for clear test structure:

```typescript
it('should create user with valid data', async () => {
  // Arrange
  const userData = {
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'StrongPass123!'
  };
  
  mockUserRepository.findByEmail.mockResolvedValue(null);
  mockUserRepository.create.mockResolvedValue({
    id: 'user-123',
    ...userData,
    createdAt: new Date()
  });

  // Act
  const result = await userService.createUser(userData);

  // Assert
  expect(result.success).toBe(true);
  expect(result.data.email).toBe(userData.email);
  expect(mockUserRepository.create).toHaveBeenCalledWith(
    expect.objectContaining(userData)
  );
});
```

### 2. Mock Management

Properly manage mocks with setup and cleanup:

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

// Mock at module level
vi.mock('@/lib/database/repositories/user-repository');

describe('UserService', () => {
  let mockUserRepository: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup fresh mock instances
    mockUserRepository = vi.mocked(userRepository);
  });

  afterEach(() => {
    // Restore original implementations
    vi.restoreAllMocks();
  });
});
```

### 3. Async Testing

Handle async operations properly in tests:

```typescript
it('should handle async operations correctly', async () => {
  // Use async/await for promises
  const result = await asyncFunction();
  expect(result).toBeDefined();

  // Wait for async effects
  await waitFor(() => {
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  // Test promise rejections
  await expect(failingFunction()).rejects.toThrow('Expected error');
});
```

### 4. Error Testing

Test error conditions and edge cases:

```typescript
describe('error handling', () => {
  it('should handle network errors gracefully', async () => {
    // Arrange
    mockFetch.mockRejectedValue(new Error('Network error'));

    // Act
    const result = await apiCall();

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should validate input parameters', () => {
    expect(() => validateInput(null)).toThrow('Input cannot be null');
    expect(() => validateInput('')).toThrow('Input cannot be empty');
  });
});
```

## Examples

### 1. Complete Service Test

```typescript
// src/lib/services/user/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '../user.service';
import { userRepository } from '../../database/repositories/user-repository';
import { ValidationError, NotFoundError } from '../../errors/custom-errors';

vi.mock('../../database/repositories/user-repository');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepository = vi.mocked(userRepository);
    userService = new UserService();
  });

  describe('createUser', () => {
    const validUserData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'StrongPass123!',
      role: 'customer' as const
    };

    it('should create user successfully with valid data', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'user-123',
        ...validUserData,
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Act
      const result = await userService.createUser(validUserData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(result.email).toBe(validUserData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validUserData.email,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          passwordHash: expect.any(String)
        })
      );
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const invalidData = { ...validUserData, email: 'invalid-email' };

      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate email', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'existing-user',
        email: validUserData.email
      });

      // Act & Assert
      await expect(userService.createUser(validUserData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('updateUser', () => {
    const userId = 'user-123';
    const updateData = {
      firstName: 'Jane',
      lastName: 'Smith'
    };

    it('should update user successfully', async () => {
      // Arrange
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        ...updateData,
        updatedAt: new Date()
      });

      // Act
      const result = await userService.updateUser(userId, updateData);

      // Assert
      expect(result.firstName).toBe(updateData.firstName);
      expect(result.lastName).toBe(updateData.lastName);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          ...updateData,
          updatedAt: expect.any(Date)
        })
      );
    });

    it('should throw NotFoundError for non-existent user', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUser(userId, updateData))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
```

## Testing Commands

### 1. Basic Commands

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run tests with UI
bun run test:ui

# Run specific test file
bun run test src/lib/auth/jwt-utils.test.ts

# Run tests matching pattern
bun run test --grep "authentication"
```

### 2. CI/CD Integration

```bash
# Run tests in CI mode
bun run test --run --coverage --reporter=verbose

# Generate coverage reports
bun run test:coverage --reporter=json --reporter=html

# Check coverage thresholds
bun run test --coverage --reporter=text-summary
```

## Summary

1. **Follow the test pyramid** with emphasis on unit tests
2. **Maintain high coverage** with minimum 80% lines and statements
3. **Use descriptive test names** that explain the scenario
4. **Structure tests clearly** with Arrange-Act-Assert pattern
5. **Mock dependencies properly** with setup and cleanup
6. **Test error conditions** and edge cases thoroughly
7. **Keep tests fast and isolated** to enable quick feedback
8. **Write tests first** when possible (TDD approach)
9. **Test behavior, not implementation** details
10. **Maintain tests** as code evolves

---

*These testing standards ensure code quality and reliability. Please follow them consistently and suggest improvements as needed.*