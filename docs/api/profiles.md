# Profiles API

This section covers profile management endpoints for both customer and expert profiles, including creation, updates, and retrieval operations.

## Overview

The profiles system allows users to create and manage detailed profiles based on their role. Customers have simpler profiles while experts have comprehensive profiles that require approval before activation.

## Profile Types

### Customer Profiles
- Basic personal information
- Contact details
- Location information
- Optional demographic data

### Expert Profiles
- All customer profile fields
- Professional experience
- Areas of specialization
- Certifications and qualifications
- Employment status and availability
- Payment preferences

## Endpoints

### GET /api/v1/profile

Get the current user's profile information.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`

**Body:** None

#### Response

**Success (200) - Customer Profile:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isEmailVerified": true,
      "isProfileCompleted": true,
      "isApproved": true
    },
    "profile": {
      "id": "profile_456",
      "userId": "user_123",
      "phoneNumber": "+968-9123-4567",
      "dateOfBirth": "1990-05-15",
      "gender": "male",
      "nationality": "Omani",
      "countryOfResidence": "Oman",
      "governorate": "Muscat",
      "wilayat": "Muscat",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    }
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Success (200) - Expert Profile:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_789",
      "email": "expert@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "expert",
      "isEmailVerified": true,
      "isProfileCompleted": true,
      "isApproved": true
    },
    "profile": {
      "id": "profile_789",
      "userId": "user_789",
      "phoneNumber": "+968-9876-5432",
      "dateOfBirth": "1985-08-22",
      "gender": "female",
      "nationality": "Omani",
      "countryOfResidence": "Oman",
      "governorate": "Dhofar",
      "wilayat": "Salalah",
      "areasOfSpecialization": "Software Development, Cloud Architecture, DevOps",
      "professionalExperience": "10+ years in software development with expertise in cloud technologies and system architecture.",
      "relevantCertifications": "AWS Solutions Architect, Kubernetes Administrator, Scrum Master",
      "currentEmploymentStatus": "employed",
      "currentEmployer": "Tech Solutions LLC",
      "availability": "part_time",
      "preferredWorkArrangement": "remote",
      "preferredPaymentMethods": "Bank transfer, Digital wallets",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
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
    "code": "TOKEN_INVALID",
    "message": "Authentication required"
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
    "message": "Profile not found"
  },
  "timestamp": "2025-01-20T10:30:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### POST /api/v1/profile/customer

Create a customer profile.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "phoneNumber": "string (optional, valid phone number)",
  "dateOfBirth": "string (optional, YYYY-MM-DD format)",
  "gender": "male | female | other (optional)",
  "nationality": "string (optional)",
  "countryOfResidence": "string (optional)",
  "governorate": "string (optional)",
  "wilayat": "string (optional)"
}
```

#### Response

**Success (201):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "profile_456",
      "userId": "user_123",
      "phoneNumber": "+968-9123-4567",
      "dateOfBirth": "1990-05-15",
      "gender": "male",
      "nationality": "Omani",
      "countryOfResidence": "Oman",
      "governorate": "Muscat",
      "wilayat": "Muscat",
      "createdAt": "2025-01-20T10:35:00.000Z",
      "updatedAt": "2025-01-20T10:35:00.000Z"
    },
    "user": {
      "id": "user_123",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer",
      "isEmailVerified": true,
      "isProfileCompleted": true,
      "isApproved": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Customer profile created successfully",
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (403):**
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Only customers can create customer profiles"
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
    "message": "Profile validation failed",
    "details": {
      "validationErrors": [
        {
          "field": "phoneNumber",
          "message": "Please enter a valid phone number"
        }
      ]
    }
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Notes
- Only users with `customer` role can create customer profiles
- Profile creation updates `isProfileCompleted` to `true`
- New authentication tokens are returned with updated session data
- All fields are optional for customer profiles

---

### PUT /api/v1/profile/customer

Update a customer profile.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "phoneNumber": "string (optional, valid phone number)",
  "dateOfBirth": "string (optional, YYYY-MM-DD format)",
  "gender": "male | female | other (optional)",
  "nationality": "string (optional)",
  "countryOfResidence": "string (optional)",
  "governorate": "string (optional)",
  "wilayat": "string (optional)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "profile_456",
    "userId": "user_123",
    "phoneNumber": "+968-9123-4567",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "nationality": "Omani",
    "countryOfResidence": "Oman",
    "governorate": "Muscat",
    "wilayat": "Muscat",
    "updatedAt": "2025-01-20T10:40:00.000Z"
  },
  "message": "Customer profile updated successfully",
  "timestamp": "2025-01-20T10:40:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

---

### POST /api/v1/profile/expert

Create an expert profile.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "phoneNumber": "string (optional, valid phone number)",
  "dateOfBirth": "string (optional, YYYY-MM-DD format)",
  "gender": "male | female | other (optional)",
  "nationality": "string (optional)",
  "countryOfResidence": "string (optional)",
  "governorate": "string (optional)",
  "wilayat": "string (optional)",
  "areasOfSpecialization": "string (optional, areas of expertise)",
  "professionalExperience": "string (optional, detailed experience)",
  "relevantCertifications": "string (optional, certifications and qualifications)",
  "currentEmploymentStatus": "employed | unemployed | self_employed | student (optional)",
  "currentEmployer": "string (optional, current employer name)",
  "availability": "full_time | part_time | weekends | flexible (optional)",
  "preferredWorkArrangement": "remote | on_site | hybrid (optional)",
  "preferredPaymentMethods": "string (optional, payment preferences)"
}
```

