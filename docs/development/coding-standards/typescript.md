# TypeScript Coding Standards

This document outlines the TypeScript coding standards and best practices for the Kavach project. Following these guidelines ensures consistent, maintainable, and type-safe code across the entire codebase.

## Table of Contents

- [General Principles](#general-principles)
- [Type Definitions](#type-definitions)
- [Code Organization](#code-organization)
- [Naming Conventions](#naming-conventions)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)
- [Examples](#examples)

## General Principles

### 1. Strict Type Safety

We use TypeScript in strict mode with no `any` types allowed. All code must be fully typed.

```typescript
// ✅ Good - Explicit typing
interface User {
  id: string;
  email: string;
  role: 'customer' | 'expert' | 'admin';
  isEmailVerified: boolean;
}

// ❌ Bad - Using any
function processUser(user: any) {
  return user.email;
}

// ✅ Good - Proper typing
function processUser(user: User): string {
  return user.email;
}
```

### 2. Prefer Interfaces Over Types for Object Shapes

Use interfaces for object definitions and types for unions, primitives, and computed types.

```typescript
// ✅ Good - Interface for object shape
interface AuthenticationRequest {
  email: string;
  password: string;
  role?: UserRole;
}

// ✅ Good - Type for unions and computed types
type UserRole = 'customer' | 'expert' | 'admin';
type ServiceResult<T> = { success: true; data: T } | { success: false; error: string };
```

### 3. Use Utility Types

Leverage TypeScript's built-in utility types for better type safety and code reuse.

```typescript
// ✅ Good - Using utility types
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

type CreateUserRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserRequest = Partial<Pick<User, 'firstName' | 'lastName'>>;
type UserResponse = Omit<User, 'passwordHash'>;
```

## Type Definitions

### 1. Interface Naming

Use PascalCase for interfaces and prefix with `I` only when necessary to avoid naming conflicts.

```typescript
// ✅ Good - Clear interface names
interface AuthenticationService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(userId: string): Promise<void>;
}

interface DatabaseConnection {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
}
```

### 2. Generic Type Parameters

Use descriptive single letters or full words for generic type parameters.

```typescript
// ✅ Good - Descriptive generic parameters
interface Repository<TEntity, TKey = string> {
  findById(id: TKey): Promise<TEntity | null>;
  create(entity: Omit<TEntity, 'id'>): Promise<TEntity>;
  update(id: TKey, updates: Partial<TEntity>): Promise<TEntity>;
  delete(id: TKey): Promise<void>;
}

interface ServiceResult<TData = unknown, TError = string> {
  success: boolean;
  data?: TData;
  error?: TError;
}
```

### 3. Enum Usage

Prefer const assertions or union types over enums for better tree-shaking and type safety.

```typescript
// ✅ Good - Union types
type UserRole = 'customer' | 'expert' | 'admin';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// ✅ Good - Const assertions for objects
const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND'
} as const;

type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// ❌ Avoid - Regular enums (unless needed for reverse mapping)
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
```

## Code Organization

### 1. File Structure

Organize TypeScript files with clear separation of concerns:

```typescript
// types.ts - Type definitions
export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'customer' | 'expert' | 'admin';

// service.ts - Implementation
import type { User, UserRole } from './types';

export class UserService {
  async findById(id: string): Promise<User | null> {
    // Implementation
  }
}

// index.ts - Public API
export { UserService } from './service';
export type { User, UserRole } from './types';
```

### 2. Import/Export Patterns

Use consistent import/export patterns throughout the codebase:

```typescript
// ✅ Good - Type-only imports when appropriate
import type { User, UserRole } from '@/types/user';
import type { NextRequest, NextResponse } from 'next/server';

// ✅ Good - Named imports for utilities
import { validateEmail, hashPassword } from '@/lib/utils';
import { userRepository } from '@/lib/database/repositories';

// ✅ Good - Default imports for components and services
import UserService from '@/lib/services/user.service';
import LoginForm from '@/components/auth/LoginForm';

// ✅ Good - Barrel exports in index files
export { UserService } from './user.service';
export { AuthService } from './auth.service';
export type { User, UserRole } from './types';
```

### 3. Function Signatures

Write clear, well-typed function signatures with proper parameter and return types:

```typescript
// ✅ Good - Clear function signatures
interface AuthenticationContext {
  correlationId: string;
  clientIP: string;
  userAgent?: string;
}

async function authenticateUser(
  credentials: LoginCredentials,
  context: AuthenticationContext
): Promise<ServiceResult<AuthResult>> {
  // Implementation
}

// ✅ Good - Generic functions with constraints
function createRepository<T extends { id: string }>(
  tableName: string
): Repository<T> {
  // Implementation
}
```

## Naming Conventions

### 1. Variables and Functions

Use camelCase for variables, functions, and methods:

```typescript
// ✅ Good
const userEmail = 'user@example.com';
const isEmailVerified = true;

function validateUserInput(input: unknown): boolean {
  // Implementation
}

async function sendVerificationEmail(userId: string): Promise<void> {
  // Implementation
}
```

### 2. Classes and Interfaces

Use PascalCase for classes, interfaces, and types:

```typescript
// ✅ Good
class AuthenticationService {
  private readonly logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }
}

interface DatabaseConnection {
  isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

type ServiceConfiguration = {
  timeout: number;
  retries: number;
  baseUrl: string;
};
```

### 3. Constants

Use SCREAMING_SNAKE_CASE for module-level constants:

```typescript
// ✅ Good
const JWT_EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_PAGE_SIZE = 20;

const RATE_LIMIT_CONFIGS = {
  LOGIN: { windowMs: 15 * 60 * 1000, max: 5 },
  SIGNUP: { windowMs: 60 * 60 * 1000, max: 3 }
} as const;
```

## Error Handling

### 1. Custom Error Classes

Create typed error classes with proper inheritance:

```typescript
// ✅ Good - Custom error classes
export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
  
  constructor(
    message: string,
    public readonly field?: string,
    public readonly correlationId?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public readonly code = 'AUTHENTICATION_ERROR';
  public readonly statusCode = 401;
  
  constructor(
    message: string,
    public readonly correlationId?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
```

### 2. Result Types

Use Result types for operations that can fail:

```typescript
// ✅ Good - Result type pattern
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function validateUser(userData: unknown): Promise<Result<User, ValidationError>> {
  try {
    const user = await userSchema.parseAsync(userData);
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: new ValidationError('Invalid user data', undefined, generateId()) 
    };
  }
}

// Usage
const result = await validateUser(input);
if (result.success) {
  // TypeScript knows result.data is User
  console.log(result.data.email);
} else {
  // TypeScript knows result.error is ValidationError
  console.error(result.error.message);
}
```

## Performance Considerations

### 1. Lazy Loading and Dynamic Imports

Use dynamic imports for code splitting and lazy loading:

```typescript
// ✅ Good - Dynamic imports for heavy dependencies
async function sendEmail(emailData: EmailData): Promise<void> {
  const { emailService } = await import('@/lib/email/email-service');
  return emailService.send(emailData);
}

// ✅ Good - Conditional imports
async function getEmailConfig(): Promise<EmailConfig> {
  if (process.env.NODE_ENV === 'development') {
    const { developmentConfig } = await import('./email-config.dev');
    return developmentConfig;
  }
  
  const { productionConfig } = await import('./email-config.prod');
  return productionConfig;
}
```

### 2. Type Guards and Narrowing

Use type guards for runtime type checking and narrowing:

```typescript
// ✅ Good - Type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).email === 'string'
  );
}

function isValidRole(role: string): role is UserRole {
  return ['customer', 'expert', 'admin'].includes(role);
}

// Usage
function processUserData(data: unknown): User | null {
  if (isUser(data)) {
    // TypeScript knows data is User here
    return data;
  }
  return null;
}
```

## Examples

### 1. Service Class Example

```typescript
import type { User, CreateUserRequest, UpdateUserRequest } from './types';
import type { Repository } from '@/lib/database/types';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { validateEmail, hashPassword } from '@/lib/utils';

export class UserService {
  constructor(
    private readonly userRepository: Repository<User>,
    private readonly logger: Logger
  ) {}

  async createUser(request: CreateUserRequest): Promise<User> {
    // Validate input
    if (!validateEmail(request.email)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    // Check for existing user
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new ValidationError('Email already exists', 'email');
    }

    // Hash password
    const passwordHash = await hashPassword(request.password);

    // Create user
    const user = await this.userRepository.create({
      ...request,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.logger.info('User created successfully', { userId: user.id });
    return user;
  }

  async updateUser(id: string, updates: UpdateUserRequest): Promise<User> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await this.userRepository.update(id, {
      ...updates,
      updatedAt: new Date()
    });

    this.logger.info('User updated successfully', { userId: id });
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.delete(id);
    this.logger.info('User deleted successfully', { userId: id });
  }
}
```

### 2. API Route Handler Example

```typescript
import type { NextRequest } from 'next/server';
import { userService } from '@/lib/services';
import { validateRequest, createResponse } from '@/lib/api';
import { withErrorHandler } from '@/lib/middleware';

interface CreateUserBody {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Validate request body
  const body = await validateRequest<CreateUserBody>(request, {
    email: 'string',
    firstName: 'string',
    lastName: 'string',
    password: 'string',
    role: 'string'
  });

  // Create user
  const user = await userService.createUser(body);

  // Return response (excluding sensitive data)
  return createResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt
    }
  }, 201);
});
```

### 3. Database Repository Example

```typescript
import type { User, CreateUserData } from './types';
import { db } from '@/lib/database/connection';
import { users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] || null;
  }

  async create(userData: CreateUserData): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .returning();

    return result[0];
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
  }
}

export const userRepository = new UserRepository();
```

## Best Practices Summary

1. **Always use strict TypeScript** - No `any` types, enable all strict checks
2. **Prefer composition over inheritance** - Use interfaces and composition patterns
3. **Use utility types** - Leverage TypeScript's built-in utility types for better type safety
4. **Handle errors properly** - Use custom error classes and Result types
5. **Write self-documenting code** - Use descriptive names and clear type definitions
6. **Optimize for performance** - Use dynamic imports and type guards appropriately
7. **Maintain consistency** - Follow naming conventions and code organization patterns
8. **Test your types** - Ensure type safety with comprehensive testing

---

*These standards are living guidelines that evolve with the project. Please suggest improvements and updates as needed.*