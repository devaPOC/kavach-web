# First Steps After Installation

Congratulations on successfully installing Kavach! This guide will walk you through your first interactions with the system, help you understand the key features, and set you up for productive development.

## Initial System Verification

Before diving into features, let's ensure everything is working correctly.

### 1. Health Check

Verify the system is healthy:

```bash
# Check application health
curl http://localhost:3000/api/v1/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:30:00.000Z",
  "uptime": 120.5,
  "database": {
    "status": "connected",
    "responseTime": 5
  },
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  }
}
```

### 2. Database Verification

Check that your database is properly set up:

```bash
# Open Drizzle Studio
bun run db:studio

# Navigate to http://localhost:4983
# You should see tables: users, sessions, email_verifications
```

### 3. Test Accounts

Verify the seeded test accounts work:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@kavach.com | admin123 | System administration |
| Customer | customer@example.com | password123 | Regular user testing |
| Expert | expert@example.com | password123 | Expert role testing |

## Exploring the User Interface

### 1. Home Page (http://localhost:3000)

The landing page provides:
- Overview of Kavach's features
- Navigation to login/signup
- System status information

### 2. User Registration (http://localhost:3000/signup)

Try creating a new account:

1. Click "Sign Up" or navigate to `/signup`
2. Choose user type (Customer or Expert)
3. Fill in the registration form
4. Complete profile information
5. Note: Email verification may be required depending on your setup

**Registration Flow:**
```
Choose Role → Basic Info → Profile Details → Email Verification → Dashboard
```

### 3. User Login (http://localhost:3000/login)

Test the login system:

1. Navigate to `/login`
2. Use test credentials: `customer@example.com` / `password123`
3. Observe the role-based redirect to dashboard

**Login Features:**
- Email/password authentication
- Role-based dashboard redirect
- "Remember me" functionality
- Password strength validation

### 4. User Dashboard (http://localhost:3000/dashboard)

After logging in, explore the dashboard:

- **Profile Management**: Update user information
- **Account Settings**: Change password, security settings
- **Session Management**: View active sessions
- **Activity Log**: Recent account activity

### 5. Admin Dashboard (http://localhost:3000/admin/login)

Login as admin to explore administrative features:

1. Navigate to `/admin/login`
2. Login with: `admin@kavach.com` / `admin123`
3. Explore the admin interface

**Admin Features:**
- User management (create, edit, delete users)
- Account status management (ban, pause users)
- System metrics and health monitoring
- Security audit logs

## Understanding User Roles

Kavach implements a role-based access control system:

### Customer Role
- **Purpose**: Regular application users
- **Permissions**: 
  - Manage own profile
  - Access customer-specific features
  - View own data and sessions
- **Dashboard**: Customer-focused interface

### Expert Role
- **Purpose**: Professional users with enhanced capabilities
- **Permissions**:
  - All customer permissions
  - Access expert-specific features
  - Enhanced profile options
- **Dashboard**: Expert-focused interface with additional tools

### Admin Role
- **Purpose**: System administrators
- **Permissions**:
  - Full system access
  - User management
  - System configuration
  - Security monitoring
- **Dashboard**: Administrative interface with system controls

## API Exploration

Kavach provides a comprehensive REST API. Let's explore the key endpoints:

### Authentication Endpoints

```bash
# User Registration
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "role": "customer",
    "firstName": "John",
    "lastName": "Doe"
  }'

# User Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'

# Response includes access and refresh tokens
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "customer@example.com",
    "role": "customer"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Protected Endpoints

```bash
# Get user profile (requires authentication)
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update profile
curl -X PUT http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated Name",
    "bio": "Updated bio"
  }'
```

### Admin Endpoints

```bash
# Admin login
curl -X POST http://localhost:3000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kavach.com",
    "password": "admin123"
  }'

# List all users (admin only)
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## Key Features Deep Dive

### 1. Email Verification System

If you've configured SMTP, test the email verification:

