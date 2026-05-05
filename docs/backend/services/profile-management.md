# Profile Management Service

## Overview

The Profile Management Service handles the creation, updating, and management of user profiles for both customers and experts. It provides comprehensive profile management with atomic transactions, validation, audit logging, and session synchronization. The service supports role-specific profile types with different data requirements and approval workflows.

## Architecture

The Profile Management Service uses a transaction-based architecture for data consistency:

```mermaid
graph TD
    A[API Routes] --> B[Profile Controller]
    B --> C[Profile Service]
    C --> D[Transaction Service]
    C --> E[Validation Service]
    C --> F[Session Manager]
    
    D --> G[Profile Transaction]
    G --> H[Database]
    
    E --> I[Validation Schemas]
    F --> J[JWT Session Management]
    
    C --> K[Audit Logger]
    K --> L[Audit System]
```

## Core Features

### Profile Types

The service supports two distinct profile types:

1. **Customer Profiles** - For service consumers
2. **Expert Profiles** - For service providers (requires approval)

### Transaction-Based Operations

All profile operations use atomic transactions to ensure data consistency:
- Profile creation with user status updates
- Profile updates with audit logging
- Profile approval/rejection workflows
- Profile deletion with cleanup

### Validation and Security

- Comprehensive input validation using unified validation service
- Role-based access control
- Audit logging for all operations
- Session synchronization after profile changes

## API Methods

### getUserProfile(userId, context?)

Retrieves a user's profile data including both user information and role-specific profile.

**Parameters:**
- `userId: string` - The user's unique identifier
- `context?: RequestContext` - Optional request context for error tracking

**Returns:** `ProfileData | null`

**Example:**
```typescript
const profile = await profileService.getUserProfile('user_123');

if (profile) {
  console.log('User:', profile.user);
  console.log('Profile:', profile.profile);
  console.log('Type:', profile.type); // 'customer' or 'expert'
}
```

### createExpertProfile(userId, data, context?)

Creates a new expert profile with comprehensive validation and transaction safety.

**Parameters:**
- `userId: string` - The user's unique identifier
- `data: CreateExpertProfileData` - Expert profile data
- `context?: RequestContext` - Optional request context

**Returns:** `TransactionResult<ProfileCreationResult>`

**Example:**
```typescript
const result = await profileService.createExpertProfile('user_123', {
  bio: 'Experienced software developer with 10+ years in web development',
  expertise: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  experience: 'Senior Full-Stack Developer at TechCorp',
  education: 'BS Computer Science, University of Technology',
  certifications: ['AWS Certified Developer', 'Google Cloud Professional'],
  hourlyRate: 75,
  availability: 'weekdays',
  languages: ['English', 'Spanish'],
  timezone: 'America/New_York',
  portfolioUrl: 'https://johndoe.dev',
  linkedinUrl: 'https://linkedin.com/in/johndoe',
  githubUrl: 'https://github.com/johndoe'
});

if (result.success) {
  console.log('Expert profile created:', result.data.profile);
}
```

### createCustomerProfile(userId, data, context?)

Creates a new customer profile with validation and transaction safety.

**Parameters:**
- `userId: string` - The user's unique identifier
- `data: CreateCustomerProfileData` - Customer profile data
- `context?: RequestContext` - Optional request context

**Returns:** `TransactionResult<ProfileCreationResult>`

**Example:**
```typescript
const result = await profileService.createCustomerProfile('user_123', {
  company: 'TechStartup Inc.',
  industry: 'Technology',
  companySize: '11-50',
  jobTitle: 'CTO',
  bio: 'Looking for expert developers to help build our next-generation platform',
  interests: ['Web Development', 'Mobile Apps', 'Cloud Architecture'],
  budget: 'medium',
  projectTypes: ['web-development', 'mobile-development'],
  preferredCommunication: 'email',
  timezone: 'America/New_York'
});

if (result.success) {
  console.log('Customer profile created:', result.data.profile);
}
```

### updateExpertProfile(userId, data, context?)

Updates an existing expert profile with partial data.

**Parameters:**
- `userId: string` - The user's unique identifier
- `data: Partial<CreateExpertProfileData>` - Partial expert profile update data
- `context?: RequestContext` - Optional request context

