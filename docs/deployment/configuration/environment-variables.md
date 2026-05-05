# Environment Variables Configuration

This document provides a comprehensive reference for all environment variables used in the Kavach authentication system. Proper configuration of these variables is essential for secure and reliable operation across different environments.

## Overview

Environment variables are used to configure the application without hardcoding sensitive information or environment-specific settings in the source code. The application uses a hierarchical configuration system that reads from:

1. Environment variables
2. `.env` files (development only)
3. Default values (where applicable)

## Required Variables

These variables must be set in all environments:

### Application Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `production`, `development`, `staging` | Yes |
| `PORT` | Port number for the application | `3000` | Yes |
| `APP_URL` | Base URL of the application | `https://auth.yourdomain.com` | Yes |

### Database Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | Complete PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `DB_HOST` | Database host | `localhost` or `db.example.com` | No* |
| `DB_PORT` | Database port | `5432` | No* |
| `DB_NAME` | Database name | `kavach_auth` | No* |
| `DB_USER` | Database username | `postgres` | No* |
| `DB_PASSWORD` | Database password | `secure_password` | No* |
| `DB_SSL` | Enable SSL for database connection | `true`, `false` | No |

*Required if `DATABASE_URL` is not provided

### Authentication & Security

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT token signing | `your-super-secure-jwt-secret` | Yes |
| `JWT_EXPIRES_IN` | JWT token expiration time | `24h`, `1d`, `3600` | Yes |
| `REFRESH_TOKEN_SECRET` | Secret key for refresh tokens | `your-refresh-token-secret` | Yes |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiration | `7d`, `604800` | Yes |
| `BCRYPT_ROUNDS` | Number of bcrypt hashing rounds | `12` | No |

### Email Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` | Yes |
| `SMTP_PORT` | SMTP server port | `587`, `465`, `25` | Yes |
| `SMTP_SECURE` | Use SSL/TLS for SMTP | `true`, `false` | No |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` | Yes |
| `SMTP_PASS` | SMTP password or app password | `your-app-password` | Yes |
| `FROM_EMAIL` | Default sender email address | `noreply@yourdomain.com` | Yes |
| `FROM_NAME` | Default sender name | `Kavach Auth System` | No |

### Redis Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Complete Redis connection string | `redis://localhost:6379` | No |
| `REDIS_HOST` | Redis host | `localhost` | No* |
| `REDIS_PORT` | Redis port | `6379` | No* |
| `REDIS_PASSWORD` | Redis password | `redis_password` | No |
| `REDIS_DB` | Redis database number | `0` | No |

*Required if `REDIS_URL` is not provided and Redis is used

## Optional Variables

These variables have default values but can be customized:

### Rate Limiting

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 min) | `600000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | `50` |
| `RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS` | Skip successful requests in count | `false` | `true` |
| `RATE_LIMIT_SKIP_FAILED_REQUESTS` | Skip failed requests in count | `false` | `true` |

### Logging Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging level | `info` | `debug`, `warn`, `error` |
| `LOG_FORMAT` | Log output format | `json` | `pretty`, `json` |
| `LOG_FILE` | Log file path | Not set | `/var/log/app.log` |
| `ENABLE_REQUEST_LOGGING` | Log HTTP requests | `true` | `false` |

### Security Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CORS_ORIGIN` | CORS allowed origins | `*` | `https://yourdomain.com` |
| `CORS_CREDENTIALS` | Allow credentials in CORS | `true` | `false` |
| `HELMET_ENABLED` | Enable Helmet security headers | `true` | `false` |
| `TRUST_PROXY` | Trust proxy headers | `false` | `true` |

### Session Configuration

| Variable | Description | Default | Example |
|----------|-------------|---------|----------|
| `SESSION_SECRET` | Session secret key | Generated | `your-session-secret` |
| `SESSION_MAX_AGE` | Session maximum age | `86400000` (24h) | `3600000` |
| `SESSION_SECURE` | Require HTTPS for sessions | `true` in prod | `false` |
| `SESSION_SAME_SITE` | SameSite cookie attribute | `strict` | `lax`, `none` |

