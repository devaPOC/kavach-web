# cURL API Examples

This document provides comprehensive cURL examples for testing and interacting with the Kavach API from the command line.

## Setup and Configuration

### Base URL
```bash
# Local development
BASE_URL="http://localhost:3000/api/v1"

# Production (replace with actual domain)
BASE_URL="https://your-domain.com/api/v1"
```

### Common Headers
```bash
# Content-Type for JSON requests
CONTENT_TYPE="Content-Type: application/json"

# Cookie file for session management
COOKIE_JAR="cookies.txt"
```

## Authentication Examples

### User Registration

```bash
# Register a new customer
curl -X POST "${BASE_URL}/auth/signup" \
  -H "${CONTENT_TYPE}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "role": "customer",
    "agreedToTerms": true
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

```bash
# Register a new expert
curl -X POST "${BASE_URL}/auth/signup" \
  -H "${CONTENT_TYPE}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com",
    "password": "ExpertPassword456!",
    "role": "expert",
    "agreedToTerms": true
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### User Login

```bash
# Customer login
curl -X POST "${BASE_URL}/auth/login" \
  -H "${CONTENT_TYPE}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "role": "customer"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

```bash
# Expert login
curl -X POST "${BASE_URL}/auth/login" \
  -H "${CONTENT_TYPE}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "email": "jane.smith@example.com",
    "password": "ExpertPassword456!",
    "role": "expert"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Email Verification

```bash
# Verify email with token
curl -X POST "${BASE_URL}/auth/verify-email" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "token": "verification-token-from-email"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

```bash
# Resend verification email
curl -X POST "${BASE_URL}/auth/resend-verification" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "email": "john.doe@example.com"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Check Email Availability

```bash
# Check if email is available
curl -X POST "${BASE_URL}/auth/check-email" \
  -H "${CONTENT_TYPE}" \
  -d '{
    "email": "test@example.com"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Get Current User

```bash
# Get current authenticated user
curl -X GET "${BASE_URL}/auth/me" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Token Refresh

```bash
# Refresh access token
curl -X POST "${BASE_URL}/auth/refresh" \
  -b "${COOKIE_JAR}" \
  -c "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Logout

```bash
# Logout user
curl -X POST "${BASE_URL}/auth/logout" \
  -b "${COOKIE_JAR}" \
  -c "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

## Profile Management Examples

### Get User Profile

```bash
# Get current user's profile
curl -X GET "${BASE_URL}/profile" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Create Customer Profile

```bash
# Create customer profile
curl -X POST "${BASE_URL}/profile/customer" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "phoneNumber": "+968-9123-4567",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "nationality": "Omani",
    "countryOfResidence": "Oman",
    "governorate": "Muscat",
    "wilayat": "Muscat"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Update Customer Profile

```bash
# Update customer profile
curl -X PUT "${BASE_URL}/profile/customer" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -d '{
    "phoneNumber": "+968-9123-9999",
    "governorate": "Dhofar",
    "wilayat": "Salalah"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Create Expert Profile

```bash
# Create expert profile
curl -X POST "${BASE_URL}/profile/expert" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "phoneNumber": "+968-9876-5432",
    "dateOfBirth": "1985-08-22",
    "gender": "female",
    "nationality": "Omani",
    "countryOfResidence": "Oman",
    "governorate": "Dhofar",
    "wilayat": "Salalah",
    "areasOfSpecialization": "Software Development, Cloud Architecture, DevOps",
    "professionalExperience": "10+ years of experience in software development with expertise in cloud technologies and system architecture.",
    "relevantCertifications": "AWS Solutions Architect, Kubernetes Administrator, Scrum Master",
    "currentEmploymentStatus": "employed",
    "currentEmployer": "Tech Solutions LLC",
    "availability": "part_time",
    "preferredWorkArrangement": "remote",
    "preferredPaymentMethods": "Bank transfer, Digital wallets"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Update Expert Profile

```bash
# Update expert profile
curl -X PUT "${BASE_URL}/profile/expert" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -d '{
    "areasOfSpecialization": "Software Development, Cloud Architecture, DevOps, Machine Learning",
    "availability": "full_time",
    "preferredPaymentMethods": "Bank transfer, Digital wallets, Cryptocurrency"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

## User Management Examples

### Get User Profile

```bash
# Get user profile information
curl -X GET "${BASE_URL}/users/profile" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Update User Profile

