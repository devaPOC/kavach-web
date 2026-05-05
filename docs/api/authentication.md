# Authentication API

This section covers all authentication-related endpoints including user registration, login, logout, email verification, and token management.

## Overview

The authentication system uses JWT tokens with both access and refresh tokens for secure session management. All authentication endpoints implement rate limiting and comprehensive error handling.

## Endpoints

### POST /api/v1/auth/signup

Register a new user account.

#### Request

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "firstName": "string (required, 2-50 chars)",
  "lastName": "string (required, 2-50 chars)", 
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars with complexity requirements)",
  "role": "customer | expert (optional, defaults to customer)",
  "agreedToTerms": "boolean (required, must be true)"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number
- At least one special character

#### Response

**Success (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe", 
      "role": "customer",
      "isEmailVerified": false,
      "isProfileCompleted": false,
      "isApproved": true,
      "createdAt": "2025-01-20T10:30:00.000Z"
    },
    "message": "Account created successfully. Please check your email for verification."
  },
  "message": "User registered successfully",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": {
      "validationErrors": [
        {
          "field": "email",
          "message": "Please enter a valid email address"
        }
      ]
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (409):**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ENTRY", 
    "message": "Email already exists",
    "field": "email"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Rate Limiting
- 3 signups per hour per IP address
- Blocked for 1 hour after exceeding limit

---

### POST /api/v1/auth/login

Authenticate a user and create a session.

#### Request

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "role": "customer | expert (optional)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isEmailVerified": true,
      "isProfileCompleted": true,
      "isApproved": true,
      "isBanned": false,
      "isPaused": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "message": "Login successful",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (401) - Email Not Verified:**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email address before logging in"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (403) - Account Banned:**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Your expert account has been banned. Please contact support for assistance.",
    "details": {
      "reason": "banned"
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Rate Limiting
- 5 login attempts per 15 minutes per IP address
- Blocked for 30 minutes after exceeding limit

#### Cookies Set
Upon successful login, the following HTTP-only cookies are set:
- `auth-session`: Access token (15 minutes)
- `auth-refresh`: Refresh token (7 days)

---

### POST /api/v1/auth/logout

Logout the current user and invalidate their session.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>; auth-refresh=<refresh_token>`

**Body:** None

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "message": "Logout successful",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Authentication required"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Cookies Cleared
Upon successful logout, authentication cookies are cleared.

---

### POST /api/v1/auth/refresh

Refresh an expired access token using a refresh token.

#### Request

**Headers:**
- `Cookie: auth-refresh=<refresh_token>`

**Body:** None

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isEmailVerified": true,
      "isProfileCompleted": true,
      "isApproved": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  },
  "message": "Token refreshed successfully",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Invalid or expired refresh token"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Cookies Updated
Upon successful refresh, new authentication cookies are set with updated tokens.

---

### POST /api/v1/auth/verify-email

Verify a user's email address using a verification token.

#### Request

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "token": "string (required, verification token from email)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "isEmailVerified": true
    }
  },
  "message": "Email verification successful",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid or expired verification token"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Rate Limiting
- 10 verification attempts per hour per IP address
- Blocked for 1 hour after exceeding limit

---

### POST /api/v1/auth/resend-verification

Resend email verification to a user.

#### Request

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "string (required, valid email address)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Verification email sent successfully"
  },
  "message": "Verification email resent",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Email is already verified or does not exist"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Rate Limiting
- 3 resend attempts per hour per IP address
- Blocked for 2 hours after exceeding limit

---

### POST /api/v1/auth/check-email

Check if an email address is available for registration.

#### Request

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "string (required, valid email address)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "email": "user@example.com"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Email Taken (200):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "email": "user@example.com"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### GET /api/v1/auth/me

Get current authenticated user information.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`

**Body:** None

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "isEmailVerified": true,
    "isProfileCompleted": true,
    "isApproved": true,
    "isBanned": false,
    "isPaused": false,
    "bannedAt": null,
    "pausedAt": null,
    "approvedAt": "2025-01-20T10:30:00.000Z",
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Authentication required"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Authentication Flow

### 1. Registration Flow
1. User submits registration form
2. System validates input and checks email availability
3. User account is created with `isEmailVerified: false`
4. Verification email is sent
5. User clicks verification link
6. Email is verified and user can log in

### 2. Login Flow
1. User submits login credentials
2. System validates credentials and account status
3. If valid, JWT tokens are generated
4. Tokens are set as HTTP-only cookies
5. User session is established

### 3. Token Refresh Flow
1. Access token expires (15 minutes)
2. Client automatically uses refresh token
3. New access and refresh tokens are generated
4. Cookies are updated with new tokens

### 4. Logout Flow
1. User initiates logout
2. Server invalidates session
3. Authentication cookies are cleared
4. User is logged out

## Security Considerations

### Password Security
- Passwords are hashed using bcrypt with salt rounds
- Minimum complexity requirements enforced
- No password storage in plain text

### Token Security
- JWT tokens are signed with secure secrets
- Access tokens have short expiration (15 minutes)
- Refresh tokens are rotated on each use
- HTTP-only cookies prevent XSS attacks

### Rate Limiting
- Prevents brute force attacks
- Different limits for different endpoints
- IP-based tracking with progressive blocking

### Session Management
- Sessions are tracked and can be invalidated
- Concurrent session limits can be enforced
- Anomaly detection for suspicious activity

## Error Handling

All authentication endpoints return consistent error responses with:
- Standardized error codes
- Human-readable messages
- Correlation IDs for tracking
- Appropriate HTTP status codes

Common error scenarios:
- Invalid credentials
- Email not verified
- Account locked/banned/paused
- Rate limit exceeded
- Token expired/invalid
- Validation failures