#### Response

**Success (201):**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "profile_789",
      "userId": "user_789",
      "phoneNumber": "+968-9876-5432",
      "dateOfBirth": "1985-08-22",
      "gender": "female",
      "nationality": "Omani",
      "countryOfResidence": "Oman",
      "governorate": "Dhofar",
      "wilayat": "Salalah",
      "areasOfSpecialization": "Software Development, Cloud Architecture",
      "professionalExperience": "10+ years in software development",
      "relevantCertifications": "AWS Solutions Architect",
      "currentEmploymentStatus": "employed",
      "currentEmployer": "Tech Solutions LLC",
      "availability": "part_time",
      "preferredWorkArrangement": "remote",
      "preferredPaymentMethods": "Bank transfer",
      "createdAt": "2025-01-20T10:35:00.000Z",
      "updatedAt": "2025-01-20T10:35:00.000Z"
    },
    "user": {
      "id": "user_789",
      "email": "expert@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "expert",
      "isEmailVerified": true,
      "isProfileCompleted": true,
      "isApproved": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Expert profile created successfully",
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

**Error (403):**
```json
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "Only experts can create expert profiles"
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

#### Notes
- Only users with `expert` role can create expert profiles
- Profile creation updates `isProfileCompleted` to `true`
- Expert profiles require manual approval (`isApproved` remains `false`)
- New authentication tokens are returned with updated session data
- All fields are optional but recommended for approval

---

### PUT /api/v1/profile/expert

Update an expert profile.

#### Request

**Headers:**
- `Cookie: auth-session=<access_token>`
- `Content-Type: application/json`

**Body:**
```json
{
  "phoneNumber": "string (optional, valid phone number)",
  "dateOfBirth": "string (optional, YYYY-MM-DD format)",
  "gender": "male | female | other (optional)",
  "nationality": "string (optional)",
  "countryOfResidence": "string (optional)",
  "governorate": "string (optional)",
  "wilayat": "string (optional)",
  "areasOfSpecialization": "string (optional, areas of expertise)",
  "professionalExperience": "string (optional, detailed experience)",
  "relevantCertifications": "string (optional, certifications and qualifications)",
  "currentEmploymentStatus": "employed | unemployed | self_employed | student (optional)",
  "currentEmployer": "string (optional, current employer name)",
  "availability": "full_time | part_time | weekends | flexible (optional)",
  "preferredWorkArrangement": "remote | on_site | hybrid (optional)",
  "preferredPaymentMethods": "string (optional, payment preferences)"
}
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "profile_789",
    "userId": "user_789",
    "phoneNumber": "+968-9876-5432",
    "dateOfBirth": "1985-08-22",
    "gender": "female",
    "nationality": "Omani",
    "countryOfResidence": "Oman",
    "governorate": "Dhofar",
    "wilayat": "Salalah",
    "areasOfSpecialization": "Software Development, Cloud Architecture, DevOps",
    "professionalExperience": "10+ years in software development with expertise in cloud technologies",
    "relevantCertifications": "AWS Solutions Architect, Kubernetes Administrator",
    "currentEmploymentStatus": "employed",
    "currentEmployer": "Tech Solutions LLC",
    "availability": "part_time",
    "preferredWorkArrangement": "remote",
    "preferredPaymentMethods": "Bank transfer, Digital wallets",
    "updatedAt": "2025-01-20T10:40:00.000Z"
  },
  "message": "Expert profile updated successfully",
  "timestamp": "2025-01-20T10:40:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Profile Field Validation