```bash
# Update basic user information
curl -X PUT "${BASE_URL}/users/profile" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -d '{
    "firstName": "John",
    "lastName": "Smith"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Change Password

```bash
# Change user password
curl -X POST "${BASE_URL}/users/change-password" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -d '{
    "currentPassword": "SecurePassword123!",
    "newPassword": "NewSecurePassword456!"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

## Admin Examples

### Admin Login

```bash
# Admin login
curl -X POST "${BASE_URL}/admin/login" \
  -H "${CONTENT_TYPE}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Get All Users

```bash
# Get all users (paginated)
curl -X GET "${BASE_URL}/admin/users?page=1&limit=20" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Get User by ID

```bash
# Get specific user by ID
USER_ID="user_123"
curl -X GET "${BASE_URL}/admin/users/${USER_ID}" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Create User (Admin)

```bash
# Create new user as admin
curl -X POST "${BASE_URL}/admin/users" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -d '{
    "email": "newuser@example.com",
    "firstName": "New",
    "lastName": "User",
    "password": "TempPassword123!",
    "role": "customer"
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Update User (Admin)

```bash
# Update user information as admin
USER_ID="user_123"
curl -X PUT "${BASE_URL}/admin/users/${USER_ID}" \
  -H "${CONTENT_TYPE}" \
  -b "${COOKIE_JAR}" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "role": "expert",
    "isEmailVerified": true
  }' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Delete User (Admin)

```bash
# Delete user as admin
USER_ID="user_123"
curl -X DELETE "${BASE_URL}/admin/users/${USER_ID}" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Ban Expert

```bash
# Ban an expert user
USER_ID="expert_456"
curl -X POST "${BASE_URL}/admin/users/${USER_ID}/ban" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Unban Expert

```bash
# Unban an expert user
USER_ID="expert_456"
curl -X DELETE "${BASE_URL}/admin/users/${USER_ID}/ban" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Pause Customer

```bash
# Pause a customer user
USER_ID="customer_789"
curl -X POST "${BASE_URL}/admin/users/${USER_ID}/pause" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

### Unpause Customer

```bash
# Unpause a customer user
USER_ID="customer_789"
curl -X DELETE "${BASE_URL}/admin/users/${USER_ID}/pause" \
  -b "${COOKIE_JAR}" \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

## Testing and Debugging

### Check Rate Limiting

```bash
# Test rate limiting by making multiple requests
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST "${BASE_URL}/auth/login" \
    -H "${CONTENT_TYPE}" \
    -d '{
      "email": "wrong@example.com",
      "password": "wrongpassword"
    }' \
    -w "HTTP Status: %{http_code}, Time: %{time_total}s\n" \
    -s -o /dev/null
  echo "---"
done
```

### Verbose Output for Debugging

```bash
# Use verbose mode to see all headers and request details
curl -X POST "${BASE_URL}/auth/login" \
  -H "${CONTENT_TYPE}" \
  -c "${COOKIE_JAR}" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "role": "customer"
  }' \
  -v
```

### Check Response Headers

```bash
# Include response headers in output
curl -X GET "${BASE_URL}/auth/me" \
  -b "${COOKIE_JAR}" \
  -i
```

### Save Response to File

```bash
# Save response to file for analysis
curl -X GET "${BASE_URL}/profile" \
  -b "${COOKIE_JAR}" \
  -o profile_response.json \
  -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"
```

## Batch Operations

### Complete User Registration Flow