```bash
# Test email configuration
bun run test:email

# Resend verification email
curl -X POST http://localhost:3000/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Email Features:**
- Magic link verification
- Customizable email templates
- Automatic retry logic
- Verification status tracking

### 2. Security Features

Explore the built-in security features:

#### Rate Limiting
```bash
# Test rate limiting (make multiple rapid requests)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# You should see rate limiting kick in after 5 attempts
```

#### Session Management
```bash
# View active sessions
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Logout (invalidate session)
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Database Operations

Explore the database structure:

```bash
# Open database GUI
bun run db:studio

# Run database maintenance
bun run db:maintenance

# View migration history
ls src/lib/database/migrations/
```

**Key Tables:**
- `users`: User accounts and profiles
- `sessions`: Active user sessions
- `email_verifications`: Email verification tokens
- `customer_profiles`: Customer-specific data
- `expert_profiles`: Expert-specific data

## Development Workflow

### 1. Making Changes

```bash
# Start development server with hot reload
bun run dev

# Run tests in watch mode
bun run test:watch

# Check code quality
bun run lint
```

### 2. Database Changes

```bash
# Generate new migration
bun run db:generate

# Apply migrations
bun run db:migrate

# Reset database (development only)
bun run docker:down
docker volume rm kavach_postgres_data
bun run docker:up
bun run db:init
```

### 3. Testing

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage

# Run specific test file
bun run test src/lib/auth/__tests__/jwt-utils.test.ts
```

## Common Tasks

### Creating a New User Programmatically

```bash
# Use the create-admin script as a template
bun run create-admin

# Or create via API
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "role": "customer",
    "firstName": "New",
    "lastName": "User"
  }'
```

### Resetting User Password

```bash
# Through admin interface
curl -X PUT http://localhost:3000/api/v1/admin/users/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "NewPassword123!"}'

# Or directly in database
bun run db:studio
# Navigate to users table and update password_hash
```

### Monitoring System Health

```bash
# Check health endpoint
curl http://localhost:3000/api/v1/health

# View application logs
tail -f logs/app.log  # If logging to file

# Monitor database
bun run db:studio
```

## Customization Ideas

Now that you understand the system, consider these customizations:

### 1. Add Custom User Fields
- Modify user schemas in `src/lib/database/schema/`
- Update registration forms
- Create new migrations

### 2. Implement Custom Roles
- Extend the role system
- Add role-specific permissions
- Create role-specific dashboards

### 3. Customize Email Templates
- Modify templates in `src/lib/email/templates/`
- Add new email types
- Implement email preferences

### 4. Add New API Endpoints
- Create new controllers in `src/lib/controllers/`
- Add route handlers in `src/app/(backend)/api/`
- Implement business logic in services

## Troubleshooting Common Issues

### Login Issues
```bash
# Check user exists
bun run db:studio
# Look in users table

# Verify password
# Passwords are hashed with bcrypt

# Check session
# Look in sessions table for active sessions
```

### Email Not Working
```bash
# Test email configuration
bun run test:email

# Check SMTP settings in .env
# Verify Gmail app password if using Gmail
```

### Database Connection Issues
```bash
# Check database status
docker ps
docker logs kavach_postgres

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

## Next Steps

Now that you're familiar with Kavach's basics:

### For Developers
1. **[Development Environment Setup](../development/setup/environment.md)** - Complete development setup
2. **[API Documentation](../api/README.md)** - Detailed API reference
3. **[Architecture Guide](../architecture/README.md)** - System architecture deep dive
4. **[Testing Guide](../development/coding-standards/testing.md)** - Testing best practices

### For Administrators
1. **[Security Guide](../security/README.md)** - Security best practices
2. **[Deployment Guide](../deployment/README.md)** - Production deployment
3. **[Operations Guide](../operations/README.md)** - System maintenance

### For Users
1. **[User Guide](../user-guides/README.md)** - End-user documentation
2. **[FAQ](../user-guides/faq/README.md)** - Frequently asked questions
3. **[Tutorials](../user-guides/tutorials/README.md)** - Step-by-step tutorials

## Getting Help

If you need assistance:

1. **Documentation**: Check the relevant documentation sections
2. **Troubleshooting**: Review [Common Issues](../development/setup/troubleshooting.md)
3. **Community**: Join the project community
4. **Issues**: Report bugs or request features

Welcome to Kavach! You're now ready to build amazing authentication experiences. 🚀