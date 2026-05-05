# Postman Collection

This document provides a comprehensive Postman collection for the Kavach API, including environment setup, automated tests, and workflows.

## Collection Overview

The Kavach API Postman collection includes:
- All API endpoints with proper request examples
- Environment variables for different deployment stages
- Automated tests for response validation
- Pre-request scripts for authentication
- Workflows for common user journeys

## Installation

### Import Collection

1. **Download Collection**: Save the JSON collection below to a file named `Kavach-API.postman_collection.json`
2. **Import in Postman**: 
   - Open Postman
   - Click "Import" button
   - Select the downloaded JSON file
   - Click "Import"

### Collection JSON

```json
{
  "info": {
    "name": "Kavach API",
    "description": "Complete API collection for Kavach authentication and user management system",
    "version": "1.0.0",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "noauth"
  },
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "type": "text/javascript",
        "exec": [
          "// Global pre-request script",
          "console.log('Making request to:', pm.request.url.toString());"
        ]
      }
    },
    {
      "listen": "test",
      "script": {
        "type": "text/javascript",
        "exec": [
          "// Global test script",
          "pm.test('Response time is less than 5000ms', function () {",
          "    pm.expect(pm.response.responseTime).to.be.below(5000);",
          "});",
          "",
          "pm.test('Response has correlation ID', function () {",
          "    const jsonData = pm.response.json();",
          "    pm.expect(jsonData).to.have.property('correlationId');",
          "});"
        ]
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "{{base_url}}/api/v1",
      "type": "string"
    }
  ],
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Signup",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Response has success property', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData).to.have.property('success', true);",
                  "});",
                  "",
                  "pm.test('Response contains user data', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data).to.have.property('user');",
                  "    pm.expect(jsonData.data.user).to.have.property('id');",
                  "    pm.expect(jsonData.data.user).to.have.property('email');",
                  "});",
                  "",
                  "// Store user ID for later use",
                  "if (pm.response.code === 201) {",
                  "    const jsonData = pm.response.json();",
                  "    pm.environment.set('user_id', jsonData.data.user.id);",
                  "    pm.environment.set('user_email', jsonData.data.user.email);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"firstName\": \"{{$randomFirstName}}\",\n  \"lastName\": \"{{$randomLastName}}\",\n  \"email\": \"{{$randomEmail}}\",\n  \"password\": \"TestPassword123!\",\n  \"role\": \"customer\",\n  \"agreedToTerms\": true\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/signup",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "signup"]
            }
          }
        },
        {
          "name": "Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response contains tokens', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data).to.have.property('accessToken');",
                  "    pm.expect(jsonData.data).to.have.property('refreshToken');",
                  "});",
                  "",
                  "pm.test('Cookies are set', function () {",
                  "    pm.expect(pm.cookies.has('auth-session')).to.be.true;",
                  "    pm.expect(pm.cookies.has('auth-refresh')).to.be.true;",
                  "});",
                  "",
                  "// Store tokens for API requests",
                  "if (pm.response.code === 200) {",
                  "    const jsonData = pm.response.json();",
                  "    pm.environment.set('access_token', jsonData.data.accessToken);",
                  "    pm.environment.set('refresh_token', jsonData.data.refreshToken);",
                  "    pm.environment.set('current_user', JSON.stringify(jsonData.data.user));",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{login_email}}\",\n  \"password\": \"{{login_password}}\",\n  \"role\": \"{{login_role}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "login"]
            }
          }
        },
        {
          "name": "Get Current User",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response contains user data', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data).to.have.property('id');",
                  "    pm.expect(jsonData.data).to.have.property('email');",
                  "    pm.expect(jsonData.data).to.have.property('role');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/auth/me",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "me"]
            }
          }
        },
        {
          "name": "Refresh Token",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response contains new tokens', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data).to.have.property('accessToken');",
                  "    pm.expect(jsonData.data).to.have.property('refreshToken');",
                  "});",
                  "",
                  "// Update stored tokens",
                  "if (pm.response.code === 200) {",
                  "    const jsonData = pm.response.json();",
                  "    pm.environment.set('access_token', jsonData.data.accessToken);",
                  "    pm.environment.set('refresh_token', jsonData.data.refreshToken);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/auth/refresh",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "refresh"]
            }
          }
        },
        {
          "name": "Check Email Availability",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('Response contains availability status', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data).to.have.property('available');",
                  "    pm.expect(jsonData.data).to.have.property('email');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{check_email}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/check-email",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "check-email"]
            }
          }
        },
        {
          "name": "Verify Email",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"token\": \"{{verification_token}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/verify-email",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "verify-email"]
            }
          }
        },
        {
          "name": "Resend Verification",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{user_email}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/resend-verification",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "resend-verification"]
            }
          }
        },
        {
          "name": "Logout",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "// Clear stored tokens",
                  "pm.environment.unset('access_token');",
                  "pm.environment.unset('refresh_token');",
                  "pm.environment.unset('current_user');"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/auth/logout",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "logout"]
            }
          }
        }
      ]
    },
    {
      "name": "Profiles",
      "item": [
        {
          "name": "Get Profile",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200 or 404', function () {",
                  "    pm.expect(pm.response.code).to.be.oneOf([200, 404]);",
                  "});",
                  "",
                  "if (pm.response.code === 200) {",
                  "    pm.test('Response contains profile data', function () {",
                  "        const jsonData = pm.response.json();",
                  "        pm.expect(jsonData.data).to.have.property('user');",
                  "        pm.expect(jsonData.data).to.have.property('profile');",
                  "    });",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/profile",
              "host": ["{{baseUrl}}"],
              "path": ["profile"]
            }
          }
        },
        {
          "name": "Create Customer Profile",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 201', function () {",
                  "    pm.response.to.have.status(201);",
                  "});",
                  "",
                  "pm.test('Response contains profile and updated tokens', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data).to.have.property('profile');",
                  "    pm.expect(jsonData.data).to.have.property('user');",
                  "    pm.expect(jsonData.data).to.have.property('accessToken');",
                  "});",
                  "",
                  "// Update tokens",
                  "if (pm.response.code === 201) {",
                  "    const jsonData = pm.response.json();",
                  "    pm.environment.set('access_token', jsonData.data.accessToken);",
                  "    pm.environment.set('refresh_token', jsonData.data.refreshToken);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"phoneNumber\": \"+968-9123-4567\",\n  \"dateOfBirth\": \"1990-05-15\",\n  \"gender\": \"male\",\n  \"nationality\": \"Omani\",\n  \"countryOfResidence\": \"Oman\",\n  \"governorate\": \"Muscat\",\n  \"wilayat\": \"Muscat\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/profile/customer",
              "host": ["{{baseUrl}}"],
              "path": ["profile", "customer"]
            }
          }
        },
        {
          "name": "Update Customer Profile",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"phoneNumber\": \"+968-9123-9999\",\n  \"governorate\": \"Dhofar\",\n  \"wilayat\": \"Salalah\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/profile/customer",
              "host": ["{{baseUrl}}"],
              "path": ["profile", "customer"]
            }
          }
        },
        {
          "name": "Create Expert Profile",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"phoneNumber\": \"+968-9876-5432\",\n  \"dateOfBirth\": \"1985-08-22\",\n  \"gender\": \"female\",\n  \"nationality\": \"Omani\",\n  \"countryOfResidence\": \"Oman\",\n  \"governorate\": \"Dhofar\",\n  \"wilayat\": \"Salalah\",\n  \"areasOfSpecialization\": \"Software Development, Cloud Architecture, DevOps\",\n  \"professionalExperience\": \"10+ years of experience in software development with expertise in cloud technologies and system architecture.\",\n  \"relevantCertifications\": \"AWS Solutions Architect, Kubernetes Administrator, Scrum Master\",\n  \"currentEmploymentStatus\": \"employed\",\n  \"currentEmployer\": \"Tech Solutions LLC\",\n  \"availability\": \"part_time\",\n  \"preferredWorkArrangement\": \"remote\",\n  \"preferredPaymentMethods\": \"Bank transfer, Digital wallets\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/profile/expert",
              "host": ["{{baseUrl}}"],
              "path": ["profile", "expert"]
            }
          }
        },
        {
          "name": "Update Expert Profile",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"areasOfSpecialization\": \"Software Development, Cloud Architecture, DevOps, Machine Learning\",\n  \"availability\": \"full_time\",\n  \"preferredPaymentMethods\": \"Bank transfer, Digital wallets, Cryptocurrency\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/profile/expert",
              "host": ["{{baseUrl}}"],
              "path": ["profile", "expert"]
            }
          }
        }
      ]
    },
    {
      "name": "User Management",
      "item": [
        {
          "name": "Get User Profile",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/users/profile",
              "host": ["{{baseUrl}}"],
              "path": ["users", "profile"]
            }
          }
        },
        {
          "name": "Update User Profile",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"firstName\": \"Updated\",\n  \"lastName\": \"Name\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/users/profile",
              "host": ["{{baseUrl}}"],
              "path": ["users", "profile"]
            }
          }
        },
        {
          "name": "Change Password",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"currentPassword\": \"{{current_password}}\",\n  \"newPassword\": \"{{new_password}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/users/change-password",
              "host": ["{{baseUrl}}"],
              "path": ["users", "change-password"]
            }
          }
        }
      ]
    },
    {
      "name": "Admin",
      "item": [
        {
          "name": "Admin Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status code is 200', function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test('User has admin role', function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data.user.role).to.equal('admin');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{admin_email}}\",\n  \"password\": \"{{admin_password}}\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/admin/login",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "login"]
            }
          }
        },
        {
          "name": "Get All Users",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/admin/users?page=1&limit=20",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users"],
              "query": [
                {
                  "key": "page",
                  "value": "1"
                },
                {
                  "key": "limit",
                  "value": "20"
                }
              ]
            }
          }
        },
        {
          "name": "Get User by ID",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/admin/users/{{target_user_id}}",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users", "{{target_user_id}}"]
            }
          }
        },
        {
          "name": "Create User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"{{$randomEmail}}\",\n  \"firstName\": \"{{$randomFirstName}}\",\n  \"lastName\": \"{{$randomLastName}}\",\n  \"password\": \"TempPassword123!\",\n  \"role\": \"customer\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/admin/users",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users"]
            }
          }
        },
        {
          "name": "Update User",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"firstName\": \"Updated\",\n  \"lastName\": \"Name\",\n  \"isEmailVerified\": true\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/admin/users/{{target_user_id}}",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users", "{{target_user_id}}"]
            }
          }
        },
        {
          "name": "Ban Expert",
          "request": {
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/admin/users/{{expert_user_id}}/ban",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users", "{{expert_user_id}}", "ban"]
            }
          }
        },
        {
          "name": "Unban Expert",
          "request": {
            "method": "DELETE",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/admin/users/{{expert_user_id}}/ban",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users", "{{expert_user_id}}", "ban"]
            }
          }
        },
        {
          "name": "Pause Customer",
          "request": {
            "method": "POST",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/admin/users/{{customer_user_id}}/pause",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users", "{{customer_user_id}}", "pause"]
            }
          }
        },
        {
          "name": "Delete User",
          "request": {
            "method": "DELETE",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/admin/users/{{target_user_id}}",
              "host": ["{{baseUrl}}"],
              "path": ["admin", "users", "{{target_user_id}}"]
            }
          }
        }
      ]
    }
  ]
}
```