**Returns:** `TransactionResult<any>`

**Example:**
```typescript
const result = await profileService.updateExpertProfile('user_123', {
  hourlyRate: 85,
  availability: 'flexible',
  expertise: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python']
});

if (result.success) {
  console.log('Expert profile updated');
}
```

### updateCustomerProfile(userId, data, context?)

Updates an existing customer profile with partial data.

**Parameters:**
- `userId: string` - The user's unique identifier
- `data: Partial<CreateCustomerProfileData>` - Partial customer profile update data
- `context?: RequestContext` - Optional request context

**Returns:** `TransactionResult<any>`

### approveExpertProfile(userId, adminUserId, context?)

Approves an expert profile (admin only operation).

**Parameters:**
- `userId: string` - The expert user's ID
- `adminUserId: string` - The admin user's ID
- `context?: RequestContext` - Optional request context

**Returns:** `TransactionResult<any>`

**Example:**
```typescript
const result = await profileService.approveExpertProfile(
  'expert_123',
  'admin_456'
);

if (result.success) {
  console.log('Expert profile approved');
}
```

### rejectExpertProfile(userId, adminUserId, context?)

Rejects an expert profile (admin only operation).

**Parameters:**
- `userId: string` - The expert user's ID
- `adminUserId: string` - The admin user's ID
- `context?: RequestContext` - Optional request context

**Returns:** `TransactionResult<any>`

### deleteProfile(userId, profileType, context?)

Deletes a user profile and updates user status.

**Parameters:**
- `userId: string` - The user's unique identifier
- `profileType: 'expert' | 'customer'` - Type of profile to delete
- `context?: RequestContext` - Optional request context

**Returns:** `TransactionResult<any>`

## Data Types

### ProfileData
```typescript
interface ProfileData {
  user: User;
  profile: ExpertProfile | CustomerProfile | null;
  type: 'expert' | 'customer';
}
```

### CreateExpertProfileData
```typescript
interface CreateExpertProfileData {
  bio: string;
  expertise: string[];
  experience: string;
  education?: string;
  certifications?: string[];
  hourlyRate: number;
  availability: string;
  languages: string[];
  timezone: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}
```

### CreateCustomerProfileData
```typescript
interface CreateCustomerProfileData {
  company?: string;
  industry?: string;
  companySize?: string;
  jobTitle?: string;
  bio: string;
  interests: string[];
  budget: string;
  projectTypes: string[];
  preferredCommunication: string;
  timezone: string;
}
```

### TransactionResult
```typescript
interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### ProfileCreationResult
```typescript
interface ProfileCreationResult {
  user: User;
  profile: ExpertProfile | CustomerProfile;
}
```

## Transaction Management

### Atomic Operations

All profile operations use database transactions to ensure consistency:

```typescript
// Example transaction flow for profile creation
const result = await transactionService.executeInTransaction(
  async (tx) => {
    // 1. Create profile record
    const profile = await ProfileTransaction.createExpertProfile(tx, userId, data);
    
    // 2. Update user status
    const user = await ProfileTransaction.updateUserStatus(tx, userId, {
      isProfileCompleted: true
    });
    
    // 3. Create audit log
    await ProfileTransaction.createAuditLog(tx, {
      userId,
      action: 'profile.expert.created',
      details: { profileId: profile.id }
    });
    
    return { user, profile };
  },
  'create-expert-profile'
);
```

### Transaction Benefits

1. **Data Consistency** - All related changes succeed or fail together
2. **Audit Integrity** - Audit logs are created atomically with changes
3. **Session Synchronization** - User status updates are consistent
4. **Error Recovery** - Failed operations don't leave partial data

## Validation

### Expert Profile Validation

Expert profiles undergo comprehensive validation:

```typescript
// Required fields
- bio (minimum length, maximum length)
- expertise (array of valid skills)
- experience (professional experience description)
- hourlyRate (positive number, reasonable range)
- availability (valid availability option)
- languages (array of valid language codes)
- timezone (valid timezone identifier)

