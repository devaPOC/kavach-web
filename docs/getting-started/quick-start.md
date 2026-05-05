# 5-Minute Quick Start

Get Kavach up and running in under 5 minutes with this streamlined setup guide. Perfect for trying out the system or quick development setup.

## Prerequisites

- **Bun** or **Node.js 18+**
- **Docker** (for database)
- **Git**

## Quick Setup

### 1. Clone and Install (1 minute)

```bash
# Clone the repository
git clone <repository-url>
cd kavach

# Install dependencies
bun install
# OR: npm install
```

### 2. Environment Setup (1 minute)

```bash
# Copy environment file
cp .env.example .env

# Edit the .env file with minimal required settings
```

**Minimal .env configuration:**
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (using Docker defaults)
DATABASE_URL=postgresql://kavach_user:your_secure_password@localhost:5432/kavach_auth
POSTGRES_PASSWORD=your_secure_password

# Quick secrets (replace in production!)
JWT_SECRET=quick-dev-jwt-secret-replace-in-production-with-64-chars
SESSION_SECRET=quick-dev-session-secret-replace-in-production-with-64-chars

# Skip email for quick start (optional)
EMAIL_USER=test@example.com
EMAIL_PASSWORD=dummy_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="Kavach <no-reply@kavach.com>"

# Admin user
ADMIN_EMAIL=admin@kavach.com
ADMIN_PASSWORD=admin123
```

### 3. Database Setup (2 minutes)

```bash
# Start PostgreSQL with Docker
bun run docker:up

# Wait for database to be ready (about 30 seconds)
# You'll see "database system is ready to accept connections"

# Initialize database
bun run db:init

# Run migrations
bun run db:migrate

# Seed with sample data
bun run db:seed

# Create admin user
bun run create-admin
```

### 4. Start Application (1 minute)

```bash
# Start development server
bun run dev

# Application will be available at http://localhost:3000
```

## Quick Verification

### Test the Application

1. **Home Page**: http://localhost:3000
   - Should show the Kavach welcome page

2. **Health Check**: http://localhost:3000/api/v1/health
   - Should return JSON with system status

3. **Login Page**: http://localhost:3000/login
   - Should show login form

4. **Admin Login**: http://localhost:3000/admin/login
   - Login with: `admin@kavach.com` / `admin123`

### Test User Accounts

The seed script creates these test accounts:

#### Regular Users
```
Customer: customer@example.com / password123
Expert: expert@example.com / password123
```

#### Admin User
```
Admin: admin@kavach.com / admin123
```

### Quick API Test

Test the authentication API:

```bash
# Test user login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"password123"}'

# Expected: JSON response with user data and tokens
```

## What's Running?

After quick start, you have:

### Services
- **Next.js App**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Drizzle Studio**: Run `bun run db:studio` → http://localhost:4983

### Features Available
- ✅ User registration and login
- ✅ Role-based access (Customer, Expert, Admin)
- ✅ JWT authentication with refresh tokens
- ✅ Session management
- ✅ Rate limiting
- ✅ Admin dashboard
- ✅ Health monitoring
- ⚠️ Email verification (requires SMTP setup)

## Quick Exploration

### 1. User Registration
1. Go to http://localhost:3000/signup
2. Register a new account
3. Note: Email verification will be skipped in quick setup

### 2. Admin Dashboard
1. Go to http://localhost:3000/admin/login
2. Login with `admin@kavach.com` / `admin123`
3. Explore user management features

### 3. API Endpoints
Test these endpoints with curl or Postman:

```bash
# Health check
GET http://localhost:3000/api/v1/health

# User login
POST http://localhost:3000/api/v1/auth/login

# Get user profile (requires auth token)
GET http://localhost:3000/api/v1/users/profile
```

### 4. Database Exploration
```bash
# Open Drizzle Studio
bun run db:studio

# Browse tables: users, sessions, email_verifications
```

## Next Steps

Now that you have Kavach running:

### Immediate Next Steps
1. **Explore Features**: Check out [First Steps](./first-steps.md)
2. **Configure Email**: Set up SMTP for email verification
3. **Review Security**: Read [Security Guide](../security/README.md)

### Development Setup
1. **Full Installation**: Follow [Installation Guide](./installation.md) for complete setup
2. **Development Environment**: Set up [Development Tools](../development/setup/environment.md)
3. **Testing**: Run the test suite with `bun run test`

### Production Preparation
1. **Security**: Generate proper secrets and configure security settings
2. **Email**: Set up production SMTP service
3. **Database**: Configure production PostgreSQL
4. **Deployment**: Review [Deployment Guide](../deployment/README.md)

## Troubleshooting Quick Issues

### Database Won't Start
```bash
# Check Docker status
docker ps

# Restart database
bun run docker:down
bun run docker:up

# Check logs
docker logs kavach_postgres
```

### Port 3000 in Use
```bash
# Use different port
PORT=3001 bun run dev

# Or kill existing process
lsof -i :3000
kill -9 <PID>
```

### Migration Errors
```bash
# Reset database
bun run docker:down
docker volume rm kavach_postgres_data
bun run docker:up

# Re-run setup
bun run db:init
bun run db:migrate
bun run db:seed
```

### Can't Login
- Verify admin user was created: `bun run create-admin`
- Check database has users: `bun run db:studio`
- Try test accounts: `customer@example.com` / `password123`

## Quick Commands Reference

```bash
# Development
bun run dev              # Start dev server
bun run test             # Run tests
bun run lint             # Check code quality

# Database
bun run docker:up        # Start database
bun run docker:down      # Stop database
bun run db:studio        # Open database GUI
bun run db:migrate       # Run migrations
bun run db:seed          # Add sample data

# Utilities
bun run create-admin     # Create admin user
bun run test:email       # Test email config
```

## What's Next?

You now have a fully functional authentication system! Here's what to explore:

1. **[First Steps Guide](./first-steps.md)** - Learn about the features and how to use them
2. **[API Documentation](../api/README.md)** - Integrate with the authentication API
3. **[Development Setup](../development/setup/environment.md)** - Set up a complete development environment
4. **[Security Guide](../security/README.md)** - Understand the security features

Happy coding! 🚀