## Environment Setup

### Development Environment

Create a new environment in Postman with these variables:

```json
{
  "name": "Kavach API - Development",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "enabled": true
    },
    {
      "key": "login_email",
      "value": "test.customer@example.com",
      "enabled": true
    },
    {
      "key": "login_password",
      "value": "TestPassword123!",
      "enabled": true
    },
    {
      "key": "login_role",
      "value": "customer",
      "enabled": true
    },
    {
      "key": "admin_email",
      "value": "admin@example.com",
      "enabled": true
    },
    {
      "key": "admin_password",
      "value": "AdminPassword123!",
      "enabled": true
    },
    {
      "key": "check_email",
      "value": "test@example.com",
      "enabled": true
    },
    {
      "key": "verification_token",
      "value": "sample-verification-token",
      "enabled": true
    },
    {
      "key": "current_password",
      "value": "TestPassword123!",
      "enabled": true
    },
    {
      "key": "new_password",
      "value": "NewPassword456!",
      "enabled": true
    }
  ]
}
```

### Production Environment

```json
{
  "name": "Kavach API - Production",
  "values": [
    {
      "key": "base_url",
      "value": "https://api.yourdomain.com",
      "enabled": true
    },
    {
      "key": "login_email",
      "value": "your.email@example.com",
      "enabled": true
    },
    {
      "key": "login_password",
      "value": "YourSecurePassword",
      "enabled": true
    },
    {
      "key": "login_role",
      "value": "customer",
      "enabled": true
    }
  ]
}
```