// Optional fields
- education (educational background)
- certifications (professional certifications)
- portfolioUrl (valid URL format)
- linkedinUrl (valid LinkedIn URL)
- githubUrl (valid GitHub URL)
```

### Customer Profile Validation

Customer profiles have different validation requirements:

```typescript
// Required fields
- bio (minimum length, maximum length)
- interests (array of valid interest categories)
- budget (valid budget range)
- projectTypes (array of valid project types)
- preferredCommunication (valid communication method)
- timezone (valid timezone identifier)

// Optional fields
- company (company name)
- industry (industry category)
- companySize (valid company size range)
- jobTitle (job title/position)
```

### Validation Error Handling

Validation errors are returned with detailed field-specific messages:

```typescript
{
  success: false,
  error: "Validation failed",
  details: {
    hourlyRate: "Hourly rate must be between $10 and $500",
    expertise: "At least one area of expertise is required",
    timezone: "Invalid timezone identifier"
  }
}
```

## Security Features

### Authorization

Profile operations include proper authorization checks:

1. **Profile Ownership** - Users can only modify their own profiles
2. **Admin Operations** - Only admins can approve/reject expert profiles
3. **Role Validation** - Profile type must match user role
4. **Status Checks** - Verify user account status before operations

### Audit Logging

Comprehensive audit logging for compliance and security:

```typescript
// Audit log entries include:
{
  userId: 'user_123',
  action: 'profile.expert.created',
  details: { profileId: 'profile_456' },
  timestamp: new Date(),
  requestId: 'req_789'
}
```

### Session Synchronization

Profile changes automatically update user sessions:

```typescript
// After profile creation/update
const updatedSessionData = {
  userId: user.id,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isProfileCompleted: user.isProfileCompleted,
  isApproved: user.isApproved
};

await sessionManager.createSession(updatedSessionData);
```

## Error Handling

### Error Types

The service uses structured error handling:

1. **ProfileError** - Profile-specific errors
2. **ValidationError** - Input validation failures
3. **TransactionError** - Database transaction failures

### Error Codes

```typescript
enum ProfileErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROFILE_CREATION_FAILED = 'PROFILE_CREATION_FAILED',
  PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED',
  PROFILE_APPROVAL_FAILED = 'PROFILE_APPROVAL_FAILED',
  PROFILE_REJECTION_FAILED = 'PROFILE_REJECTION_FAILED',
  PROFILE_DELETION_FAILED = 'PROFILE_DELETION_FAILED'
}
```

### Error Response Format

```typescript
{
  success: false,
  error: "Profile creation failed",
  code: "PROFILE_CREATION_FAILED",
  correlationId: "req_123"
}
```

## Testing

### Unit Tests

Comprehensive unit tests cover all service methods:

```typescript
describe('ProfileService', () => {
  describe('createExpertProfile', () => {
    it('should create expert profile with valid data');
    it('should validate required fields');
    it('should handle transaction failures');
    it('should update user session after creation');
  });

  describe('createCustomerProfile', () => {
    it('should create customer profile with valid data');
    it('should validate profile data');
    it('should handle validation errors');
  });

  describe('updateExpertProfile', () => {
    it('should update profile with partial data');
    it('should validate updated fields');
    it('should maintain data consistency');
  });

  describe('approveExpertProfile', () => {
    it('should approve expert profile');
    it('should update user approval status');
    it('should create audit log entry');
  });
});
```

### Integration Tests

Integration tests verify:
- Database transaction handling
- Session manager integration
- Validation service integration
- Audit logging functionality

## Performance Considerations

### Database Optimization

1. **Transaction Efficiency** - Minimize transaction scope and duration
2. **Query Optimization** - Use efficient queries with proper indexing
3. **Connection Pooling** - Efficient database connection management
4. **Batch Operations** - Group related operations when possible

### Memory Management

1. **Data Cleanup** - Proper cleanup of temporary data
2. **Session Management** - Efficient session updates
3. **Validation Caching** - Cache validation schemas when possible

### Monitoring Metrics

- Profile creation success/failure rates
- Transaction completion times
- Validation error rates
- Session synchronization performance

## Usage Examples

### Expert Profile Management

```typescript
// Create expert profile
const expertResult = await profileService.createExpertProfile('user_123', {
  bio: 'Full-stack developer with expertise in modern web technologies',
  expertise: ['JavaScript', 'React', 'Node.js'],
  experience: '5+ years in web development',
  hourlyRate: 75,
  availability: 'weekdays',
  languages: ['English'],
  timezone: 'America/New_York'
});

