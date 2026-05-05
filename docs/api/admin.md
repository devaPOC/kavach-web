# Admin API

This section covers administrative endpoints for user management, system statistics, and administrative operations. All admin endpoints require admin role authentication.

## Overview

Admin endpoints provide comprehensive user management capabilities, system monitoring, and administrative controls. These endpoints are restricted to users with the `admin` role and implement additional security measures.

## Authentication

All admin endpoints require:
- Valid authentication session
- User role must be `admin`
- Additional rate limiting for security

## Endpoints

### POST /api/v1/admin/login

Administrative login endpoint with enhanced security.

#### Request

**Headers:**
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "string (required, admin email)",
  "password": "string (required)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Admin login successful",
    "user": {
      "id": "admin_123",
      "email": "admin@example.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "isEmailVerified": true,
      "isProfileCompleted": true,
      "isApproved": true
    }
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
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (403):**
```json
{
  "success": false,
  "error": {
    "code": "ADMIN_ACCESS_REQUIRED",
    "message": "Admin access required"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Rate Limiting
- 3 login attempts per 15 minutes per IP address
- Blocked for 1 hour after exceeding limit

---

### GET /api/v1/admin/users

Get a paginated list of all users.

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
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
        "createdAt": "2025-01-20T10:30:00.000Z",
        "updatedAt": "2025-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (403):**
```json
{
  "success": false,
  "error": {
    "code": "ADMIN_ACCESS_REQUIRED",
    "message": "Admin access required"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### POST /api/v1/admin/users

Create a new user account (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "email": "string (required, valid email)",
  "firstName": "string (required, 2-50 chars)",
  "lastName": "string (required, 2-50 chars)",
  "password": "string (required, min 8 chars with complexity)",
  "role": "customer | expert | admin (required)"
}
```

#### Response

**Success (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_456",
      "email": "newuser@example.com",
      "firstName": "New",
      "lastName": "User",
      "role": "customer",
      "isEmailVerified": false,
      "isProfileCompleted": false,
      "isApproved": true,
      "createdAt": "2025-01-20T10:35:00.000Z"
    },
    "message": "User created successfully"
  },
  "message": "User created successfully",
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
    "message": "Missing required fields: email, password"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### GET /api/v1/admin/users/{id}

Get detailed information about a specific user.

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

**Path Parameters:**
- `id`: User ID (required)

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
    "updatedAt": "2025-01-20T10:30:00.000Z",
    "profile": {
      // Profile data if available
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (404):**
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

---

### PUT /api/v1/admin/users/{id}

Update a user's information (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`
- `Content-Type: application/json`

**Path Parameters:**
- `id`: User ID (required)

**Body:**
```json
{
  "firstName": "string (optional, 2-50 chars)",
  "lastName": "string (optional, 2-50 chars)",
  "role": "customer | expert | admin (optional)",
  "isEmailVerified": "boolean (optional)"
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
    "role": "expert",
    "isEmailVerified": true,
    "isProfileCompleted": true,
    "isApproved": true,
    "updatedAt": "2025-01-20T10:35:00.000Z"
  },
  "message": "User updated successfully",
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

---

### DELETE /api/v1/admin/users/{id}

Delete a user account (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

**Path Parameters:**
- `id`: User ID (required)

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully",
    "deletedUserId": "user_123"
  },
  "message": "User deleted successfully",
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User not found"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Security Notes
- Deleting a user is irreversible
- All associated data (profiles, sessions) are also deleted
- Admin users cannot delete themselves
- Audit logs are created for user deletions

---

### POST /api/v1/admin/users/{id}/ban

Ban an expert user (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

**Path Parameters:**
- `id`: User ID (required, must be expert role)

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Expert banned successfully",
    "user": {
      "id": "user_123",
      "email": "expert@example.com",
      "role": "expert",
      "isBanned": true,
      "bannedAt": "2025-01-20T10:35:00.000Z"
    }
  },
  "message": "Expert banned successfully",
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
    "message": "Only expert accounts can be banned"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Effects of Banning
- User cannot log in
- All active sessions are invalidated
- User receives "account banned" message on login attempts
- Ban status is recorded with timestamp

---

### DELETE /api/v1/admin/users/{id}/ban

Unban an expert user (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

**Path Parameters:**
- `id`: User ID (required, must be expert role)

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Expert unbanned successfully",
    "user": {
      "id": "user_123",
      "email": "expert@example.com",
      "role": "expert",
      "isBanned": false,
      "bannedAt": null
    }
  },
  "message": "Expert unbanned successfully",
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### POST /api/v1/admin/users/{id}/pause

Pause a customer user (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

**Path Parameters:**
- `id`: User ID (required, must be customer role)

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Customer paused successfully",
    "user": {
      "id": "user_123",
      "email": "customer@example.com",
      "role": "customer",
      "isPaused": true,
      "pausedAt": "2025-01-20T10:35:00.000Z"
    }
  },
  "message": "Customer paused successfully",
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
    "message": "Only customer accounts can be paused"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Effects of Pausing
- User cannot log in
- All active sessions are invalidated
- User receives "account paused" message on login attempts
- Pause status is recorded with timestamp

---

### DELETE /api/v1/admin/users/{id}/pause

Unpause a customer user (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

**Path Parameters:**
- `id`: User ID (required, must be customer role)

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Customer unpaused successfully",
    "user": {
      "id": "user_123",
      "email": "customer@example.com",
      "role": "customer",
      "isPaused": false,
      "pausedAt": null
    }
  },
  "message": "Customer unpaused successfully",
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

## Admin Statistics

### GET /api/v1/admin/stats

Get system statistics and metrics (admin only).

#### Request

**Headers:**
- `Cookie: auth-session=<admin_access_token>`

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "customers": 1000,
      "experts": 240,
      "admins": 10,
      "verified": 1100,
      "unverified": 150,
      "banned": 5,
      "paused": 12
    },
    "profiles": {
      "completed": 950,
      "incomplete": 300,
      "pendingApproval": 45
    },
    "activity": {
      "loginsToday": 156,
      "signupsToday": 23,
      "verificationsToday": 18
    },
    "generatedAt": "2025-01-20T10:30:00.000Z"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Admin Operations

### User Management Operations

1. **Create Users**: Admins can create users with any role
2. **Update Users**: Modify user information and status
3. **Delete Users**: Permanently remove user accounts
4. **Ban/Unban Experts**: Control expert account access
5. **Pause/Unpause Customers**: Control customer account access
6. **Verify Emails**: Force verify user email addresses
7. **Invalidate Sessions**: Force logout users

### System Monitoring

1. **User Statistics**: Monitor user counts and status
2. **Activity Metrics**: Track daily activity
3. **Profile Completion**: Monitor profile completion rates
4. **Approval Queue**: Track pending expert approvals

## Security Considerations

### Admin Authentication
- Enhanced rate limiting (3 attempts per 15 minutes)
- Longer block duration (1 hour)
- Additional audit logging
- Session monitoring

### Authorization Checks
- Role verification on every request
- Admin-only endpoint protection
- Operation-specific permissions
- Audit trail for all admin actions

### Data Protection
- Sensitive data filtering in responses
- Secure password handling
- PII protection in logs
- GDPR compliance considerations

## Error Handling

### Admin-Specific Errors

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `ADMIN_ACCESS_REQUIRED` | Admin role required | 403 |
| `INSUFFICIENT_PERMISSIONS` | Specific admin permission required | 403 |
| `OPERATION_NOT_ALLOWED` | Operation not allowed (e.g., self-deletion) | 400 |
| `USER_NOT_FOUND` | Target user not found | 404 |
| `INVALID_USER_ROLE` | Invalid role for operation | 400 |

### Common Error Scenarios

1. **Non-Admin Access**: Regular users accessing admin endpoints
2. **Self-Operations**: Admins trying to ban/delete themselves
3. **Invalid Role Operations**: Trying to ban customers or pause experts
4. **Missing Users**: Operations on non-existent users
5. **Validation Failures**: Invalid data in create/update operations

## Best Practices

### Admin Client Implementation
1. **Secure Storage**: Store admin tokens securely
2. **Session Management**: Handle admin session expiration
3. **Audit Logging**: Log all admin operations
4. **Confirmation Dialogs**: Confirm destructive operations
5. **Error Handling**: Provide clear error messages

### Security Best Practices
1. **Principle of Least Privilege**: Grant minimal required permissions
2. **Regular Audits**: Review admin actions regularly
3. **Multi-Factor Authentication**: Consider MFA for admin accounts
4. **IP Restrictions**: Consider IP-based access controls
5. **Session Monitoring**: Monitor admin session activity

### Operational Guidelines
1. **Documentation**: Document all admin operations
2. **Backup**: Backup before destructive operations
3. **Testing**: Test admin operations in staging
4. **Monitoring**: Monitor system health after changes
5. **Communication**: Communicate user-affecting changes