# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used in the Kavach authentication and user management system.

## Required Environment Variables

### Application Configuration

#### `NODE_ENV`
**Description**: Specifies the application environment
**Type**: String
**Required**: No
**Default**: `development`
**Valid Values**: `development`, `production`, `test`
**Example**: `NODE_ENV=production`
**Usage**: Controls application behavior, logging levels, and security settings

#### `NEXT_PUBLIC_APP_URL`
**Description**: Public URL of the application
**Type**: URL String
**Required**: Yes
**Default**: None
**Example**: `NEXT_PUBLIC_APP_URL=https://app.kavach.com`
**Usage**: Used for generating absolute URLs in emails, redirects, and API responses
**Note**: Must be accessible from client-side code (prefixed with `NEXT_PUBLIC_`)

### Database Configuration

#### `DATABASE_URL`
**Description**: PostgreSQL database connection string
**Type**: URL String
**Required**: Yes
**Default**: None
**Format**: `postgresql://username:password@host:port/database`
**Example**: `DATABASE_URL=postgresql://kavach_user:secure_password@localhost:5432/kavach_auth`
**Usage**: Primary database connection for all database operations
**Security**: Contains sensitive credentials - never commit to version control

#### `POSTGRES_PASSWORD`
**Description**: PostgreSQL database password (for Docker setup)
**Type**: String
**Required**: Yes (for Docker)
**Default**: None
**Example**: `POSTGRES_PASSWORD=your_secure_password`
**Usage**: Used by Docker Compose to set up PostgreSQL container
**Security**: Should match the password in `DATABASE_URL`

### Authentication & Security

#### `JWT_SECRET`
**Description**: Secret key for signing JWT tokens
**Type**: String
**Required**: Yes
**Minimum Length**: 30 characters
**Default**: None
**Example**: `JWT_SECRET=your-super-secure-jwt-secret-key-here-32-chars-minimum`
**Usage**: Signs and verifies JWT access and refresh tokens
**Security**: Must be cryptographically secure and kept secret
**Generation**: Use `openssl rand -base64 32` to generate

#### `SESSION_SECRET`
**Description**: Secret key for session management
**Type**: String
**Required**: No
**Default**: Uses `JWT_SECRET` if not provided
**Example**: `SESSION_SECRET=your-session-secret-key-different-from-jwt`
**Usage**: Used for session encryption and validation
**Security**: Should be different from `JWT_SECRET`

### Email Configuration

#### `EMAIL_USER`
**Description**: SMTP username/email address
**Type**: Email String
**Required**: Yes
**Default**: None
**Example**: `EMAIL_USER=noreply@kavach.com`
**Usage**: SMTP authentication and sender address
**Validation**: Must be a valid email address

#### `EMAIL_PASSWORD`
**Description**: SMTP password or app-specific password
**Type**: String
**Required**: Yes
**Minimum Length**: 4 characters
**Default**: None
**Example**: `EMAIL_PASSWORD=your_smtp_password_or_app_password`
**Usage**: SMTP authentication
**Security**: For Gmail, use App Passwords instead of account password

#### `SMTP_HOST`
**Description**: SMTP server hostname
**Type**: String
**Required**: Yes
**Default**: None
**Example**: `SMTP_HOST=smtp.gmail.com`
**Usage**: SMTP server connection
**Common Values**:
- Gmail: `smtp.gmail.com`
- Outlook: `smtp-mail.outlook.com`
- Yahoo: `smtp.mail.yahoo.com`

#### `SMTP_PORT`
**Description**: SMTP server port number
**Type**: Number String
**Required**: No
**Default**: `587`
**Example**: `SMTP_PORT=587`
**Usage**: SMTP server connection
**Common Values**:
- `587`: STARTTLS (recommended)
- `465`: SSL/TLS
- `25`: Unencrypted (not recommended)

#### `SMTP_SECURE`
**Description**: Enable SSL/TLS for SMTP connection
**Type**: Boolean String
**Required**: No
**Default**: `false`
**Valid Values**: `true`, `false`, `1`, `0`
**Example**: `SMTP_SECURE=false`
**Usage**: SMTP connection security
**Note**: Use `false` for port 587 (STARTTLS), `true` for port 465 (SSL)

#### `SMTP_FROM`
**Description**: Default sender address for emails
**Type**: Email String
**Required**: No
**Default**: Uses `EMAIL_USER` if not provided
**Example**: `SMTP_FROM="Kavach <noreply@kavach.com>"`
**Usage**: Default "From" address in outgoing emails
**Format**: Can include display name: `"Display Name <email@domain.com>"`

### Email Verification Configuration

#### `EMAIL_VERIFICATION_TYPE`
**Description**: Type of email verification to use
**Type**: String
**Required**: No
**Default**: `magic_link`
**Valid Values**: `magic_link`
**Example**: `EMAIL_VERIFICATION_TYPE=magic_link`
**Usage**: Determines email verification method