### Email Verification

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `EMAIL_VERIFICATION_EXPIRES_IN` | Verification token expiration | `24h` | `1h`, `3600` |
| `EMAIL_VERIFICATION_REQUIRED` | Require email verification | `true` | `false` |
| `RESEND_VERIFICATION_COOLDOWN` | Cooldown between resends | `300000` (5 min) | `600000` |

### Monitoring & Metrics

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENABLE_METRICS` | Enable Prometheus metrics | `false` | `true` |
| `METRICS_PORT` | Metrics server port | `9090` | `3001` |
| `HEALTH_CHECK_TIMEOUT` | Health check timeout | `5000` | `10000` |
| `ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | `false` | `true` |

## Environment-Specific Configurations

### Development Environment

```bash
# .env.development
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/kavach_auth_dev
DB_SSL=false

# Authentication
JWT_SECRET=dev-jwt-secret-not-for-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=dev-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

# Email (using Ethereal for testing)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ethereal.user@ethereal.email
SMTP_PASS=ethereal.password
FROM_EMAIL=noreply@localhost
FROM_NAME=Kavach Auth Dev

# Redis
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
ENABLE_REQUEST_LOGGING=true

# Security (relaxed for development)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true
SESSION_SECURE=false
TRUST_PROXY=false

# Features
EMAIL_VERIFICATION_REQUIRED=false
ENABLE_METRICS=true
ENABLE_PERFORMANCE_MONITORING=true
```

### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
PORT=3000
APP_URL=https://staging-auth.yourdomain.com

# Database
DATABASE_URL=postgresql://staging_user:staging_pass@staging-db.example.com:5432/kavach_auth_staging
DB_SSL=true

# Authentication
JWT_SECRET=staging-jwt-secret-change-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_SECRET=staging-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.staging-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Kavach Auth Staging

# Redis
REDIS_URL=redis://staging-redis.example.com:6379

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_REQUEST_LOGGING=true

# Security
CORS_ORIGIN=https://staging.yourdomain.com
CORS_CREDENTIALS=true
SESSION_SECURE=true
TRUST_PROXY=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Features
EMAIL_VERIFICATION_REQUIRED=true
ENABLE_METRICS=true
ENABLE_PERFORMANCE_MONITORING=true
```

### Production Environment

```bash
# Production environment variables (stored in secure parameter store)
NODE_ENV=production
PORT=3000
APP_URL=https://auth.yourdomain.com

# Database (use connection pooling in production)
DATABASE_URL=postgresql://prod_user:secure_password@prod-db.example.com:5432/kavach_auth?sslmode=require&pool_max=20
DB_SSL=true

# Authentication (use strong, unique secrets)
JWT_SECRET=super-secure-jwt-secret-256-bits-minimum
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=super-secure-refresh-secret-256-bits
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Email (production SMTP service)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.production-api-key-with-send-permissions
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Kavach Authentication

# Redis (with password and SSL)
REDIS_URL=rediss://prod-redis.example.com:6380?password=redis_password

# Logging (structured logging for production)
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE=/var/log/kavach-auth/app.log
ENABLE_REQUEST_LOGGING=false

# Security (strict production settings)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
CORS_CREDENTIALS=true
HELMET_ENABLED=true
SESSION_SECURE=true
TRUST_PROXY=true

# Rate Limiting (stricter in production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Features
EMAIL_VERIFICATION_REQUIRED=true
EMAIL_VERIFICATION_EXPIRES_IN=1h
RESEND_VERIFICATION_COOLDOWN=600000

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_TIMEOUT=5000
ENABLE_PERFORMANCE_MONITORING=true
```

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use environment-specific secret management**
   - Development: `.env` files (not committed)
   - Staging/Production: AWS Parameter Store, HashiCorp Vault, or similar

3. **Rotate secrets regularly**
   ```bash
   # Generate secure random secrets
   openssl rand -base64 32  # For JWT secrets
   openssl rand -hex 32     # For session secrets
   ```

### Variable Validation

The application validates environment variables on startup:

```typescript
// Example validation schema
const envSchema = {
  NODE_ENV: {
    required: true,
    values: ['development', 'staging', 'production']
  },
  JWT_SECRET: {
    required: true,
    minLength: 32
  },
  DATABASE_URL: {
    required: true,
    format: 'postgresql://'
  }
};
```

### Access Control

1. **Principle of least privilege**
   - Only provide access to necessary environment variables
   - Use different service accounts for different environments

2. **Audit access**
   - Log access to sensitive configuration
   - Monitor for unauthorized configuration changes

## Docker Configuration

### Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=${PORT:-3000}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=${REDIS_URL}
    env_file:
      - .env
```