## Automated Test Workflows

### Complete User Journey Test

Create a new collection runner workflow:

1. **Setup Phase**:
   - Check Email Availability
   - Signup
   - Login

2. **Profile Phase**:
   - Get Profile (should be 404)
   - Create Customer Profile
   - Get Profile (should be 200)
   - Update Profile

3. **User Management Phase**:
   - Get User Profile
   - Update User Profile
   - Change Password

4. **Cleanup Phase**:
   - Logout

### Rate Limiting Test

Create a test to verify rate limiting:

```javascript
// Pre-request script for rate limiting test
pm.sendRequest({
    url: pm.environment.get('baseUrl') + '/auth/login',
    method: 'POST',
    header: {
        'Content-Type': 'application/json'
    },
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            email: 'wrong@example.com',
            password: 'wrongpassword'
        })
    }
}, function (err, response) {
    console.log('Rate limit test request completed');
});
```

## Custom Scripts

### Authentication Helper

Add this to your collection's pre-request script:

```javascript
// Auto-refresh token if expired
if (pm.environment.get('access_token')) {
    const token = pm.environment.get('access_token');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp < currentTime) {
        console.log('Token expired, attempting refresh...');
        
        pm.sendRequest({
            url: pm.environment.get('baseUrl') + '/auth/refresh',
            method: 'POST'
        }, function (err, response) {
            if (response.code === 200) {
                const jsonData = response.json();
                pm.environment.set('access_token', jsonData.data.accessToken);
                pm.environment.set('refresh_token', jsonData.data.refreshToken);
                console.log('Token refreshed successfully');
            } else {
                console.log('Token refresh failed, clearing tokens');
                pm.environment.unset('access_token');
                pm.environment.unset('refresh_token');
            }
        });
    }
}
```