#### `EMAIL_VERIFICATION_MAGIC_LINK_EXPIRATION_HOURS`
**Description**: Magic link expiration time in hours
**Type**: Number String
**Required**: No
**Default**: `24`
**Example**: `EMAIL_VERIFICATION_MAGIC_LINK_EXPIRATION_HOURS=1`
**Usage**: Sets how long magic links remain valid
**Range**: 1-168 hours (1 week maximum recommended)

## Optional Environment Variables

### Admin Configuration

#### `ADMIN_EMAIL`
**Description**: Default admin email for seeding scripts
**Type**: Email String
**Required**: No
**Default**: `admin@kavach.com`
**Example**: `ADMIN_EMAIL=admin@company.com`
**Usage**: Used by database seeding scripts to create initial admin user

#### `ADMIN_PASSWORD`
**Description**: Default admin password for seeding scripts
**Type**: String
**Required**: No
**Default**: Auto-generated secure password
**Example**: `ADMIN_PASSWORD=SecureAdminPass123!`
**Usage**: Used by database seeding scripts
**Security**: If not provided, a secure password is generated automatically

### Feature Flags

#### `FEATURE_REFRESH_TOKENS`
**Description**: Enable refresh token functionality
**Type**: Boolean String
**Required**: No
**Default**: `true`
**Valid Values**: `true`, `false`, `1`, `0`
**Example**: `FEATURE_REFRESH_TOKENS=true`
**Usage**: Controls whether refresh tokens are issued and accepted

#### `FEATURE_EMAIL_VERIFICATION`
**Description**: Enable email verification requirement
**Type**: Boolean String
**Required**: No
**Default**: `true`
**Valid Values**: `true`, `false`, `1`, `0`
**Example**: `FEATURE_EMAIL_VERIFICATION=true`
**Usage**: Controls whether users must verify their email addresses

#### `FEATURE_RATE_LIMITING`
**Description**: Enable rate limiting on API endpoints
**Type**: Boolean String
**Required**: No
**Default**: `true`
**Valid Values**: `true`, `false`, `1`, `0`
**Example**: `FEATURE_RATE_LIMITING=true`
**Usage**: Controls API rate limiting functionality

#### `FEATURE_AUDIT_LOGGING`
**Description**: Enable detailed audit logging
**Type**: Boolean String
**Required**: No
**Default**: `true`
**Valid Values**: `true`, `false`, `1`, `0`
**Example**: `FEATURE_AUDIT_LOGGING=true`
**Usage**: Controls whether detailed audit logs are generated

### Rate Limiting Configuration

#### `RATE_LIMIT_WINDOW_MS`
**Description**: Rate limiting time window in milliseconds
**Type**: Number String
**Required**: No
**Default**: `900000` (15 minutes)
**Example**: `RATE_LIMIT_WINDOW_MS=900000`
**Usage**: Time window for rate limit calculations

#### `RATE_LIMIT_MAX_ATTEMPTS`
**Description**: Maximum attempts per rate limit window
**Type**: Number String
**Required**: No
**Default**: `5`
**Example**: `RATE_LIMIT_MAX_ATTEMPTS=5`
**Usage**: Maximum number of attempts allowed per window

### Logging Configuration

#### `LOG_LEVEL`
**Description**: Application logging level
**Type**: String
**Required**: No
**Default**: `info`
**Valid Values**: `error`, `warn`, `info`, `debug`, `trace`
**Example**: `LOG_LEVEL=debug`
**Usage**: Controls verbosity of application logs
**Levels**:
- `error`: Only error messages
- `warn`: Warnings and errors
- `info`: General information (recommended for production)
- `debug`: Detailed debugging information
- `trace`: Very detailed tracing (development only)

### Security Configuration

#### `CSP_EXTRA`
**Description**: Additional Content Security Policy directives
**Type**: String
**Required**: No
**Default**: None
**Example**: `CSP_EXTRA=script-src 'self' 'unsafe-inline'`
**Usage**: Extends default CSP with additional directives
**Format**: Standard CSP directive format

### Testing Configuration

#### `TEST_DATABASE_URL`
**Description**: Database URL for testing environment
**Type**: URL String
**Required**: No (only for testing)
**Default**: None
**Example**: `TEST_DATABASE_URL=postgresql://test_user:password@localhost:5432/kavach_test`
**Usage**: Separate database for running tests
**Note**: Should point to a different database than production/development

#### `DISABLE_ENV_VALIDATION`
**Description**: Disable environment variable validation
**Type**: Boolean String
**Required**: No
**Default**: `false`
**Valid Values**: `true`, `false`
**Example**: `DISABLE_ENV_VALIDATION=true`
**Usage**: Skips environment validation (testing only)
**Warning**: Only use in testing environments

## Environment File Examples

### Development (.env.local)