### Dockerfile

```dockerfile
# Use build args for non-sensitive configuration
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Runtime environment variables
ENV PORT=3000
ENV LOG_LEVEL=info
```

## Kubernetes Configuration

### ConfigMap for Non-Sensitive Data

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kavach-auth-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://yourdomain.com"
```

### Secret for Sensitive Data

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kavach-auth-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@host:5432/db"
  JWT_SECRET: "your-jwt-secret"
  SMTP_PASS: "your-smtp-password"
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kavach-auth
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: kavach-auth-config
        - secretRef:
            name: kavach-auth-secrets
```

## AWS Configuration

### Parameter Store

```bash
# Store parameters in AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name "/kavach-auth/prod/database-url" \
  --value "postgresql://..." \
  --type "SecureString"

aws ssm put-parameter \
  --name "/kavach-auth/prod/jwt-secret" \
  --value "your-jwt-secret" \
  --type "SecureString"
```

### ECS Task Definition

```json
{
  "containerDefinitions": [
    {
      "name": "kavach-auth",
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:region:account:parameter/kavach-auth/prod/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:ssm:region:account:parameter/kavach-auth/prod/jwt-secret"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **Missing Required Variables**
   ```bash
   # Check if all required variables are set
   npm run validate-env
   
   # Error: JWT_SECRET is required
   export JWT_SECRET="your-secret-here"
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   npm run db:test
   
   # Check DATABASE_URL format
   echo $DATABASE_URL
   # Should be: postgresql://user:pass@host:port/database
   ```

3. **Email Configuration Problems**
   ```bash
   # Test email configuration
   npm run test:email
   
   # Check SMTP settings
   echo "Host: $SMTP_HOST"
   echo "Port: $SMTP_PORT"
   echo "User: $SMTP_USER"
   ```

### Validation Script

```bash
#!/bin/bash
# validate-env.sh

required_vars=(
  "NODE_ENV"
  "DATABASE_URL"
  "JWT_SECRET"
  "SMTP_HOST"
  "SMTP_USER"
  "SMTP_PASS"
)

missing_vars=()

for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    missing_vars+=("$var")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "Error: Missing required environment variables:"
  printf '%s\n' "${missing_vars[@]}"
  exit 1
else
  echo "All required environment variables are set."
fi
```

## Migration Guide

### Upgrading Environment Variables

When updating the application, check for new or changed environment variables:

1. **Review changelog** for environment variable changes
2. **Update configuration** in all environments
3. **Test configuration** before deploying
4. **Update documentation** with any changes

### Version Compatibility

| App Version | Config Version | Changes |
|-------------|----------------|---------|
| v1.0.0 | v1.0 | Initial configuration |
| v1.1.0 | v1.1 | Added Redis configuration |
| v1.2.0 | v1.2 | Added rate limiting options |
| v2.0.0 | v2.0 | Breaking: JWT_EXPIRES_IN format changed |

## Reference

### Environment Variable Naming Conventions

- Use `UPPER_CASE` with underscores
- Group related variables with prefixes (e.g., `DB_`, `SMTP_`, `REDIS_`)
- Use descriptive names that indicate purpose
- Avoid abbreviations unless commonly understood

### Default Values Reference

```typescript
// Default configuration values
export const defaults = {
  PORT: 3000,
  LOG_LEVEL: 'info',
  LOG_FORMAT: 'json',
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  SESSION_MAX_AGE: 86400000, // 24 hours
  EMAIL_VERIFICATION_EXPIRES_IN: '24h',
  RESEND_VERIFICATION_COOLDOWN: 300000, // 5 minutes
  HEALTH_CHECK_TIMEOUT: 5000,
  CORS_ORIGIN: '*',
  CORS_CREDENTIALS: true,
  SESSION_SECURE: process.env.NODE_ENV === 'production',
  SESSION_SAME_SITE: 'strict'
};
```

This configuration reference should be updated whenever new environment variables are added or existing ones are modified.