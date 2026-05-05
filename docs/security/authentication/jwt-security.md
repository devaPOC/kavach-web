# JWT Security Implementation

This document details the JSON Web Token (JWT) security implementation in the Kavach system, including best practices, security measures, and implementation details.

## Overview

The Kavach system uses JWT tokens for stateless authentication with the following security features:

- **Secure Token Generation**: Cryptographically secure random JTI (JWT ID)
- **Token Validation**: Comprehensive signature and payload validation
- **Token Revocation**: JTI-based token revocation system
- **Dual Token System**: Separate access and refresh tokens
- **Secure Storage**: HTTP-only cookies with security flags

## JWT Implementation

### Token Structure

Our JWT tokens follow the standard structure with enhanced security:

```typescript
interface JWTPayload {
  userId: string;           // User identifier (UUID)
  email: string;           // User email
  role: 'customer' | 'expert' | 'admin';  // User role
  isEmailVerified: boolean; // Email verification status
  isProfileCompleted: boolean; // Profile completion status
  isApproved: boolean;     // Account approval status
  tokenType: 'access' | 'refresh'; // Token type
  jti: string;            // JWT ID for revocation
  iat: number;            // Issued at timestamp
  exp: number;            // Expiration timestamp
}
```

### Token Generation

```typescript
// Access Token Generation
export async function generateToken(payload: JWTPayload): Promise<string> {
  const enriched = {
    ...payload,
    tokenType: 'access' as const,
    jti: generateJti(), // Cryptographically secure UUID
    isProfileCompleted: payload.isProfileCompleted ?? false,
    isApproved: payload.isApproved ?? false
  };
  
  const token = await new SignJWT(enriched)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days for access tokens
    .sign(secret);

  return token;
}

// Refresh Token Generation
export async function generateRefreshToken(payload: JWTPayload): Promise<string> {
  const enriched = {
    ...payload,
    tokenType: 'refresh' as const,
    jti: generateJti(),
    isProfileCompleted: payload.isProfileCompleted ?? false,
    isApproved: payload.isApproved ?? false
  };
  
  const token = await new SignJWT(enriched)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // 30 days for refresh tokens
    .sign(secret);

  return token;
}
```

### Token Validation

```typescript
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // Verify signature and decode payload
    const { payload } = await jwtVerify(token, secret);

    // Validate payload structure using Zod schema
    const validatedPayload = jwtPayloadSchema.parse(payload);
    
    // Check token revocation status
    if (await isJtiRevokedAsync(validatedPayload.jti)) {
      return null;
    }
    
    return validatedPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
```

## Security Features

### 1. Cryptographically Secure JTI Generation

Each token includes a unique JWT ID (JTI) for revocation purposes:

```typescript
function generateJti(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  
  // Fallback to manual UUID v4 generation
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

### 2. Token Revocation System

The system maintains a revocation store for immediate token invalidation:

```typescript
// In-memory revocation store with TTL
const revokedTokens = new Map<string, number>();

export function revokeJti(jti: string): void {
  const expirationTime = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
  revokedTokens.set(jti, expirationTime);
}

export async function isJtiRevokedAsync(jti?: string): Promise<boolean> {
  if (!jti) return false;
  
  const expirationTime = revokedTokens.get(jti);
  if (!expirationTime) return false;
  
  // Clean up expired entries
  if (Date.now() > expirationTime) {
    revokedTokens.delete(jti);
    return false;
  }
  
  return true;
}
```

### 3. Dual Token System

The system uses separate access and refresh tokens:

- **Access Tokens**: Short-lived (7 days), used for API requests
- **Refresh Tokens**: Long-lived (30 days), used only for token refresh

```typescript
// Token refresh with rotation
export async function rotateRefreshToken(): Promise<SessionData | null> {
  const refreshCookie = cookieStore.get(REFRESH_COOKIE_NAME);
  if (!refreshCookie?.value) return null;
  
  const payload = await verifyToken(refreshCookie.value);
  if (!payload || payload.tokenType !== 'refresh') return null;
  
  // Revoke old refresh token
  if (payload.jti) revokeJti(payload.jti);
  await sessionRepository.deleteByToken(refreshCookie.value);
  
  // Generate new tokens
  const sessionData = extractSessionData(payload);
  const newAccess = await generateToken(sessionData);
  const newRefresh = await generateRefreshToken(sessionData);
  
  // Set new cookies
  cookieStore.set(SESSION_COOKIE_NAME, newAccess, getSecureCookieOptions());
  cookieStore.set(REFRESH_COOKIE_NAME, newRefresh, getSecureCookieOptions(REFRESH_DURATION / 1000));
  
  return sessionData;
}
```

## Security Best Practices

### 1. Secret Management

```typescript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Use TextEncoder for consistent encoding
const secret = new TextEncoder().encode(JWT_SECRET);
```

**Requirements for JWT_SECRET:**
- Minimum 256 bits (32 characters) of entropy
- Cryptographically random generation
- Stored securely (environment variables, secrets manager)
- Rotated regularly in production

### 2. Algorithm Selection

We use HMAC SHA-256 (HS256) for token signing:

```typescript
const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' }) // Explicit algorithm specification
  .setIssuedAt()
  .setExpirationTime(expirationTime)
  .sign(secret);