### Common Fields (Both Customer and Expert)

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `phoneNumber` | string | Valid phone format | Contact phone number |
| `dateOfBirth` | string | YYYY-MM-DD, age ≥ 15 | Date of birth |
| `gender` | enum | male, female, other | Gender identity |
| `nationality` | string | Any string | Nationality |
| `countryOfResidence` | string | Any string | Current country |
| `governorate` | string | Any string | State/province |
| `wilayat` | string | Any string | City/district |

### Expert-Specific Fields

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `areasOfSpecialization` | string | Any text | Professional expertise areas |
| `professionalExperience` | string | Any text | Detailed work experience |
| `relevantCertifications` | string | Any text | Certifications and qualifications |
| `currentEmploymentStatus` | enum | employed, unemployed, self_employed, student | Employment status |
| `currentEmployer` | string | Max 255 chars | Current employer name |
| `availability` | enum | full_time, part_time, weekends, flexible | Work availability |
| `preferredWorkArrangement` | enum | remote, on_site, hybrid | Work arrangement preference |
| `preferredPaymentMethods` | string | Any text | Payment method preferences |

### Validation Rules

#### Phone Number Validation
- Optional field
- Must be valid international format when provided
- Examples: `+968-9123-4567`, `+1-555-123-4567`

#### Date of Birth Validation
- Optional field
- Must be valid date in YYYY-MM-DD format
- Cannot be in the future
- User must be at least 15 years old

#### Text Field Validation
- Long text fields (experience, certifications): No length limit
- Short text fields (employer): Maximum 255 characters
- Name fields: 2-50 characters, letters/spaces/hyphens/apostrophes only

## Profile Status Flow

### Customer Profile Flow
1. **Account Created**: `isProfileCompleted: false`
2. **Profile Created**: `isProfileCompleted: true`
3. **Ready to Use**: Customer can access all features

### Expert Profile Flow
1. **Account Created**: `isProfileCompleted: false, isApproved: false`
2. **Profile Created**: `isProfileCompleted: true, isApproved: false`
3. **Pending Approval**: Expert waits for admin approval
4. **Approved**: `isApproved: true` - Expert can access all features
5. **Rejected**: Admin may request profile updates

## Error Handling

### Common Profile Errors

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `TOKEN_INVALID` | Authentication required | 401 |
| `ACCESS_DENIED` | Wrong role for profile type | 403 |
| `INVALID_INPUT` | Validation failed | 400 |
| `RESOURCE_NOT_FOUND` | Profile not found | 404 |
| `PROFILE_CREATION_FAILED` | Profile creation error | 400 |
| `PROFILE_UPDATE_FAILED` | Profile update error | 400 |

### Validation Error Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Profile validation failed",
    "details": {
      "validationErrors": [
        {
          "field": "dateOfBirth",
          "message": "You must be at least 15 years old to register"
        },
        {
          "field": "phoneNumber",
          "message": "Please enter a valid phone number"
        }
      ]
    }
  },
  "timestamp": "2025-01-20T10:35:00.000Z",
  "correlationId": "uuid-correlation-id"
}
```

## Best Practices

### Profile Creation
1. **Validate Client-Side**: Validate data before sending to API
2. **Handle Partial Data**: Allow users to save incomplete profiles
3. **Progressive Enhancement**: Guide users through profile completion
4. **Clear Requirements**: Explain what information is needed and why

### Profile Updates
1. **Partial Updates**: Only send changed fields
2. **Optimistic Updates**: Update UI immediately, handle errors gracefully
3. **Validation Feedback**: Provide immediate validation feedback
4. **Save Indicators**: Show save status to users

### Expert Approval Process
1. **Clear Communication**: Explain approval process to experts
2. **Status Updates**: Keep experts informed of approval status
3. **Feedback Mechanism**: Provide feedback for rejected profiles
4. **Resubmission**: Allow profile updates after rejection

### Security Considerations
1. **Data Validation**: Always validate on server side
2. **PII Protection**: Handle personal information securely
3. **Access Control**: Ensure users can only access their own profiles
4. **Audit Logging**: Log profile changes for security