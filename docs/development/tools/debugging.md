# Debugging Guide

This document provides comprehensive guidance for debugging the Kavach application across different layers and environments. Effective debugging skills are essential for maintaining code quality and resolving issues quickly.

## Table of Contents

- [Debugging Philosophy](#debugging-philosophy)
- [Development Environment Setup](#development-environment-setup)
- [Frontend Debugging](#frontend-debugging)
- [Backend Debugging](#backend-debugging)
- [Database Debugging](#database-debugging)
- [API Debugging](#api-debugging)
- [Authentication Debugging](#authentication-debugging)
- [Performance Debugging](#performance-debugging)
- [Production Debugging](#production-debugging)
- [Common Issues and Solutions](#common-issues-and-solutions)

## Debugging Philosophy

### Systematic Approach

1. **Reproduce the issue** consistently
2. **Isolate the problem** to the smallest possible scope
3. **Form hypotheses** about the root cause
4. **Test hypotheses** systematically
5. **Fix the root cause**, not just symptoms
6. **Verify the fix** doesn't break other functionality
7. **Document the solution** for future reference

### Debugging Mindset

- **Stay calm and methodical** - rushing leads to mistakes
- **Question assumptions** - the obvious cause isn't always correct
- **Use tools effectively** - leverage debugging tools and logs
- **Think like the computer** - understand execution flow
- **Collaborate when stuck** - fresh eyes often help

## Development Environment Setup

### VS Code Debugging Configuration

#### Launch Configuration (`.vscode/launch.json`)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/next/dist/bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_OPTIONS": "--inspect"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}",
      "sourceMapPathOverrides": {
        "webpack://_N_E/*": "${webRoot}/*"
      }
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "test"
      }
    }
  ]
}
```

#### Tasks Configuration (`.vscode/tasks.json`)

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Server",
      "type": "shell",
      "command": "bun run dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "bun run test",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

### Browser Developer Tools Setup

#### Chrome DevTools Extensions
- **React Developer Tools**: Component inspection and profiling
- **Redux DevTools**: State management debugging (if using Redux)
- **Apollo Client DevTools**: GraphQL debugging (if applicable)

#### Firefox Developer Tools
- Built-in React debugging support
- Network monitoring
- Performance profiling

## Frontend Debugging

### 1. React Component Debugging

#### Component State and Props

```tsx
// Debug component state and props
const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // Debug logging
  useEffect(() => {
    console.log('UserProfile rendered:', { user, isEditing });
  });

  // Debug with React DevTools
  React.useDebugValue(isEditing ? 'Editing' : 'Viewing');

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

#### Custom Debug Hook

```tsx
// Custom hook for debugging
function useDebugValue<T>(value: T, label: string): T {
  useEffect(() => {
    console.log(`[${label}]:`, value);
  }, [value, label]);
  
  return value;
}

// Usage
const UserForm: React.FC = () => {
  const [formData, setFormData] = useDebugValue(
    useState(initialData),
    'FormData'
  );
  
  return <form>{/* Form content */}</form>;
};
```

### 2. State Management Debugging

#### Zustand Store Debugging

```typescript
// Enable Zustand devtools
import { devtools } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      login: async (credentials) => {
        console.log('Login attempt:', credentials.email);
        try {
          const result = await authService.login(credentials);
          set({ user: result.user, isAuthenticated: true });
          console.log('Login successful:', result.user);
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },
      
      logout: () => {
        console.log('Logging out user:', get().user?.email);
        set({ user: null, isAuthenticated: false });
      }
    }),
    { name: 'auth-store' }
  )
);
```

### 3. Network Request Debugging

#### API Client Debugging

```typescript
// Enhanced API client with debugging
class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Debug request
    console.group(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
    console.log('URL:', url);
    console.log('Options:', options);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      const data = await response.json();
      
      // Debug response
      console.log('Status:', response.status);
      console.log('Response:', data);
      console.groupEnd();
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('Request failed:', error);
      console.groupEnd();
      throw error;
    }
  }
}
```

### 4. Form Debugging

#### Form Validation Debugging

```tsx
// Debug form validation
const LoginForm: React.FC = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validateField = (field: string, value: string) => {
    console.log(`Validating ${field}:`, value);
    
    let error = '';
    switch (field) {
      case 'email':
        if (!value.includes('@')) {
          error = 'Invalid email format';
        }
        break;
      case 'password':
        if (value.length < 8) {
          error = 'Password too short';
        }
        break;
    }
    
    console.log(`Validation result for ${field}:`, error || 'Valid');
    setErrors(prev => ({ ...prev, [field]: error }));
  };
  
  return (
    <form>
      {/* Form fields */}
    </form>
  );
};
```

## Backend Debugging

### 1. Next.js API Route Debugging

#### Request/Response Debugging

```typescript
// API route with comprehensive debugging
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  
  try {
    // Debug request
    logger.info('API Request received', {
      correlationId,
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      userAgent: request.headers.get('user-agent')
    });
    
    const body = await request.json();
    logger.info('Request body parsed', { correlationId, body });
    
    // Process request
    const result = await processRequest(body);
    
    logger.info('Request processed successfully', {
      correlationId,
      result: { ...result, sensitiveData: '[REDACTED]' }
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('API Request failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: 'Internal server error', correlationId },
      { status: 500 }
    );
  }
}
```

### 2. Service Layer Debugging

#### Service Method Debugging

```typescript
// Service with detailed debugging
export class UserService {
  private logger = logger.child({ service: 'UserService' });
  
  async createUser(userData: CreateUserData): Promise<User> {
    const operationId = crypto.randomUUID();
    
    this.logger.info('Creating user', {
      operationId,
      email: userData.email,
      role: userData.role
    });
    
    try {
      // Validate input
      this.logger.debug('Validating user data', { operationId });
      const validationResult = await this.validateUserData(userData);
      
      if (!validationResult.isValid) {
        this.logger.warn('User data validation failed', {
          operationId,
          errors: validationResult.errors
        });
        throw new ValidationError('Invalid user data');
      }
      
      // Check for existing user
      this.logger.debug('Checking for existing user', { operationId });
      const existingUser = await userRepository.findByEmail(userData.email);
      
      if (existingUser) {
        this.logger.warn('User already exists', {
          operationId,
          existingUserId: existingUser.id
        });
        throw new ConflictError('User already exists');
      }
      
      // Create user
      this.logger.debug('Creating user in database', { operationId });
      const user = await userRepository.create(userData);
      
      this.logger.info('User created successfully', {
        operationId,
        userId: user.id,
        email: user.email
      });
      
      return user;
      
    } catch (error) {
      this.logger.error('User creation failed', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
```

### 3. Middleware Debugging

#### Authentication Middleware Debugging

```typescript
// Middleware with debugging
export async function authMiddleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  logger.info('Auth middleware started', {
    requestId,
    path: request.nextUrl.pathname,
    method: request.method
  });
  
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      logger.warn('No authorization header', { requestId });
      return new Response('Unauthorized', { status: 401 });
    }
    
    logger.debug('Extracting token', { requestId });
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      logger.warn('Invalid authorization header format', { requestId });
      return new Response('Unauthorized', { status: 401 });
    }
    
    logger.debug('Verifying token', { requestId });
    const payload = await verifyToken(token);
    
    if (!payload) {
      logger.warn('Token verification failed', { requestId });
      return new Response('Unauthorized', { status: 401 });
    }
    
    logger.info('Authentication successful', {
      requestId,
      userId: payload.userId,
      role: payload.role
    });
    
    // Add user info to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
    
  } catch (error) {
    logger.error('Auth middleware error', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    return new Response('Internal Server Error', { status: 500 });
  }
}
```

## Database Debugging

### 1. Query Debugging

#### Drizzle ORM Query Debugging

```typescript
// Enable query logging
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, {
  // Enable query logging in development
  debug: process.env.NODE_ENV === 'development'
});

export const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development'
});

// Custom query logging
export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const startTime = Date.now();
    
    try {
      logger.debug('Executing query: findById', { userId: id });
      
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      const duration = Date.now() - startTime;
      logger.debug('Query completed', {
        operation: 'findById',
        userId: id,
        duration,
        found: result.length > 0
      });
      
      return result[0] || null;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query failed', {
        operation: 'findById',
        userId: id,
        duration,
        error: error.message
      });
      throw error;
    }
  }
}
```

### 2. Transaction Debugging

```typescript
// Transaction debugging
export class TransactionService {
  async createUserWithProfile(
    userData: CreateUserData,
    profileData: CreateProfileData
  ): Promise<{ user: User; profile: Profile }> {
    const transactionId = crypto.randomUUID();
    
    logger.info('Starting transaction', {
      transactionId,
      operation: 'createUserWithProfile'
    });
    
    return await db.transaction(async (tx) => {
      try {
        logger.debug('Creating user', { transactionId });
        const user = await tx.insert(users).values(userData).returning();
        
        logger.debug('Creating profile', {
          transactionId,
          userId: user[0].id
        });
        const profile = await tx
          .insert(profiles)
          .values({ ...profileData, userId: user[0].id })
          .returning();
        
        logger.info('Transaction completed successfully', {
          transactionId,
          userId: user[0].id,
          profileId: profile[0].id
        });
        
        return { user: user[0], profile: profile[0] };
        
      } catch (error) {
        logger.error('Transaction failed', {
          transactionId,
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });
  }
}
```

### 3. Connection Pool Debugging

```typescript
// Monitor database connections
const client = postgres(process.env.DATABASE_URL!, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  
  // Connection event handlers
  onnotice: (notice) => {
    logger.info('Database notice', { notice });
  },
  
  onparameter: (key, value) => {
    logger.debug('Database parameter', { key, value });
  }
});

// Monitor connection pool
setInterval(() => {
  logger.debug('Connection pool status', {
    totalConnections: client.options.max,
    idleConnections: client.idle.length,
    activeConnections: client.reserved.length
  });
}, 30000); // Log every 30 seconds
```

## API Debugging

### 1. Request/Response Logging

#### Comprehensive API Logging

```typescript
// API logging middleware
export function withApiLogging<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    logger.info('API operation started', {
      requestId,
      operation: operationName,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await handler(...args);
      const duration = Date.now() - startTime;
      
      logger.info('API operation completed', {
        requestId,
        operation: operationName,
        duration,
        success: true
      });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('API operation failed', {
        requestId,
        operation: operationName,
        duration,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  };
}

// Usage
export const loginUser = withApiLogging(
  async (credentials: LoginCredentials) => {
    return await authService.login(credentials);
  },
  'loginUser'
);
```

### 2. Rate Limiting Debugging

```typescript
// Rate limiting with debugging
export class RateLimiter {
  private attempts = new Map<string, number[]>();
  
  checkRateLimit(
    identifier: string,
    windowMs: number,
    maxAttempts: number
  ): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing attempts
    const userAttempts = this.attempts.get(identifier) || [];
    
    // Filter attempts within window
    const recentAttempts = userAttempts.filter(time => time > windowStart);
    
    logger.debug('Rate limit check', {
      identifier,
      recentAttempts: recentAttempts.length,
      maxAttempts,
      windowMs
    });
    
    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      
      logger.warn('Rate limit exceeded', {
        identifier,
        attempts: recentAttempts.length,
        retryAfter
      });
      
      return { allowed: false, retryAfter };
    }
    
    // Record this attempt
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    
    logger.debug('Rate limit passed', {
      identifier,
      attempts: recentAttempts.length
    });
    
    return { allowed: true };
  }
}
```

## Authentication Debugging

### 1. JWT Token Debugging

```typescript
// JWT debugging utilities
export class JWTDebugger {
  static decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      
      logger.debug('JWT token decoded', {
        header,
        payload: {
          ...payload,
          exp: new Date(payload.exp * 1000).toISOString(),
          iat: new Date(payload.iat * 1000).toISOString()
        }
      });
      
      return { header, payload };
      
    } catch (error) {
      logger.error('JWT decode failed', {
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      throw error;
    }
  }
  
  static isTokenExpired(token: string): boolean {
    try {
      const { payload } = this.decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      const expired = payload.exp < now;
      
      logger.debug('Token expiration check', {
        expired,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        now: new Date(now * 1000).toISOString()
      });
      
      return expired;
      
    } catch (error) {
      logger.error('Token expiration check failed', {
        error: error.message
      });
      return true;
    }
  }
}
```

### 2. Session Debugging

```typescript
// Session management debugging
export class SessionManager {
  async createSession(userData: SessionData): Promise<SessionResult> {
    const sessionId = crypto.randomUUID();
    
    logger.info('Creating session', {
      sessionId,
      userId: userData.userId,
      role: userData.role
    });
    
    try {
      // Generate tokens
      const accessToken = await generateToken(userData);
      const refreshToken = await generateRefreshToken(userData);
      
      // Store session
      await this.storeSession(sessionId, {
        userId: userData.userId,
        accessToken,
        refreshToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      });
      
      logger.info('Session created successfully', {
        sessionId,
        userId: userData.userId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });
      
      return {
        sessionId,
        accessToken,
        refreshToken,
        user: userData
      };
      
    } catch (error) {
      logger.error('Session creation failed', {
        sessionId,
        userId: userData.userId,
        error: error.message
      });
      throw error;
    }
  }
}
```

## Performance Debugging

### 1. Performance Monitoring

```typescript
// Performance monitoring utility
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();
  
  static startMeasurement(name: string): void {
    this.measurements.set(name, performance.now());
    logger.debug('Performance measurement started', { name });
  }
  
  static endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      logger.warn('No start time found for measurement', { name });
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.measurements.delete(name);
    
    logger.info('Performance measurement completed', {
      name,
      duration: `${duration.toFixed(2)}ms`
    });
    
    // Alert on slow operations
    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        name,
        duration: `${duration.toFixed(2)}ms`
      });
    }
    
    return duration;
  }
  
  static async measureAsync<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.startMeasurement(name);
    try {
      const result = await operation();
      this.endMeasurement(name);
      return result;
    } catch (error) {
      this.endMeasurement(name);
      throw error;
    }
  }
}

// Usage
const users = await PerformanceMonitor.measureAsync(
  'fetchUsers',
  () => userRepository.findAll()
);
```

### 2. Memory Usage Monitoring

```typescript
// Memory monitoring
export class MemoryMonitor {
  static logMemoryUsage(context: string): void {
    const usage = process.memoryUsage();
    
    logger.info('Memory usage', {
      context,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    });
  }
  
  static startMemoryMonitoring(intervalMs: number = 30000): void {
    setInterval(() => {
      this.logMemoryUsage('periodic-check');
      
      // Force garbage collection in development
      if (process.env.NODE_ENV === 'development' && global.gc) {
        global.gc();
        this.logMemoryUsage('after-gc');
      }
    }, intervalMs);
  }
}
```

## Production Debugging

### 1. Error Tracking

```typescript
// Production error tracking
export class ErrorTracker {
  static trackError(
    error: Error,
    context: Record<string, any> = {}
  ): void {
    const errorId = crypto.randomUUID();
    
    const errorInfo = {
      errorId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION
    };
    
    // Log error
    logger.error('Application error', errorInfo);
    
    // Send to external service (e.g., Sentry, Bugsnag)
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorInfo);
    }
  }
  
  private static async sendToExternalService(
    errorInfo: any
  ): Promise<void> {
    try {
      // Send to error tracking service
      await fetch(process.env.ERROR_TRACKING_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo)
      });
    } catch (sendError) {
      logger.error('Failed to send error to tracking service', {
        originalError: errorInfo.errorId,
        sendError: sendError.message
      });
    }
  }
}
```

### 2. Health Monitoring

```typescript
// Application health monitoring
export class HealthMonitor {
  static async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkExternalServices(),
      this.checkMemoryUsage(),
      this.checkDiskSpace()
    ]);
    
    const results = checks.map((check, index) => ({
      name: ['database', 'external-services', 'memory', 'disk'][index],
      status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
      details: check.status === 'fulfilled' ? check.value : check.reason
    }));
    
    const overallStatus = results.every(r => r.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';
    
    logger.info('Health check completed', {
      status: overallStatus,
      checks: results
    });
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
  
  private static async checkDatabase(): Promise<any> {
    try {
      await db.select().from(users).limit(1);
      return { status: 'connected' };
    } catch (error) {
      throw { status: 'disconnected', error: error.message };
    }
  }
}
```

## Common Issues and Solutions

### 1. Authentication Issues

#### Issue: JWT Token Not Working

```typescript
// Debug JWT issues
const debugJWT = (token: string) => {
  console.group('🔐 JWT Debug');
  
  try {
    // Check token format
    const parts = token.split('.');
    console.log('Token parts:', parts.length);
    
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT format');
      return;
    }
    
    // Decode header and payload
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('📋 Header:', header);
    console.log('📦 Payload:', payload);
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;
    
    console.log('⏰ Expiration:', {
      exp: payload.exp,
      now,
      expired: isExpired,
      expiresAt: new Date(payload.exp * 1000).toISOString()
    });
    
    if (isExpired) {
      console.error('❌ Token is expired');
    } else {
      console.log('✅ Token is valid');
    }
    
  } catch (error) {
    console.error('❌ JWT decode error:', error);
  }
  
  console.groupEnd();
};
```

### 2. Database Connection Issues

#### Issue: Connection Pool Exhaustion

```typescript
// Debug connection pool
const debugConnectionPool = () => {
  console.group('🗄️ Database Connection Debug');
  
  // Log connection stats
  console.log('Connection Pool Stats:', {
    max: client.options.max,
    idle: client.idle.length,
    reserved: client.reserved.length,
    pending: client.pending.length
  });
  
  // Monitor for connection leaks
  if (client.reserved.length > client.options.max * 0.8) {
    console.warn('⚠️ High connection usage detected');
  }
  
  console.groupEnd();
};
```

### 3. Performance Issues

#### Issue: Slow API Responses

```typescript
// Debug slow APIs
const debugSlowAPI = async (apiCall: () => Promise<any>) => {
  console.group('🐌 Slow API Debug');
  
  const start = performance.now();
  
  try {
    const result = await apiCall();
    const duration = performance.now() - start;
    
    console.log('⏱️ Duration:', `${duration.toFixed(2)}ms`);
    
    if (duration > 1000) {
      console.warn('⚠️ Slow API detected');
      
      // Additional debugging
      console.log('Memory usage:', process.memoryUsage());
      console.log('Active handles:', process._getActiveHandles().length);
    }
    
    return result;
    
  } catch (error) {
    const duration = performance.now() - start;
    console.error('❌ API failed after:', `${duration.toFixed(2)}ms`);
    throw error;
  } finally {
    console.groupEnd();
  }
};
```

### 4. Frontend State Issues

#### Issue: Component Not Re-rendering

```tsx
// Debug React re-renders
const DebugComponent: React.FC<Props> = (props) => {
  const renderCount = useRef(0);
  renderCount.current++;
  
  console.log(`🔄 Component render #${renderCount.current}`, {
    props,
    timestamp: new Date().toISOString()
  });
  
  // Track prop changes
  const prevProps = useRef<Props>();
  useEffect(() => {
    if (prevProps.current) {
      const changes = Object.keys(props).filter(
        key => props[key] !== prevProps.current![key]
      );
      
      if (changes.length > 0) {
        console.log('📝 Props changed:', changes);
      }
    }
    prevProps.current = props;
  });
  
  return <div>{/* Component content */}</div>;
};
```

## Debugging Tools Summary

### Development Tools
- **VS Code Debugger**: Breakpoints and step-through debugging
- **Chrome DevTools**: Frontend debugging and profiling
- **React DevTools**: Component inspection and profiling
- **Network Tab**: API request/response inspection

### Logging Tools
- **Pino Logger**: Structured logging with correlation IDs
- **Console Methods**: Debug, info, warn, error logging
- **Performance API**: Timing measurements
- **Memory Profiling**: Memory usage monitoring

### Database Tools
- **Drizzle Studio**: Database inspection and queries
- **Query Logging**: SQL query debugging
- **Connection Monitoring**: Pool status tracking

### Production Tools
- **Error Tracking**: Centralized error collection
- **Health Monitoring**: System status checks
- **Performance Monitoring**: Response time tracking
- **Log Aggregation**: Centralized log analysis

## Summary

1. **Use systematic debugging** approach with hypothesis testing
2. **Leverage appropriate tools** for each layer of the application
3. **Add comprehensive logging** with correlation IDs and context
4. **Monitor performance** and resource usage continuously
5. **Track errors** and health metrics in production
6. **Debug early and often** to catch issues before production
7. **Document solutions** for common issues and debugging patterns
8. **Collaborate effectively** when debugging complex issues
9. **Use automation** to catch issues before manual debugging
10. **Keep debugging skills sharp** through practice and learning

---

*Effective debugging is a critical skill for maintaining application quality and resolving issues quickly. Use these tools and techniques to become more efficient at identifying and fixing problems.*