```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://kavach_user:dev_password@localhost:5432/kavach_auth
POSTGRES_PASSWORD=dev_password

# Authentication
JWT_SECRET=development-jwt-secret-key-32-characters-minimum
SESSION_SECRET=development-session-secret-different-from-jwt

# Email (Gmail example)
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="Kavach Dev <noreply@kavach.dev>"

# Email Verification
EMAIL_VERIFICATION_TYPE=magic_link
EMAIL_VERIFICATION_MAGIC_LINK_EXPIRATION_HOURS=24

# Admin
ADMIN_EMAIL=admin@kavach.dev
ADMIN_PASSWORD=DevAdminPass123!

# Features
FEATURE_REFRESH_TOKENS=true
FEATURE_EMAIL_VERIFICATION=true
FEATURE_RATE_LIMITING=false
FEATURE_AUDIT_LOGGING=true

# Logging
LOG_LEVEL=debug
```

### Production (.env.production)

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.kavach.com

# Database
DATABASE_URL=postgresql://kavach_prod:secure_prod_password@db.kavach.com:5432/kavach_auth

# Authentication
JWT_SECRET=production-jwt-secret-generated-with-openssl-rand-base64-32
SESSION_SECRET=production-session-secret-different-from-jwt-secret

# Email
EMAIL_USER=noreply@kavach.com
EMAIL_PASSWORD=production_smtp_password
SMTP_HOST=smtp.kavach.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="Kavach <noreply@kavach.com>"

# Email Verification
EMAIL_VERIFICATION_TYPE=magic_link
EMAIL_VERIFICATION_MAGIC_LINK_EXPIRATION_HOURS=1

# Admin
ADMIN_EMAIL=admin@kavach.com

# Features
FEATURE_REFRESH_TOKENS=true
FEATURE_EMAIL_VERIFICATION=true
FEATURE_RATE_LIMITING=true
FEATURE_AUDIT_LOGGING=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_ATTEMPTS=5

# Logging
LOG_LEVEL=info

# Security
CSP_EXTRA=upgrade-insecure-requests
```

### Testing (.env.test)

```bash
# Application
NODE_ENV=test
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5432/kavach_test

# Authentication
JWT_SECRET=test-jwt-secret-key-for-testing-only-32-chars
SESSION_SECRET=test-session-secret-for-testing-only

# Email (Mock/Test)
EMAIL_USER=test@example.com
EMAIL_PASSWORD=test_password
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false

# Features (Disabled for testing)
FEATURE_RATE_LIMITING=false
FEATURE_EMAIL_VERIFICATION=false

# Logging
LOG_LEVEL=error

# Testing
DISABLE_ENV_VALIDATION=false
```

## Environment Variable Validation

### Validation Rules

The application validates environment variables at startup using Zod schemas:

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().min(30, 'JWT_SECRET must be at least 30 characters'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  EMAIL_USER: z.string().email('EMAIL_USER must be a valid email'),
  EMAIL_PASSWORD: z.string().min(4, 'EMAIL_PASSWORD required'),
  SMTP_HOST: z.string().min(1, 'SMTP_HOST required'),
  SMTP_PORT: z.number().default(587),
  SMTP_SECURE: z.boolean().default(false),
});
```

### Common Validation Errors

1. **JWT_SECRET too short**: Must be at least 30 characters
2. **Invalid URL format**: DATABASE_URL and NEXT_PUBLIC_APP_URL must be valid URLs
3. **Invalid email format**: EMAIL_USER must be a valid email address
4. **Missing required variables**: All required variables must be set

### Testing Environment Variables

```bash
# Test environment variable validation
bun run dev --check-env

# Test specific configuration
bun run test:email
```

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**
2. **Use different secrets for different environments**
3. **Rotate secrets regularly**
4. **Use strong, randomly generated secrets**
5. **Limit access to production environment variables**

### Secret Generation

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32

# Generate admin password
openssl rand -base64 16
```

### Environment File Security

```bash
# Set proper permissions
chmod 600 .env.local
chmod 600 .env.production

# Add to .gitignore
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Verify database server is running
   - Check network connectivity and firewall settings

2. **Email Service Errors**
   - Verify SMTP credentials
   - Check `SMTP_HOST` and `SMTP_PORT`
   - For Gmail, ensure App Passwords are enabled

3. **JWT Token Errors**
   - Ensure `JWT_SECRET` is at least 30 characters
   - Check for special characters that might need escaping
   - Verify secret consistency across environments

4. **Environment Loading Issues**
   - Check file naming (`.env.local` for development)
   - Verify file permissions
   - Check for syntax errors in environment files

### Debugging Environment Variables

```bash
# Check loaded environment variables (development only)
console.log(process.env.NODE_ENV);
console.log(process.env.DATABASE_URL?.substring(0, 20) + '...');

# Use environment validation utility
import { loadEnv } from '@/lib/utils/env';
const env = loadEnv();
```

## Related Documentation

- [Configuration Reference](./configuration.md)
- [CLI Commands Reference](./cli-commands.md)
- [Development Setup](../development/setup/environment.md)
- [Deployment Configuration](../deployment/configuration/environment-variables.md)

---

*Environment variables reference last updated: January 2025*