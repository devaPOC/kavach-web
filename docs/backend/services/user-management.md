# User Management Service

## Overview

The User Management Service handles user profile operations, account management, and basic user data operations. It provides functionality for updating user profiles, changing passwords, managing account settings, and retrieving user information with proper authorization controls.

## Architecture

The User Management Service integrates with multiple system components:

```mermaid
graph TD
    A[API Routes] --> B[User Controller]
    B --> C[User Service]
    C --> D[User Repository]
    C --> E[Password Utils]
    C --> F[Audit Logger]
    
    D --> G[Database]
    E --> H[bcrypt]
    F --> I[Audit System]
    
    C --> J[Base Service]
    J --> K[Error Handling]
    J --> L[Metrics Recording]
```

## Core Features

### Profile Management

Handles user profile updates including personal information and account settings.

**Supported Operations:**
- Get user profile by ID
- Update user profile information
- Retrieve user by email (admin function)
- Account deletion with proper cleanup

### Password Management

Secure password change functionality with current password verification.

**Security Features:**
- Current password verification required
- New password strength validation
- Password hashing with bcrypt
- Audit logging for password changes

### Account Operations

Basic account management operations with proper authorization.

**Features:**
- Account deletion with cascade cleanup
- Profile information retrieval
- Admin-level user lookup operations

## API Methods

### getProfile(userId)

Retrieves a user's profile information by user ID.

**Parameters:**
- `userId: string` - The user's unique identifier

**Returns:** `ServiceResult<UserProfile>`

**Example:**
```typescript
const result = await userService.getProfile('user_123');

if (result.success) {
  console.log('User profile:', result.data);
  // {
  //   id: 'user_123',
  //   email: 'user@example.com',
  //   firstName: 'John',
  //   lastName: 'Doe',
  //   role: 'customer',
  //   isEmailVerified: true,
  //   isProfileCompleted: true,
  //   isApproved: true,
  //   createdAt: '2024-01-01T00:00:00Z',
  //   updatedAt: '2024-01-15T10:30:00Z'
  // }
}
```

### updateProfile(userId, data)

Updates a user's profile information.

**Parameters:**
- `userId: string` - The user's unique identifier
- `data: UpdateProfileData` - Profile update data

**Returns:** `ServiceResult<UserProfile>`

**Example:**
```typescript
const result = await userService.updateProfile('user_123', {
  firstName: 'Jane',
  lastName: 'Smith'
});

if (result.success) {
  console.log('Profile updated:', result.data);
}
```

### changePassword(userId, data)

Changes a user's password with current password verification.

**Parameters:**
- `userId: string` - The user's unique identifier
- `data: ChangePasswordData` - Password change data

**Returns:** `ServiceResult<{ message: string }>`

**Example:**
```typescript
const result = await userService.changePassword('user_123', {
  currentPassword: 'oldPassword123',
  newPassword: 'newSecurePassword456'
});

if (result.success) {
  console.log('Password changed successfully');
}
```

### deleteAccount(userId)

Deletes a user account and all associated data.

**Parameters:**
- `userId: string` - The user's unique identifier

**Returns:** `ServiceResult<{ message: string }>`

**Example:**
```typescript
const result = await userService.deleteAccount('user_123');

if (result.success) {
  console.log('Account deleted successfully');
}
```

### getUserByEmail(email, requestingUserId)

Retrieves a user by email address (admin function only).

**Parameters:**
- `email: string` - The user's email address
- `requestingUserId: string` - The ID of the admin making the request

**Returns:** `ServiceResult<UserProfile>`

**Example:**
```typescript
const result = await userService.getUserByEmail(
  'user@example.com',
  'admin_123'
);

if (result.success) {
  console.log('User found:', result.data);
}
```

## Data Types

### UserProfile
```typescript
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'expert' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### UpdateProfileData
```typescript
interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}
```

### ChangePasswordData
```typescript
interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}
```

## Security Features

### Authorization Controls

The service implements proper authorization controls:

1. **User-Level Access** - Users can only access their own profile data
2. **Admin-Level Access** - Admins can access any user's profile
3. **Password Verification** - Current password required for password changes
4. **Account Ownership** - Users can only modify their own accounts

### Password Security

Password management follows security best practices:

```typescript
// Password change process
1. Verify current password against stored hash
2. Validate new password strength
3. Hash new password with bcrypt
4. Update password in database
5. Log password change event
```

### Audit Logging

All user management operations are logged for security and compliance:

- Profile updates
- Password changes
- Account deletions
- Admin access to user data

## Error Handling

The service uses structured error handling with specific error codes:

### Error Types

1. **User Not Found** - `AUTH_ERROR_CODES.INVALID_CREDENTIALS`
2. **Access Denied** - `AUTH_ERROR_CODES.ACCESS_DENIED`
3. **Invalid Password** - `AUTH_ERROR_CODES.INVALID_CREDENTIALS`
4. **Update Failed** - `AUTH_ERROR_CODES.UNKNOWN`

### Error Response Format

```typescript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE"
}
```

### Common Error Scenarios

```typescript
// User not found
{
  success: false,
  error: "User not found.",
  code: "INVALID_CREDENTIALS"
}

// Access denied for admin functions
{
  success: false,
  error: "Access denied.",
  code: "ACCESS_DENIED"
}

// Invalid current password
{
  success: false,
  error: "Current password is incorrect.",
  code: "INVALID_CREDENTIALS"
}
```

## Validation

### Profile Update Validation

Profile updates are validated for:
- Field length limits
- Data type validation
- Required field presence
- Character encoding validation

### Password Validation

Password changes are validated for:
- Current password verification
- New password strength requirements
- Password complexity rules
- Password history (if implemented)

## Database Operations

### Profile Updates

Profile updates use atomic database operations:

```typescript
// Update user profile
const updatedUser = await userRepository.update(userId, {
  firstName: data.firstName,
  lastName: data.lastName
});
```

### Password Changes

Password changes involve secure hash updates:

```typescript
// Hash new password
const newPasswordHash = await hashPassword(data.newPassword);