```bash
#!/bin/bash
# complete_registration.sh

BASE_URL="http://localhost:3000/api/v1"
COOKIE_JAR="test_cookies.txt"
EMAIL="test.user@example.com"
PASSWORD="TestPassword123!"

echo "=== Complete User Registration Flow ==="

# Step 1: Register user
echo "1. Registering user..."
curl -X POST "${BASE_URL}/auth/signup" \
  -H "Content-Type: application/json" \
  -c "${COOKIE_JAR}" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"role\": \"customer\",
    \"agreedToTerms\": true
  }" \
  -s | jq '.'

echo -e "\n2. Checking email availability..."
curl -X POST "${BASE_URL}/auth/check-email" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\"}" \
  -s | jq '.'

# Note: In real scenario, you would get the verification token from email
echo -e "\n3. Simulating email verification..."
echo "In real scenario, get token from email and verify with:"
echo "curl -X POST \"${BASE_URL}/auth/verify-email\" -H \"Content-Type: application/json\" -d '{\"token\": \"TOKEN_FROM_EMAIL\"}'"

echo -e "\n4. Attempting login..."
curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -c "${COOKIE_JAR}" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"role\": \"customer\"
  }" \
  -s | jq '.'

echo -e "\n5. Getting current user..."
curl -X GET "${BASE_URL}/auth/me" \
  -b "${COOKIE_JAR}" \
  -s | jq '.'

echo -e "\n=== Registration Flow Complete ==="
```

### Test All Endpoints

```bash
#!/bin/bash
# test_all_endpoints.sh

BASE_URL="http://localhost:3000/api/v1"
COOKIE_JAR="test_cookies.txt"

echo "=== Testing All API Endpoints ==="

# Authentication endpoints
echo "Testing authentication endpoints..."
endpoints=(
  "POST /auth/signup"
  "POST /auth/login"
  "POST /auth/logout"
  "POST /auth/refresh"
  "GET /auth/me"
  "POST /auth/verify-email"
  "POST /auth/resend-verification"
  "POST /auth/check-email"
)

for endpoint in "${endpoints[@]}"; do
  method=$(echo $endpoint | cut -d' ' -f1)
  path=$(echo $endpoint | cut -d' ' -f2)
  
  echo "Testing $endpoint..."
  curl -X $method "${BASE_URL}${path}" \
    -H "Content-Type: application/json" \
    -b "${COOKIE_JAR}" \
    -w "Status: %{http_code}\n" \
    -s -o /dev/null
done

echo "=== Endpoint Testing Complete ==="
```

## Environment-Specific Examples

### Development Environment

```bash
# Development environment variables
export API_BASE_URL="http://localhost:3000/api/v1"
export COOKIE_JAR="dev_cookies.txt"

# Test with development data
curl -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -c "${COOKIE_JAR}" \
  -d '{
    "email": "dev.user@localhost.com",
    "password": "DevPassword123!",
    "role": "customer"
  }'
```

### Production Environment

```bash
# Production environment variables (use HTTPS)
export API_BASE_URL="https://api.yourdomain.com/api/v1"
export COOKIE_JAR="prod_cookies.txt"

# Production login with proper security
curl -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -c "${COOKIE_JAR}" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "role": "customer"
  }' \
  --cacert /path/to/ca-certificate.pem
```

## Utility Scripts

### Cookie Management

```bash
# Clear cookies
rm -f cookies.txt

# View cookies
cat cookies.txt

# Extract specific cookie value
grep "auth-session" cookies.txt | cut -f7
```

### Response Formatting

```bash
# Pretty print JSON responses
curl -X GET "${BASE_URL}/profile" \
  -b "${COOKIE_JAR}" \
  -s | jq '.'

# Extract specific fields
curl -X GET "${BASE_URL}/auth/me" \
  -b "${COOKIE_JAR}" \
  -s | jq '.data.user.email'
```

### Error Handling

```bash
# Check for errors and handle appropriately
response=$(curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -c "${COOKIE_JAR}" \
  -d '{
    "email": "wrong@example.com",
    "password": "wrongpassword"
  }' \
  -s -w "%{http_code}")

http_code="${response: -3}"
json_response="${response%???}"

if [ "$http_code" -eq 200 ]; then
  echo "Success: $json_response"
elif [ "$http_code" -eq 401 ]; then
  echo "Authentication failed: $json_response"
elif [ "$http_code" -eq 429 ]; then
  echo "Rate limited: $json_response"
else
  echo "Error ($http_code): $json_response"
fi
```

These cURL examples provide comprehensive coverage of the Kavach API and can be used for testing, automation, and integration purposes.