# Error Codes Reference

This comprehensive reference covers all error codes used throughout the Kavach API, their meanings, causes, and recommended handling strategies.

## Overview

The Kavach API uses standardized error codes to provide consistent error handling across all endpoints. Each error code includes:

- **Code**: Unique identifier for the error type
- **Message**: Human-readable description
- **HTTP Status**: Corresponding HTTP status code
- **Category**: Error classification
- **Retryable**: Whether the operation can be retried
- **Retry After**: Suggested retry delay (if applicable)

## Error Response Format

All API errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "fieldName", // Optional, for validation errors
    "details": {
      // Additional error context
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Error Categories

### Validation Errors (400)
Errors related to invalid input data or request format.

### Authentication Errors (401)
Errors related to authentication and token validation.

### Authorization Errors (403)
Errors related to permissions and access control.

### Not Found Errors (404)
Errors when requested resources don't exist.

### Conflict Errors (409)
Errors when operations conflict with current state.

### Rate Limiting Errors (429)
Errors when rate limits are exceeded.

### Server Errors (500)
Internal server errors and system failures.

## Complete Error Code Reference

### Validation Errors

#### INVALID_INPUT
- **HTTP Status**: 400
- **Category**: Validation
- **Retryable**: No
- **Description**: General validation failure for request data
- **Common Causes**:
  - Missing required fields
  - Invalid field formats
  - Data type mismatches
  - Constraint violations

**Example Response:**
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

**Handling Strategy**:
- Display field-specific error messages to user
- Highlight invalid fields in the UI
- Do not retry without fixing the input

---

#### MISSING_REQUIRED_FIELD
- **HTTP Status**: 400
- **Category**: Validation
- **Retryable**: No
- **Description**: Required field is missing from request
- **Field**: Contains the name of the missing field

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "Required field 'email' is missing",
    "field": "email"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Highlight the missing field in the UI
- Focus on the missing field
- Provide clear indication of what's required

---

#### INVALID_FORMAT
- **HTTP Status**: 400
- **Category**: Validation
- **Retryable**: No
- **Description**: Field has invalid format
- **Field**: Contains the field name
- **Details**: Contains expected format information

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FORMAT",
    "message": "Field 'phoneNumber' has invalid format. Expected: +XXX-XXXX-XXXX",
    "field": "phoneNumber",
    "details": {
      "expectedFormat": "+XXX-XXXX-XXXX"
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Show format requirements to user
- Provide input masks or examples
- Validate format on client side

---

#### DUPLICATE_ENTRY
- **HTTP Status**: 409
- **Category**: Validation
- **Retryable**: No
- **Description**: Attempting to create duplicate data
- **Field**: Contains the field with duplicate value

**Example Response:**
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

**Handling Strategy**:
- Inform user that value already exists
- Suggest alternatives (e.g., login instead of signup)
- Provide recovery options

---

### Authentication Errors

#### INVALID_CREDENTIALS
- **HTTP Status**: 401
- **Category**: Authentication
- **Retryable**: Yes (with different credentials)
- **Description**: Invalid login credentials provided

**Example Response:**
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

**Handling Strategy**:
- Don't specify which credential is wrong (security)
- Provide password reset option
- Implement account lockout after multiple failures

---

#### TOKEN_EXPIRED
- **HTTP Status**: 401
- **Category**: Authentication
- **Retryable**: Yes (with token refresh)
- **Description**: Access token has expired

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Automatically attempt token refresh
- Redirect to login if refresh fails
- Implement seamless token renewal

---

#### TOKEN_INVALID
- **HTTP Status**: 401
- **Category**: Authentication
- **Retryable**: No
- **Description**: Token is malformed, invalid, or revoked

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Invalid or malformed token"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Clear stored tokens
- Redirect to login page
- Don't attempt automatic retry

---

#### EMAIL_NOT_VERIFIED
- **HTTP Status**: 401
- **Category**: Authentication
- **Retryable**: Yes (after verification)
- **Description**: User's email address is not verified

**Example Response:**
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

**Handling Strategy**:
- Redirect to email verification page
- Provide option to resend verification email
- Show clear instructions for verification

---

#### ACCOUNT_LOCKED
- **HTTP Status**: 403
- **Category**: Authentication
- **Retryable**: No
- **Description**: User account is banned or paused
- **Details**: Contains reason for lock (banned/paused)

**Example Response:**
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

**Handling Strategy**:
- Display specific message based on reason
- Provide contact information for support
- Don't allow further login attempts

---

### Authorization Errors

#### INSUFFICIENT_PERMISSIONS
- **HTTP Status**: 403
- **Category**: Authorization
- **Retryable**: No
- **Description**: User lacks required permissions
- **Details**: May contain required permission or resource

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions to access user management",
    "details": {
      "resource": "user management"
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Hide unauthorized UI elements
- Redirect to appropriate page
- Show access denied message

---

#### ACCESS_DENIED
- **HTTP Status**: 403
- **Category**: Authorization
- **Retryable**: No
- **Description**: Access denied for specific operation
- **Details**: May contain reason for denial

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Only experts can create expert profiles",
    "details": {
      "reason": "role_mismatch"
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Show role-specific error message
- Redirect to appropriate page for user's role
- Provide guidance on correct process

---

#### RESOURCE_NOT_FOUND
- **HTTP Status**: 404
- **Category**: Authorization
- **Retryable**: No
- **Description**: Requested resource doesn't exist or user can't access it

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User not found"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Show "not found" message
- Provide navigation back to valid pages
- Check if resource was deleted or moved

---

### Rate Limiting Errors

#### RATE_LIMIT_EXCEEDED
- **HTTP Status**: 429
- **Category**: Rate Limiting
- **Retryable**: Yes (after delay)
- **Retry After**: Seconds until next attempt allowed
- **Description**: Rate limit exceeded for endpoint

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds",
    "details": {
      "retryAfter": 60
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Response Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642694400
Retry-After: 60
```

**Handling Strategy**:
- Show countdown timer to user
- Disable submit button until retry time
- Implement exponential backoff for automatic retries

---

#### TOO_MANY_REQUESTS
- **HTTP Status**: 429
- **Category**: Rate Limiting
- **Retryable**: Yes (after longer delay)
- **Retry After**: Seconds until next attempt allowed
- **Description**: Excessive requests, longer block applied

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests. Try again in 300 seconds",
    "details": {
      "retryAfter": 300
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Show longer wait time to user
- Consider implementing CAPTCHA
- Log potential abuse attempts

---

### Server Errors

#### INTERNAL_SERVER_ERROR
- **HTTP Status**: 500
- **Category**: Server Error
- **Retryable**: Yes (with exponential backoff)
- **Description**: Unexpected server error

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Show generic error message to user
- Implement retry with exponential backoff
- Log error details for debugging
- Provide fallback functionality if possible

---

#### DATABASE_CONNECTION_ERROR
- **HTTP Status**: 500
- **Category**: Server Error
- **Retryable**: Yes
- **Description**: Database connection failure

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_CONNECTION_ERROR",
    "message": "Database temporarily unavailable. Please try again later."
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Implement retry logic
- Show maintenance message if persistent
- Provide offline functionality if available

---

#### EXTERNAL_API_ERROR
- **HTTP Status**: 500
- **Category**: Server Error
- **Retryable**: Yes
- **Description**: External service failure
- **Details**: May contain service name

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "EXTERNAL_API_ERROR",
    "message": "External API error from email service",
    "details": {
      "service": "email service"
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Retry with exponential backoff
- Provide alternative functionality
- Inform user of service-specific issues

---

#### EMAIL_SERVICE_ERROR
- **HTTP Status**: 500
- **Category**: Server Error
- **Retryable**: Yes
- **Description**: Email service failure

**Example Response:**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_SERVICE_ERROR",
    "message": "Email service temporarily unavailable. Please try again later."
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Handling Strategy**:
- Allow user to retry email operations
- Provide alternative contact methods
- Queue email for later delivery if possible

---

## Error Handling Best Practices

### Client-Side Error Handling

#### 1. Categorize Errors
```javascript
function handleApiError(error) {
  switch (error.code) {
    case 'TOKEN_EXPIRED':
      return refreshTokenAndRetry();
    case 'INVALID_INPUT':
      return showValidationErrors(error.details.validationErrors);
    case 'RATE_LIMIT_EXCEEDED':
      return showRateLimitMessage(error.details.retryAfter);
    case 'INTERNAL_SERVER_ERROR':
      return retryWithBackoff();
    default:
      return showGenericError(error.message);
  }
}
```

#### 2. Implement Retry Logic
```javascript
async function apiCallWithRetry(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function isRetryableError(error) {
  const retryableCodes = [
    'INTERNAL_SERVER_ERROR',
    'DATABASE_CONNECTION_ERROR',
    'EXTERNAL_API_ERROR',
    'EMAIL_SERVICE_ERROR',
    'RATE_LIMIT_EXCEEDED'
  ];
  return retryableCodes.includes(error.code);
}
```

#### 3. User-Friendly Messages
```javascript
const errorMessages = {
  'INVALID_CREDENTIALS': 'The email or password you entered is incorrect. Please try again.',
  'EMAIL_NOT_VERIFIED': 'Please check your email and click the verification link before logging in.',
  'ACCOUNT_LOCKED': 'Your account has been temporarily restricted. Please contact support.',
  'RATE_LIMIT_EXCEEDED': 'You\'ve made too many attempts. Please wait before trying again.',
  'INTERNAL_SERVER_ERROR': 'Something went wrong on our end. Please try again in a moment.'
};

function getUserFriendlyMessage(errorCode, defaultMessage) {
  return errorMessages[errorCode] || defaultMessage;
}
```

### Server-Side Error Handling

#### 1. Consistent Error Responses
```typescript
function createErrorResponse(error: BaseError, correlationId: string): NextResponse {
  return NextResponse.json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      field: error.field,
      details: error.details
    },
    timestamp: new Date().toISOString(),
    correlationId
  }, { status: error.statusCode });
}
```

#### 2. Error Logging
```typescript
function logError(error: BaseError, context: RequestContext) {
  logger.error('API Error', {
    code: error.code,
    message: error.message,
    correlationId: context.correlationId,
    userId: context.userId,
    endpoint: context.endpoint,
    stack: error.stack
  });
}
```

### Monitoring and Alerting

#### 1. Error Rate Monitoring
- Track error rates by endpoint
- Alert on unusual error spikes
- Monitor specific error codes

#### 2. User Impact Analysis
- Track user-affecting errors
- Monitor authentication failures
- Analyze rate limiting effectiveness

#### 3. Performance Impact
- Monitor error response times
- Track retry patterns
- Analyze error recovery success rates

## Correlation IDs

Every error response includes a `correlationId` that can be used to:

- **Track Requests**: Follow a request through all system components
- **Debug Issues**: Correlate logs across services
- **Support Cases**: Provide specific error reference to support
- **Performance Analysis**: Analyze request patterns and timing

### Using Correlation IDs

1. **Client Logging**: Log correlation IDs for debugging
2. **Support Tickets**: Include correlation ID in error reports
3. **Monitoring**: Use correlation IDs to trace issues
4. **Analytics**: Analyze error patterns by correlation ID

## Testing Error Scenarios

### Unit Testing
```javascript
describe('Error Handling', () => {
  it('should handle validation errors correctly', async () => {
    const response = await api.post('/auth/signup', {
      email: 'invalid-email'
    });
    
    expect(response.error.code).toBe('INVALID_INPUT');
    expect(response.error.details.validationErrors).toContainEqual({
      field: 'email',
      message: 'Please enter a valid email address'
    });
  });
});
```

### Integration Testing
```javascript
describe('Rate Limiting', () => {
  it('should return rate limit error after exceeding limit', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      await api.post('/auth/login', invalidCredentials);
    }
    
    // Next request should be rate limited
    const response = await api.post('/auth/login', invalidCredentials);
    expect(response.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.error.details.retryAfter).toBeGreaterThan(0);
  });
});
```