```

**Why HS256:**
- Symmetric algorithm suitable for single-service architecture
- Faster than RSA-based algorithms
- Sufficient security for our use case
- Simpler key management

### 3. Token Expiration

```typescript
const JWT_EXPIRES_IN = '7d';           // Access tokens: 7 days
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // Refresh tokens: 30 days
```

**Expiration Strategy:**
- Access tokens: Short-lived to limit exposure
- Refresh tokens: Longer-lived for user convenience
- Email verification tokens: 1 hour for security

### 4. Payload Validation

```typescript
export const jwtPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['customer', 'expert', 'admin']),
  isEmailVerified: z.boolean(),
  isProfileCompleted: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  tokenType: z.enum(['access', 'refresh']).optional(),
  jti: z.string().uuid().optional(),
  iat: z.number().optional(),
  exp: z.number().optional()
});
```

## Security Considerations

### 1. Token Storage

**Client-Side Storage:**
- ✅ HTTP-only cookies (recommended)
- ❌ localStorage (vulnerable to XSS)
- ❌ sessionStorage (vulnerable to XSS)

**Cookie Configuration:**
```typescript
function getSecureCookieOptions(maxAge?: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,        // Prevent XSS access
    secure: isProduction,  // HTTPS only in production
    sameSite: 'strict',    // CSRF protection
    maxAge: maxAge || SESSION_DURATION / 1000,
    path: '/'
  };
}
```

### 2. Token Transmission

- Always use HTTPS in production
- Include tokens in Authorization header for API requests
- Use secure cookies for web application authentication

### 3. Token Validation

```typescript
// Comprehensive token validation
export async function validateToken(token: string): Promise<ValidationResult> {
  // 1. Verify signature
  const payload = await verifyToken(token);
  if (!payload) return { valid: false, reason: 'Invalid signature' };
  
  // 2. Check expiration
  if (isTokenExpired(payload)) return { valid: false, reason: 'Token expired' };
  
  // 3. Check revocation
  if (await isJtiRevokedAsync(payload.jti)) return { valid: false, reason: 'Token revoked' };
  
  // 4. Validate token type
  if (payload.tokenType !== expectedType) return { valid: false, reason: 'Invalid token type' };
  
  return { valid: true, payload };
}
```

## Email Verification Tokens

Special JWT tokens for email verification:

```typescript
export async function generateEmailVerificationToken(userId: string, email: string): Promise<string> {
  const payload = {
    userId,
    email,
    type: 'email_verification'
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Short expiration for security
    .sign(secret);

  return token;
}

export async function verifyEmailVerificationToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== 'email_verification') {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string
    };
  } catch (error) {
    console.error('Email verification token verification failed:', error);
    return null;
  }
}
```

## Security Monitoring

JWT-related security events are monitored and logged:

```typescript
// Token manipulation detection
if (!payload) {
  recordTokenManipulation({
    ip: clientIP,
    requestId: correlationId,
    details: { reason: 'invalid_signature', tokenType: 'access' }
  });
}

// Revoked token usage
if (await isJtiRevokedAsync(payload.jti)) {
  recordTokenManipulation({
    userId: payload.userId,
    ip: clientIP,
    requestId: correlationId,
    details: { reason: 'revoked_token_usage', jti: payload.jti }
  });
}
```

## Common Vulnerabilities & Mitigations

### 1. Token Theft
**Mitigation:**
- HTTP-only cookies prevent XSS access
- Secure flag ensures HTTPS-only transmission
- Short token expiration limits exposure window

### 2. Token Replay Attacks
**Mitigation:**
- JTI-based revocation system
- Token rotation on refresh
- Comprehensive audit logging

### 3. Algorithm Confusion
**Mitigation:**
- Explicit algorithm specification in header
- Algorithm validation during verification
- No support for "none" algorithm

### 4. Weak Secrets
**Mitigation:**
- Minimum entropy requirements
- Environment variable validation
- Regular secret rotation

## Testing JWT Security

```typescript
// Example security tests
describe('JWT Security', () => {
  test('should reject tokens with invalid signatures', async () => {
    const invalidToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.invalid.signature';
    const result = await verifyToken(invalidToken);
    expect(result).toBeNull();
  });

  test('should reject expired tokens', async () => {
    const expiredPayload = { ...validPayload, exp: Math.floor(Date.now() / 1000) - 3600 };
    const expiredToken = await generateTestToken(expiredPayload);
    const result = await verifyToken(expiredToken);
    expect(result).toBeNull();
  });

  test('should reject revoked tokens', async () => {
    const token = await generateToken(validPayload);
    const payload = await verifyToken(token);
    revokeJti(payload.jti);
    
    const result = await verifyToken(token);
    expect(result).toBeNull();
  });
});
```

## Production Checklist

- [ ] JWT_SECRET is cryptographically secure (256+ bits)
- [ ] Tokens are transmitted over HTTPS only
- [ ] HTTP-only cookies are configured properly
- [ ] Token expiration times are appropriate
- [ ] Revocation system is implemented
- [ ] Security monitoring is active
- [ ] Regular secret rotation is scheduled
- [ ] Algorithm confusion attacks are prevented

## Related Documentation

- [Session Management](./session-management.md) - Session handling and security
- [Authentication Service](../../backend/services/authentication.md) - Authentication implementation
- [API Authentication](../../api/authentication.md) - API authentication endpoints
- [Security Monitoring](../monitoring/audit-logging.md) - Security event monitoring