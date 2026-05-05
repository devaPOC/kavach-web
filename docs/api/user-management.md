# User Management API

This section covers user management endpoints including profile operations, password changes, and account management.

## Overview

User management endpoints allow authenticated users to manage their own accounts and profiles. These endpoints require authentication and implement proper authorization checks.

## Endpoints

### GET /api/v1/users/profile

Get the current user's profile information.

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
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication required"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### PUT /api/v1/users/profile

Update the current user's basic profile information.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "firstName": "string (optional, 2-50 chars)",
  "lastName": "string (optional, 2-50 chars)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "customer",
    "isEmailVerified": true,
    "isProfileCompleted": true,
    "isApproved": true,
    "updatedAt": "2025-01-20T10:35:00.000Z"
  },
  "message": "Profile updated successfully",
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "No update data provided"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400) - Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed",
    "details": {
      "validationErrors": [
        {
          "field": "firstName",
          "message": "Must be at least 2 characters long"
        }
      ]
    }
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### POST /api/v1/users/change-password

Change the current user's password.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 8 chars with complexity requirements)"
}
```

**New Password Requirements:**
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  },
  "message": "Password updated successfully",
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400) - Invalid Current Password:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Current password is incorrect"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400) - Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Missing required fields: newPassword"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (400) - Password Complexity:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Password validation failed",
    "details": {
      "validationErrors": [
        {
          "field": "newPassword",
          "message": "Password must contain at least one uppercase letter"
        }
      ]
    }
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Security Notes
- Current password must be provided for verification
- New password is validated against complexity requirements
- Password is hashed before storage
- All user sessions are invalidated after password change (optional implementation)

---

## User Account Status

Users can have different account statuses that affect their ability to use the system:

### Account Status Fields

| Field | Type | Description |
|-------|------|-------------|
| `isEmailVerified` | boolean | Whether the user's email has been verified |
| `isProfileCompleted` | boolean | Whether the user has completed their profile |
| `isApproved` | boolean | Whether the user account is approved (mainly for experts) |
| `isBanned` | boolean | Whether the user account is banned (experts only) |
| `isPaused` | boolean | Whether the user account is paused (customers only) |
| `bannedAt` | string/null | Timestamp when the account was banned |
| `pausedAt` | string/null | Timestamp when the account was paused |
| `approvedAt` | string/null | Timestamp when the account was approved |

### Status Combinations

#### Customer Account States
1. **New Customer**: `isEmailVerified: false, isProfileCompleted: false, isApproved: true`
2. **Verified Customer**: `isEmailVerified: true, isProfileCompleted: false, isApproved: true`
3. **Complete Customer**: `isEmailVerified: true, isProfileCompleted: true, isApproved: true`
4. **Paused Customer**: `isPaused: true` (cannot log in)

#### Expert Account States
1. **New Expert**: `isEmailVerified: false, isProfileCompleted: false, isApproved: false`
2. **Verified Expert**: `isEmailVerified: true, isProfileCompleted: false, isApproved: false`
3. **Pending Expert**: `isEmailVerified: true, isProfileCompleted: true, isApproved: false`
4. **Approved Expert**: `isEmailVerified: true, isProfileCompleted: true, isApproved: true`
5. **Banned Expert**: `isBanned: true` (cannot log in)

## User Roles

The system supports three user roles:

### Customer (`customer`)
- Can create customer profiles
- Can access customer-specific features
- Account can be paused by administrators
- Automatically approved upon registration

### Expert (`expert`)
- Can create expert profiles
- Requires manual approval after profile completion
- Account can be banned by administrators
- Must complete profile before approval

### Admin (`admin`)
- Can access all administrative functions
- Can manage other users
- Cannot be banned or paused
- Has elevated permissions

## Profile Completion Requirements

### Customer Profile Completion
Customers must provide:
- Basic personal information (optional fields)
- Contact information
- Location details

### Expert Profile Completion
Experts must provide:
- All customer profile fields
- Professional experience
- Areas of specialization
- Certifications
- Employment status
- Availability preferences
- Payment method preferences

## Error Handling

### Common Error Scenarios

1. **Authentication Required (401)**
   - No valid session token
   - Token expired
   - Invalid token format

2. **Validation Errors (400)**
   - Missing required fields
   - Invalid field formats
   - Password complexity not met
   - Name format validation failures

3. **Authorization Errors (403)**
   - Insufficient permissions
   - Account banned or paused
   - Role-specific restrictions

4. **Not Found Errors (404)**
   - User profile not found
   - Invalid user ID

### Error Response Format

All user management endpoints follow the standard error response format:

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
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Security Considerations

### Authentication
- All endpoints require valid authentication
- Session tokens are validated on each request
- Expired tokens are automatically rejected

### Authorization
- Users can only access their own profile data
- Role-based access control enforced
- Account status checks performed

### Data Validation
- All input data is validated
- SQL injection prevention
- XSS protection through proper encoding

### Password Security
- Current password verification required for changes
- Strong password complexity requirements
- Secure password hashing (bcrypt)
- Optional session invalidation after password change

## Best Practices

### Client Implementation
1. **Handle Authentication Errors**: Implement proper token refresh logic
2. **Validate Input**: Validate data on client side before sending
3. **Error Handling**: Provide user-friendly error messages
4. **Security**: Never store passwords or tokens in local storage

### API Usage
1. **Use HTTPS**: Always use secure connections
2. **Handle Rate Limits**: Implement proper retry logic
3. **Correlation IDs**: Use correlation IDs for debugging
4. **Error Logging**: Log errors for monitoring and debugging