### Response Validation

Add this to your collection's test script:

```javascript
// Validate standard response format
pm.test('Response follows standard format', function () {
    const jsonData = pm.response.json();
    
    // All responses should have these properties
    pm.expect(jsonData).to.have.property('success');
    pm.expect(jsonData).to.have.property('timestamp');
    pm.expect(jsonData).to.have.property('correlationId');
    
    if (jsonData.success) {
        pm.expect(jsonData).to.have.property('data');
    } else {
        pm.expect(jsonData).to.have.property('error');
        pm.expect(jsonData.error).to.have.property('code');
        pm.expect(jsonData.error).to.have.property('message');
    }
});

// Check rate limit headers
pm.test('Rate limit headers present', function () {
    pm.expect(pm.response.headers.has('X-RateLimit-Limit')).to.be.true;
    pm.expect(pm.response.headers.has('X-RateLimit-Remaining')).to.be.true;
    pm.expect(pm.response.headers.has('X-RateLimit-Reset')).to.be.true;
});
```

## Usage Instructions

### Getting Started

1. **Import Collection**: Import the JSON collection into Postman
2. **Set Environment**: Create and select the appropriate environment
3. **Configure Variables**: Update environment variables with your values
4. **Test Connection**: Run the "Get Current User" request to test connectivity

### Running Tests

1. **Individual Requests**: Click on any request and hit "Send"
2. **Collection Runner**: Use Collection Runner for automated testing
3. **Monitor**: Set up monitors for continuous testing
4. **Newman**: Use Newman CLI for CI/CD integration

### Best Practices

1. **Environment Management**: Use different environments for dev/staging/prod
2. **Variable Usage**: Store sensitive data in environment variables
3. **Test Automation**: Write comprehensive tests for all endpoints
4. **Documentation**: Keep request descriptions up to date
5. **Version Control**: Export and version control your collections

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Check if cookies are enabled
   - Verify environment variables
   - Ensure tokens are not expired

2. **Rate Limiting**:
   - Wait for rate limit reset
   - Check rate limit headers
   - Reduce request frequency

3. **CORS Issues**:
   - Use Postman desktop app
   - Disable web security if testing locally
   - Check server CORS configuration

### Debug Tips

1. **Enable Console**: View Postman console for detailed logs
2. **Check Headers**: Verify all required headers are present
3. **Validate JSON**: Ensure request body is valid JSON
4. **Environment Variables**: Double-check variable names and values

## Integration with CI/CD

### Newman CLI

Install Newman and run collections from command line:

```bash
# Install Newman
npm install -g newman

# Run collection
newman run Kavach-API.postman_collection.json \
  -e Development.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

### GitHub Actions

```yaml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Newman
        run: npm install -g newman
      - name: Run API Tests
        run: |
          newman run postman/Kavach-API.postman_collection.json \
            -e postman/Development.postman_environment.json \
            --reporters cli,junit \
            --reporter-junit-export results.xml
```

This Postman collection provides comprehensive testing capabilities for the Kavach API with automated workflows, proper error handling, and integration options.