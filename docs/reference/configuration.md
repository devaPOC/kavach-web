# Configuration Reference

This document provides a comprehensive reference for all configuration options available in the Kavach authentication and user management system.

## Application Configuration

### Next.js Configuration

**File**: `next.config.ts`

```typescript
const nextConfig = {
  // Configuration options
  experimental: {
    turbo: true // Enable Turbopack for faster development
  }
}
```

### TypeScript Configuration

**File**: `tsconfig.json`

Key configuration options:
- **target**: ES2017
- **lib**: DOM, ES6
- **allowJs**: false
- **skipLibCheck**: true
- **strict**: true
- **moduleResolution**: node
- **resolveJsonModule**: true
- **isolatedModules**: true
- **jsx**: preserve
- **incremental**: true

Path mapping:
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

### ESLint Configuration

**File**: `eslint.config.mjs`

Extends:
- `@eslint/eslintrc`
- `next/core-web-vitals`

### Tailwind CSS Configuration

**File**: `tailwind.config.js`

Key features:
- Custom color palette
- Typography utilities
- Component variants
- Animation utilities

## Database Configuration

### Drizzle Configuration

**File**: `drizzle.config.ts`

```typescript
export default defineConfig({
  schema: './src/lib/database/schema/*.ts',
  out: './src/lib/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
```

**Options**:
- **schema**: Path to schema files
- **out**: Migration output directory
- **dialect**: Database type (postgresql)
- **verbose**: Enable detailed logging
- **strict**: Enable strict mode for migrations

### Database Connection

**Configuration Location**: `src/lib/database/connection.ts`

Connection pool settings:
- **max**: Maximum connections (default: 20)
- **idleTimeoutMillis**: Idle timeout (default: 30000ms)
- **connectionTimeoutMillis**: Connection timeout (default: 2000ms)

## Authentication Configuration

### JWT Configuration

**Location**: `src/lib/auth/jwt-utils.ts`

Default settings:
- **Algorithm**: HS256
- **Access Token Expiry**: 15 minutes
- **Refresh Token Expiry**: 7 days
- **Issuer**: Kavach Auth System
- **Audience**: Kavach Users

### Session Configuration

**Location**: `src/lib/auth/session-manager.ts`

Settings:
- **Session Duration**: 24 hours (configurable)
- **Cleanup Interval**: 1 hour
- **Max Sessions per User**: 5

### Password Policy

**Location**: `src/lib/auth/password-utils.ts`

Requirements:
- **Minimum Length**: 8 characters
- **Maximum Length**: 128 characters
- **Required**: Uppercase, lowercase, number, special character
- **Forbidden**: Common passwords, user information

## Email Configuration

### SMTP Settings

**Environment Variables Required**:
- `EMAIL_USER`: SMTP username
- `EMAIL_PASSWORD`: SMTP password
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port
- `SMTP_SECURE`: Use TLS/SSL (boolean)
- `SMTP_FROM`: Default sender address

### Email Templates

**Location**: `src/lib/email/templates/`

Available templates:
- **verification.ts**: Email verification template
- **welcome.ts**: Welcome email template

Template variables:
- `firstName`: User's first name
- `lastName`: User's last name
- `verificationUrl`: Magic link URL
- `appUrl`: Application base URL

## Rate Limiting Configuration

### Default Limits

**Location**: `src/lib/auth/rate-limiter.ts`

Endpoint-specific limits:
- **Login**: 5 attempts per 15 minutes
- **Registration**: 3 attempts per hour
- **Password Reset**: 3 attempts per hour
- **Email Verification**: 5 attempts per hour

### Rate Limit Storage

**Implementation**: In-memory store (development) / Redis (production)

Configuration options:
- **Window Size**: Time window for rate limiting
- **Max Attempts**: Maximum attempts per window
- **Block Duration**: How long to block after limit exceeded

## Logging Configuration

### Log Levels

**Available Levels**:
- **error**: Error messages only
- **warn**: Warnings and errors
- **info**: Informational messages (default)
- **debug**: Detailed debugging information
- **trace**: Very detailed tracing

### Log Transport

**Location**: `src/lib/utils/log-transport.ts`

