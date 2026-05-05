# API Documentation

Welcome to the Kavach API documentation. This comprehensive guide covers all available endpoints, authentication methods, request/response formats, and usage examples for the Kavach authentication and user management system.

## Overview

The Kavach API is a RESTful API built with Next.js that provides authentication, user management, profile management, and administrative functionality. All endpoints are versioned and follow consistent patterns for requests and responses.

### Base URL

```
https://your-domain.com/api/v1
```

### API Version

Current API version: **v1**

All endpoints are prefixed with `/api/v1/` to ensure version compatibility.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with both access tokens and refresh tokens:

- **Access Token**: Short-lived token (15 minutes) for API requests
- **Refresh Token**: Long-lived token (7 days) for obtaining new access tokens

### Authentication Methods

1. **Cookie-based Authentication** (Recommended for web applications)
   - Tokens are automatically managed via HTTP-only cookies
   - More secure against XSS attacks
   - Automatically included in requests

2. **Header-based Authentication** (For API clients)
   - Include access token in Authorization header
   - Format: `Authorization: Bearer <access_token>`

### Session Management

The API maintains user sessions with the following information:
- User ID and email
- User role (customer, expert, admin)
- Email verification status
- Profile completion status
- Account approval status

## Request/Response Format

### Request Format

All API requests should:
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Include `Content-Type: application/json` header for requests with body
- Send data as JSON in the request body (for POST/PUT requests)

### Response Format

All API responses follow a consistent structure:

#### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Optional success message",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "field": "fieldName", // Optional, for validation errors
    "details": {
      // Additional error details
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

### Rate Limit Headers

All responses include rate limiting headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
Retry-After: 60 (only when rate limited)
```

### Rate Limits by Endpoint

| Endpoint Type | Limit | Window | Block Duration |
|---------------|-------|--------|----------------|
| Login | 5 attempts | 15 minutes | 30 minutes |
| Signup | 3 attempts | 1 hour | 1 hour |
| Email Verification | 10 attempts | 1 hour | 1 hour |
| Resend Verification | 3 attempts | 1 hour | 2 hours |
| Admin Login | 3 attempts | 15 minutes | 1 hour |

## Error Codes

The API uses standardized error codes for consistent error handling:

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_INPUT` | Invalid request data | 400 |
| `INVALID_CREDENTIALS` | Invalid login credentials | 401 |
| `TOKEN_EXPIRED` | Access token has expired | 401 |
| `TOKEN_INVALID` | Invalid or malformed token | 401 |
| `EMAIL_NOT_VERIFIED` | Email verification required | 401 |
| `ACCOUNT_LOCKED` | Account is banned or paused | 403 |
| `INSUFFICIENT_PERMISSIONS` | Insufficient permissions | 403 |
| `ACCESS_DENIED` | Access denied | 403 |
| `RESOURCE_NOT_FOUND` | Resource not found | 404 |
| `DUPLICATE_ENTRY` | Duplicate data (e.g., email) | 409 |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | 429 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |

## API Sections

### [Authentication](./authentication.md)
Complete authentication endpoints including login, signup, logout, email verification, and token refresh.

### [User Management](./user-management.md)
User profile management, password changes, and account operations.

### [Admin](./admin.md)
Administrative endpoints for user management, statistics, and system operations.

### [Profiles](./profiles.md)
Customer and expert profile creation and management.

### [Error Codes](./error-codes.md)
Comprehensive error code reference with descriptions and handling guidance.

### [Rate Limiting](./rate-limiting.md)
Detailed rate limiting information and best practices.

### [Examples](./examples/)
Code examples in multiple languages and formats:
- [JavaScript/TypeScript Examples](./examples/javascript.md)
- [cURL Examples](./examples/curl.md)
- [Postman Collection](./examples/postman.md)

## Getting Started

1. **Authentication**: Start with the [Authentication](./authentication.md) section to understand how to authenticate users
2. **User Management**: Learn about user operations in [User Management](./user-management.md)
3. **Profiles**: Understand profile management in [Profiles](./profiles.md)
4. **Examples**: Check out practical examples in the [Examples](./examples/) directory

## Support

For API support and questions:
- Check the error codes and troubleshooting guides
- Review the examples for common use cases
- Ensure you're following rate limiting guidelines
- Verify your authentication implementation

## Changelog

### v1.0.0 (Current)
- Initial API release
- Authentication endpoints
- User management
- Profile management
- Admin functionality
- Rate limiting
- Comprehensive error handling