if (expertResult.success) {
  console.log('Expert profile created successfully');
}

// Update expert profile
const updateResult = await profileService.updateExpertProfile('user_123', {
  hourlyRate: 85,
  expertise: ['JavaScript', 'React', 'Node.js', 'Python']
});
```

### Customer Profile Management

```typescript
// Create customer profile
const customerResult = await profileService.createCustomerProfile('user_456', {
  company: 'StartupCorp',
  bio: 'Looking for talented developers for our next project',
  interests: ['Web Development', 'Mobile Apps'],
  budget: 'medium',
  projectTypes: ['web-development'],
  preferredCommunication: 'email',
  timezone: 'America/New_York'
});

if (customerResult.success) {
  console.log('Customer profile created successfully');
}
```

### Admin Operations

```typescript
// Approve expert profile
const approvalResult = await profileService.approveExpertProfile(
  'expert_123',
  'admin_456'
);

if (approvalResult.success) {
  console.log('Expert profile approved');
}

// Reject expert profile
const rejectionResult = await profileService.rejectExpertProfile(
  'expert_789',
  'admin_456'
);
```

### Error Handling

```typescript
const result = await profileService.createExpertProfile(userId, profileData);

if (!result.success) {
  switch (result.error) {
    case 'VALIDATION_ERROR':
      console.log('Please check your profile data');
      break;
    case 'PROFILE_CREATION_FAILED':
      console.log('Failed to create profile, please try again');
      break;
    default:
      console.log('Unexpected error:', result.error);
  }
}
```

## Best Practices

### Development Best Practices

1. **Use Transactions** - Always use transactions for multi-step operations
2. **Validate Input** - Comprehensive validation before processing
3. **Handle Errors Gracefully** - Provide meaningful error messages
4. **Log Operations** - Maintain audit trail for all profile changes
5. **Synchronize Sessions** - Keep user sessions updated after profile changes

### Security Best Practices

1. **Verify Ownership** - Ensure users can only modify their own profiles
2. **Admin Authorization** - Verify admin status for approval operations
3. **Input Sanitization** - Clean and validate all input data
4. **Audit Everything** - Log all profile operations for security
5. **Session Security** - Securely update sessions after profile changes

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Check database connection stability
   - Verify transaction timeout settings
   - Review database constraints

2. **Validation Errors**
   - Verify validation schema configuration
   - Check input data format
   - Review field requirements

3. **Session Synchronization Issues**
   - Verify JWT configuration
   - Check session manager integration
   - Review token refresh logic

4. **Profile Creation Failures**
   - Check database schema compatibility
   - Verify foreign key constraints
   - Review user status requirements

### Debug Logging

Enable debug logging for troubleshooting:

```bash
DEBUG=profile:* npm run dev
```

This provides detailed logging for:
- Profile creation/update operations
- Transaction execution steps
- Validation processes
- Session synchronization
- Error handling flows

## Dependencies

### Internal Dependencies
- `transactionService` - Database transaction management
- `ValidationService` - Input validation
- `sessionManager` - Session management
- `auditLogger` - Audit logging
- `ProfileTransaction` - Transaction-specific operations

### External Dependencies
- `drizzle-orm` - Database ORM
- Database connection and transaction support

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Transaction Configuration
TRANSACTION_TIMEOUT=30000  # 30 seconds

# Validation Configuration
PROFILE_BIO_MIN_LENGTH=50
PROFILE_BIO_MAX_LENGTH=2000
EXPERT_HOURLY_RATE_MIN=10
EXPERT_HOURLY_RATE_MAX=500
```

### Service Configuration

```typescript
// Profile validation limits
const PROFILE_LIMITS = {
  bio: { min: 50, max: 2000 },
  expertise: { min: 1, max: 20 },
  hourlyRate: { min: 10, max: 500 },
  interests: { min: 1, max: 10 }
};
```