// Update password in database
const updatedUser = await userRepository.update(userId, {
  passwordHash: newPasswordHash
});
```

### Account Deletion

Account deletion cascades to related records:

```typescript
// Delete user and related data
const deleted = await userRepository.delete(userId);
// This cascades to:
// - User sessions
// - Email verification tokens
// - Profile data
// - Audit logs (marked as deleted user)
```

## Testing

### Unit Tests

The service includes comprehensive unit tests:

```typescript
describe('UserService', () => {
  describe('getProfile', () => {
    it('should return user profile for valid user ID');
    it('should return error for non-existent user');
  });

  describe('updateProfile', () => {
    it('should update profile with valid data');
    it('should validate profile data');
    it('should return error for non-existent user');
  });

  describe('changePassword', () => {
    it('should change password with valid current password');
    it('should reject invalid current password');
    it('should validate new password strength');
  });

  describe('deleteAccount', () => {
    it('should delete account successfully');
    it('should handle non-existent user');
  });

  describe('getUserByEmail', () => {
    it('should return user for admin request');
    it('should deny access for non-admin');
  });
});
```

### Integration Tests

Integration tests verify:
- Database operations
- Password hashing integration
- Audit logging functionality
- Error handling flows

## Performance Considerations

### Database Optimization

1. **Indexed Queries** - User lookups use indexed fields (ID, email)
2. **Selective Updates** - Only modified fields are updated
3. **Connection Pooling** - Efficient database connection management

### Password Hashing

1. **Configurable Rounds** - bcrypt rounds can be tuned for performance
2. **Async Operations** - Password operations don't block other requests
3. **Memory Management** - Proper cleanup of password data

### Caching Considerations

While the current implementation doesn't include caching, consider:
- User profile caching for frequently accessed data
- Session-based caching for repeated profile requests
- Cache invalidation on profile updates

## Usage Examples

### Basic Profile Operations

```typescript
// Get user profile
const profile = await userService.getProfile('user_123');
if (profile.success) {
  console.log(`User: ${profile.data.firstName} ${profile.data.lastName}`);
}

// Update profile
const updateResult = await userService.updateProfile('user_123', {
  firstName: 'Jane',
  lastName: 'Smith'
});

if (updateResult.success) {
  console.log('Profile updated successfully');
}
```

### Password Management

```typescript
// Change password
const passwordResult = await userService.changePassword('user_123', {
  currentPassword: 'oldPassword123',
  newPassword: 'newSecurePassword456'
});

if (!passwordResult.success) {
  if (passwordResult.code === 'INVALID_CREDENTIALS') {
    console.log('Current password is incorrect');
  }
}
```

### Admin Operations

```typescript
// Admin lookup user by email
const userResult = await userService.getUserByEmail(
  'user@example.com',
  'admin_123'
);

if (userResult.success) {
  console.log('Found user:', userResult.data);
} else if (userResult.code === 'ACCESS_DENIED') {
  console.log('Admin access required');
}
```

### Error Handling

```typescript
const result = await userService.updateProfile(userId, profileData);

if (!result.success) {
  switch (result.code) {
    case 'INVALID_CREDENTIALS':
      console.log('User not found');
      break;
    case 'UNKNOWN':
      console.log('Update failed, please try again');
      break;
    default:
      console.log('Unexpected error:', result.error);
  }
}
```

## Best Practices

### Security Best Practices

1. **Validate User Ownership** - Always verify user owns the data being modified
2. **Require Current Password** - For sensitive operations like password changes
3. **Log Security Events** - Audit all profile and password changes
4. **Sanitize Input Data** - Clean and validate all input data
5. **Use Secure Comparisons** - Use timing-safe comparisons for passwords

### Development Best Practices

1. **Use TypeScript Types** - Leverage strong typing for data structures
2. **Handle Errors Gracefully** - Provide meaningful error messages
3. **Write Comprehensive Tests** - Cover all success and failure scenarios
4. **Follow Service Patterns** - Maintain consistency with other services
5. **Document Security Decisions** - Explain authorization and validation logic

## Troubleshooting

### Common Issues

1. **Profile Update Failures**
   - Check user existence in database
   - Verify data validation rules
   - Review database constraints

2. **Password Change Issues**
   - Verify current password verification logic
   - Check password hashing configuration
   - Review password strength requirements

3. **Access Denied Errors**
   - Verify user authentication status
   - Check admin role verification
   - Review authorization logic

4. **Database Connection Issues**
   - Check database connection configuration
   - Verify connection pool settings
   - Review database permissions

### Debug Information

Enable debug logging for troubleshooting:

```bash
DEBUG=user:* npm run dev
```

This provides detailed logging for:
- Profile update operations
- Password change attempts
- Database query execution
- Authorization checks
- Error handling flows

## Dependencies

### Internal Dependencies
- `BaseService` - Base service functionality
- `userRepository` - User data access layer
- `passwordUtils` - Password hashing utilities
- `AUTH_ERROR_CODES` - Error code constants

### External Dependencies
- `bcrypt` - Password hashing
- `drizzle-orm` - Database operations

## Configuration

### Environment Variables

```bash
# Password Hashing
BCRYPT_ROUNDS=12

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Logging Configuration
LOG_LEVEL=info
```

### Service Configuration

```typescript
// Password strength requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false
};
```