Transports:
- **Console**: Development logging
- **File**: Production file logging
- **External**: Third-party logging services

## Security Configuration

### CORS Settings

**Default Configuration**:
- **Origin**: Same origin only
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization
- **Credentials**: true

### Content Security Policy

**Headers**:
- **default-src**: 'self'
- **script-src**: 'self' 'unsafe-inline'
- **style-src**: 'self' 'unsafe-inline'
- **img-src**: 'self' data: https:

## Feature Flags

### Available Flags

**Location**: Environment variables

Current flags:
- `FEATURE_REFRESH_TOKENS`: Enable refresh token functionality
- `FEATURE_EMAIL_VERIFICATION`: Enable email verification
- `FEATURE_RATE_LIMITING`: Enable rate limiting
- `FEATURE_AUDIT_LOGGING`: Enable audit logging

### Usage

```typescript
const isFeatureEnabled = process.env.FEATURE_NAME === 'true';
```

## Performance Configuration

### Caching

**Strategy**: In-memory caching with TTL

Cache settings:
- **User Cache TTL**: 5 minutes
- **Session Cache TTL**: 15 minutes
- **Configuration Cache TTL**: 1 hour

### Database Optimization

**Connection Pooling**:
- **Min Connections**: 2
- **Max Connections**: 20
- **Idle Timeout**: 30 seconds

**Query Optimization**:
- **Prepared Statements**: Enabled
- **Query Timeout**: 30 seconds
- **Connection Timeout**: 5 seconds

## Monitoring Configuration

### Health Checks

**Endpoints**:
- `/api/v1/health`: Basic health check
- `/api/v1/metrics`: Performance metrics
- `/api/v1/monitoring`: Detailed monitoring data

**Check Intervals**:
- **Database**: Every 30 seconds
- **External Services**: Every 60 seconds
- **Memory Usage**: Every 15 seconds

### Metrics Collection

**Collected Metrics**:
- Request count and duration
- Database query performance
- Authentication success/failure rates
- Error rates by endpoint
- Memory and CPU usage

## Development Configuration

### Hot Reload

**Settings**:
- **Enabled**: Development mode only
- **Watch Patterns**: `src/**/*`, `docs/**/*`
- **Ignore Patterns**: `node_modules`, `.next`, `dist`

### Testing Configuration

**File**: `vitest.config.ts`

Settings:
- **Test Environment**: Node.js
- **Coverage Provider**: v8
- **Coverage Threshold**: 80%
- **Test Timeout**: 10 seconds

## Production Configuration

### Optimization

**Build Settings**:
- **Minification**: Enabled
- **Tree Shaking**: Enabled
- **Code Splitting**: Automatic
- **Bundle Analysis**: Available

### Security Hardening

**Production-only Settings**:
- **HTTPS Only**: Enforced
- **Secure Headers**: Enabled
- **Rate Limiting**: Strict
- **Logging**: Structured JSON

## Configuration Validation

### Environment Validation

**Location**: `src/lib/utils/env.ts`

Validation rules:
- **Required Variables**: Checked at startup
- **Format Validation**: URL, email, number formats
- **Security Validation**: Minimum secret lengths

### Runtime Validation

**Checks**:
- Database connectivity
- SMTP configuration
- JWT secret strength
- File permissions

## Troubleshooting Configuration Issues

### Common Issues

1. **Database Connection Failures**
   - Check `DATABASE_URL` format
   - Verify database server is running
   - Check network connectivity

2. **Email Service Issues**
   - Verify SMTP credentials
   - Check firewall settings
   - Test with email service provider

3. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set and strong
   - Check token expiration settings
   - Verify algorithm compatibility

### Configuration Testing

**Commands**:
```bash
# Test database configuration
bun run db:init

# Test email configuration
bun run test:email

# Validate environment variables
bun run dev --check-env
```

## Related Documentation

- [Environment Variables Reference](./environment-variables.md)
- [CLI Commands Reference](./cli-commands.md)
- [Development Setup](../development/setup/README.md)
- [Deployment Configuration](../deployment/configuration/README.md)

---

*Configuration reference last updated: January 2025*