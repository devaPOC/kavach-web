# Installation Guide

This comprehensive guide will walk you through installing Kavach on your local development environment. Follow these steps to get a fully functional authentication and user management system running.

## Prerequisites

Before installing Kavach, ensure you have the following installed:

### Required Software

#### 1. Runtime Environment
- **Bun** (recommended) - [Install Bun](https://bun.sh/docs/installation)
  ```bash
  # macOS/Linux
  curl -fsSL https://bun.sh/install | bash
  
  # Windows (PowerShell)
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```
- **OR Node.js 18+** - [Download Node.js](https://nodejs.org/)

#### 2. Database
- **PostgreSQL 14+** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **OR Docker** (for containerized database) - [Install Docker](https://docs.docker.com/get-docker/)

#### 3. Version Control
- **Git** - [Install Git](https://git-scm.com/downloads)

#### 4. Code Editor (Recommended)
- **VS Code** - [Download VS Code](https://code.visualstudio.com/)

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for package downloads

## Installation Steps

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd kavach

# Verify you're in the correct directory
ls -la
# You should see package.json, docker-compose.yml, etc.
```

### Step 2: Install Dependencies

Choose your preferred package manager:

#### Using Bun (Recommended)
```bash
# Install dependencies
bun install

# Verify installation
bun --version
```

#### Using npm
```bash
# Install dependencies
npm install

# Verify installation
npm --version
```

#### Using yarn
```bash
# Install dependencies
yarn install

# Verify installation
yarn --version
```

### Step 3: Environment Configuration

#### 3.1 Create Environment File
```bash
# Copy the example environment file
cp .env.example .env
```

#### 3.2 Configure Environment Variables

Edit the `.env` file with your preferred text editor:

```bash
# Open with VS Code
code .env

# Or with nano
nano .env

# Or with vim
vim .env
```

#### 3.3 Required Configuration

Update the following variables in your `.env` file:

```env
# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://kavach_user:your_secure_password@localhost:5432/kavach_auth
POSTGRES_PASSWORD=your_secure_password

# Authentication Secrets (Generate strong secrets!)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
SESSION_SECRET=your-super-secret-session-key-at-least-32-characters-long

# Email Configuration (Gmail example)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="Kavach <no-reply@kavach.com>"

# Admin User (for initial setup)
ADMIN_EMAIL=admin@kavach.com
ADMIN_PASSWORD=your_admin_password
```

#### 3.4 Generate Secure Secrets

For production-grade security, generate strong secrets:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Database Setup

You have two options for setting up the database:

#### Option A: Docker Database (Recommended for Development)

```bash
# Start PostgreSQL with Docker
bun run docker:up

# Verify database is running
docker ps
# You should see kavach_postgres container running

# Check database health
docker logs kavach_postgres
```

#### Option B: Local PostgreSQL Installation

If you have PostgreSQL installed locally:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE kavach_auth;
CREATE USER kavach_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kavach_auth TO kavach_user;

# Exit PostgreSQL
\q
```

### Step 5: Database Initialization

```bash
# Initialize the database schema
bun run db:init

# Run database migrations
bun run db:migrate

# Seed the database with sample data
bun run db:seed

# Create an admin user
bun run create-admin
```

### Step 6: Verify Installation

#### 6.1 Run Tests
```bash
# Run the test suite
bun run test

# Expected output: All tests should pass
```

#### 6.2 Start Development Server
```bash
# Start the development server
bun run dev

# The server should start on http://localhost:3000
```

#### 6.3 Verify Application
Open your browser and navigate to:

1. **Home Page**: http://localhost:3000
2. **Health Check**: http://localhost:3000/api/v1/health
3. **Login Page**: http://localhost:3000/login
4. **Admin Dashboard**: http://localhost:3000/admin/login

## Email Configuration

### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Update .env file**:
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=generated_app_password
   ```

### Test Email Configuration
```bash
# Test email sending
bun run test:email

# Expected output: Email sent successfully
```

### Other Email Providers

#### Outlook/Hotmail
```env
EMAIL_USER=your_email@outlook.com
EMAIL_PASSWORD=your_password
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Custom SMTP
```env
EMAIL_USER=your_email@yourdomain.com
EMAIL_PASSWORD=your_password
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Development Tools

### Database Management

#### Drizzle Studio (Recommended)
```bash
# Open database GUI
bun run db:studio

# Access at http://localhost:4983
```

#### Adminer (Docker)
If using Docker database:
```bash
# Adminer is available at http://localhost:8080
# Server: postgres
# Username: kavach_user
# Password: your_secure_password
# Database: kavach_auth
```

### Code Quality Tools

#### ESLint
```bash
# Run linting
bun run lint

# Fix auto-fixable issues
bun run lint --fix
```

#### TypeScript
```bash
# Type checking
npx tsc --noEmit
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check if PostgreSQL is running
docker ps  # For Docker setup
# OR
pg_isready -h localhost -p 5432  # For local PostgreSQL

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

#### 2. Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 bun run dev
```

#### 3. Email Not Sending
```bash
# Test email configuration
bun run test:email

# Check SMTP settings in .env
# Verify Gmail app password is correct
```

#### 4. Permission Errors
```bash
# Fix npm/bun permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.bun
sudo chown -R $(whoami) ~/.npm

# Clear cache
bun pm cache rm
# OR
npm cache clean --force
```

#### 5. TypeScript Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
bun install

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Getting Help

If you encounter issues not covered here:

1. Check the [Development Setup Troubleshooting](../development/setup/troubleshooting.md) guide
2. Review the [FAQ](../user-guides/faq/README.md)
3. Check the project's issue tracker
4. Ensure all prerequisites are correctly installed

## Next Steps

After successful installation:

1. **Explore the Application**: Follow the [First Steps](./first-steps.md) guide
2. **Development Setup**: Review [Development Environment Setup](../development/setup/environment.md)
3. **API Documentation**: Check out the [API Reference](../api/README.md)
4. **Security**: Read the [Security Guide](../security/README.md)

## Verification Checklist

Before proceeding, ensure:

- [ ] All dependencies installed successfully
- [ ] Database is running and accessible
- [ ] Environment variables are configured
- [ ] Database migrations completed
- [ ] Tests pass
- [ ] Development server starts without errors
- [ ] Health check endpoint returns success
- [ ] Email configuration tested (if using email features)

Congratulations! You now have Kavach running locally. 🎉

## Production Deployment

For production deployment, see:
- [Deployment Guide](../deployment/README.md)
- [Security Best Practices](../security/best-practices/README.md)
- [Environment Configuration](../deployment/configuration/README.md)