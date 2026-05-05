# Database Setup and Configuration

This guide covers comprehensive database setup for Kavach development, including PostgreSQL installation, configuration, schema management, and development best practices.

## Overview

Kavach uses PostgreSQL as its primary database with Drizzle ORM for type-safe database operations. The database architecture supports:

- **Multi-role user management** (Customer, Expert, Admin)
- **Session management** with JWT token storage
- **Email verification** with token tracking
- **Audit logging** for security events
- **Profile management** with role-specific data

## Database Architecture

### Core Tables

```sql
-- Users table (main user accounts)
users
├── id (UUID, primary key)
├── email (unique, not null)
├── password_hash (not null)
├── role (customer|expert|admin)
├── email_verified (boolean)
├── account_status (active|paused|banned)
├── created_at, updated_at
└── profile data (first_name, last_name, etc.)

-- Sessions table (JWT session management)
sessions
├── id (UUID, primary key)
├── user_id (foreign key to users)
├── token_type (access|refresh)
├── jti (JWT ID, unique)
├── expires_at (timestamp)
├── created_at, updated_at
└── revoked_at (nullable)

-- Email verifications table
email_verifications
├── id (UUID, primary key)
├── user_id (foreign key to users)
├── token (unique verification token)
├── expires_at (timestamp)
├── verified_at (nullable)
└── created_at, updated_at

-- Customer profiles (role-specific data)
customer_profiles
├── id (UUID, primary key)
├── user_id (foreign key to users)
├── bio, location, preferences
└── created_at, updated_at

-- Expert profiles (role-specific data)
expert_profiles
├── id (UUID, primary key)
├── user_id (foreign key to users)
├── specialization, experience, certifications
└── created_at, updated_at
```

## Installation Options

### Option 1: Docker Setup (Recommended for Development)

#### 1. Using Docker Compose

The project includes a pre-configured Docker Compose setup:

```yaml
# docker-compose.yml (already included)
services:
  postgres:
    image: postgres:15-alpine
    container_name: kavach_postgres
    environment:
      POSTGRES_DB: kavach_auth
      POSTGRES_USER: kavach_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your_secure_password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kavach_user -d kavach_auth"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
```

#### 2. Start Database

```bash
# Start PostgreSQL container
bun run docker:up

# Verify container is running
docker ps
# Should show kavach_postgres container

# Check database health
docker logs kavach_postgres

# Connect to database
docker exec -it kavach_postgres psql -U kavach_user -d kavach_auth
```

#### 3. Environment Configuration

```env
# .env configuration for Docker database
DATABASE_URL=postgresql://kavach_user:your_secure_password@localhost:5432/kavach_auth
POSTGRES_PASSWORD=your_secure_password
```

### Option 2: Local PostgreSQL Installation

#### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create user and database
createuser -s kavach_user
createdb -O kavach_user kavach_auth
```

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create user and database
sudo -u postgres createuser -s kavach_user
sudo -u postgres createdb -O kavach_user kavach_auth

# Set password for user
sudo -u postgres psql -c "ALTER USER kavach_user PASSWORD 'your_secure_password';"
```

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run installer and follow setup wizard
3. Use pgAdmin or command line to create user and database

#### 2. Database Configuration

```bash
# Connect to PostgreSQL
psql -U kavach_user -d kavach_auth

# Verify connection
\conninfo

# List databases
\l

# Exit
\q
```

#### 3. Environment Configuration

```env
# .env configuration for local PostgreSQL
DATABASE_URL=postgresql://kavach_user:your_secure_password@localhost:5432/kavach_auth
```

## Database Schema Management

### 1. Drizzle ORM Configuration

The project uses Drizzle ORM for type-safe database operations. Configuration is in `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default {
  schema: './src/lib/database/schema/*',
  out: './src/lib/database/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### 2. Schema Definition

Database schemas are defined in TypeScript files:

```typescript
// src/lib/database/schema/users.ts
import { pgTable, uuid, varchar, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['customer', 'expert', 'admin']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'paused', 'banned']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('customer'),
  emailVerified: boolean('email_verified').notNull().default(false),
  accountStatus: accountStatusEnum('account_status').notNull().default('active'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3. Migration Workflow

#### Generate Migrations

```bash
# After modifying schema files, generate migration
bun run db:generate

# This creates a new migration file in src/lib/database/migrations/
# Example: 0001_add_user_preferences.sql
```

#### Review Migrations

```bash
# Check generated migration
ls -la src/lib/database/migrations/

# Review the SQL
cat src/lib/database/migrations/0001_add_user_preferences.sql
```

#### Apply Migrations

```bash
# Apply all pending migrations
bun run db:migrate

# Verify migration was applied
bun run db:studio
# Check the database schema in the GUI
```

#### Migration Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations on development data** first
3. **Create backup** before applying to production
4. **Use descriptive migration names**
5. **Keep migrations small and focused**

### 4. Database Initialization

#### Initialize Database

```bash
# Run the initialization script
bun run db:init

# This script:
# 1. Ensures database exists
# 2. Runs all migrations
# 3. Sets up initial data structures
```

#### Seed Development Data

```bash
# Add sample data for development
bun run db:seed

# This creates:
# - Test user accounts
# - Sample profiles
# - Development admin user
```

#### Create Admin User

```bash
# Create admin user interactively
bun run create-admin

# Or with environment variables
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure123 bun run create-admin
```

## Development Database Management

### 1. Database GUI Tools

#### Drizzle Studio (Recommended)

```bash
# Start Drizzle Studio
bun run db:studio

# Access at http://localhost:4983
# Features:
# - Browse all tables
# - Edit data directly
# - View relationships
# - Execute queries
```

#### pgAdmin

```bash
# Install pgAdmin
# macOS: brew install --cask pgadmin4
# Ubuntu: sudo apt install pgadmin4

# Connect with:
# Host: localhost
# Port: 5432
# Database: kavach_auth
# Username: kavach_user
# Password: your_secure_password
```

#### Command Line Tools

```bash
# Connect to database
psql -U kavach_user -d kavach_auth

# Common psql commands
\dt          # List tables
\d users     # Describe users table
\du          # List users
\l           # List databases
\q           # Quit

# Execute queries
SELECT * FROM users LIMIT 5;
SELECT COUNT(*) FROM sessions;
```

### 2. Database Maintenance

#### Regular Maintenance Tasks

```bash
# Run maintenance script
bun run db:maintenance

# This script performs:
# - Cleanup expired sessions
# - Remove old email verification tokens
# - Update statistics
# - Vacuum database
```

#### Manual Maintenance

```sql
-- Clean expired sessions
DELETE FROM sessions WHERE expires_at < NOW();

-- Clean expired email verifications
DELETE FROM email_verifications WHERE expires_at < NOW() AND verified_at IS NULL;

-- Update table statistics
ANALYZE;

-- Vacuum database
VACUUM;
```

### 3. Backup and Restore

#### Create Backup

```bash
# Full database backup
pg_dump -U kavach_user -h localhost kavach_auth > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only backup
pg_dump -U kavach_user -h localhost --schema-only kavach_auth > schema_backup.sql

# Data only backup
pg_dump -U kavach_user -h localhost --data-only kavach_auth > data_backup.sql
```

#### Restore Backup

```bash
# Restore full backup
psql -U kavach_user -d kavach_auth < backup_20250120_143000.sql

# Restore to new database
createdb -O kavach_user kavach_auth_restored
psql -U kavach_user -d kavach_auth_restored < backup_20250120_143000.sql
```

## Multiple Environment Setup

### 1. Development Environment

```env
# .env.development
DATABASE_URL=postgresql://kavach_user:dev_password@localhost:5432/kavach_auth_dev
```

```bash
# Create development database
createdb -O kavach_user kavach_auth_dev

# Run migrations for development
DATABASE_URL=postgresql://kavach_user:dev_password@localhost:5432/kavach_auth_dev bun run db:migrate
```

### 2. Test Environment

```env
# .env.test
DATABASE_URL=postgresql://kavach_user:test_password@localhost:5432/kavach_auth_test
```

```bash
# Create test database
createdb -O kavach_user kavach_auth_test

# Run migrations for test
NODE_ENV=test bun run db:migrate

# Seed test data
NODE_ENV=test bun run db:seed
```

### 3. Environment-Specific Scripts

```json
// package.json scripts
{
  "db:dev:migrate": "NODE_ENV=development bun run db:migrate",
  "db:test:migrate": "NODE_ENV=test bun run db:migrate",
  "db:dev:seed": "NODE_ENV=development bun run db:seed",
  "db:test:seed": "NODE_ENV=test bun run db:seed",
  "db:dev:reset": "NODE_ENV=development bun run scripts/reset-db.ts",
  "db:test:reset": "NODE_ENV=test bun run scripts/reset-db.ts"
}
```

## Database Performance Optimization

### 1. Indexing Strategy

```sql
-- Essential indexes (already included in schema)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_jti ON sessions(jti);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);

-- Performance indexes for common queries
CREATE INDEX idx_users_role_status ON users(role, account_status);
CREATE INDEX idx_sessions_active ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
```

### 2. Query Optimization

```typescript
// Use Drizzle's query builder for optimized queries
import { eq, and, gt } from 'drizzle-orm';

// Efficient user lookup with role
const activeUsers = await db
  .select()
  .from(users)
  .where(and(
    eq(users.accountStatus, 'active'),
    eq(users.emailVerified, true)
  ));

// Efficient session cleanup
const expiredSessions = await db
  .delete(sessions)
  .where(gt(sessions.expiresAt, new Date()));
```

### 3. Connection Pooling

```typescript
// src/lib/database/connection.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

// Configure connection pool
const client = postgres(connectionString, {
  max: 20,          // Maximum connections
  idle_timeout: 20, // Idle timeout in seconds
  connect_timeout: 10, // Connection timeout
});

export const db = drizzle(client);
```

## Security Considerations

### 1. Database Security

```sql
-- Create read-only user for monitoring
CREATE USER kavach_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE kavach_auth TO kavach_readonly;
GRANT USAGE ON SCHEMA public TO kavach_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kavach_readonly;

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

### 2. Connection Security

```env
# Use SSL in production
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Connection limits
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=20000
```

### 3. Data Protection

```sql
-- Enable row-level security (if needed)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for data access
CREATE POLICY user_own_data ON users
  FOR ALL TO kavach_user
  USING (id = current_setting('app.current_user_id')::uuid);
```

## Troubleshooting Database Issues

### Common Issues and Solutions

#### 1. Connection Refused

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# For Docker setup
docker ps | grep postgres
docker logs kavach_postgres

# Restart database
bun run docker:down && bun run docker:up
```

#### 2. Authentication Failed

```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Reset password
sudo -u postgres psql -c "ALTER USER kavach_user PASSWORD 'new_password';"
```

#### 3. Migration Errors

```bash
# Check migration status
bun run db:studio
# Look at drizzle.__drizzle_migrations table

# Reset migrations (development only)
DROP TABLE IF EXISTS drizzle.__drizzle_migrations;
bun run db:migrate
```

#### 4. Performance Issues

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';
```

### 5. Data Corruption

```bash
# Check database integrity
psql -U kavach_user -d kavach_auth -c "SELECT pg_database_size('kavach_auth');"

# Repair if needed
psql -U kavach_user -d kavach_auth -c "REINDEX DATABASE kavach_auth;"
```

## Database Testing

### 1. Test Database Setup

```typescript
// src/test/database-setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '@/lib/database/connection';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

beforeAll(async () => {
  // Run migrations
  await migrate(db, { migrationsFolder: './src/lib/database/migrations' });
});

beforeEach(async () => {
  // Clean database between tests
  await db.delete(sessions);
  await db.delete(emailVerifications);
  await db.delete(users);
});

afterAll(async () => {
  // Close database connection
  await db.$client.end();
});
```

### 2. Database Testing Utilities

```typescript
// src/test/database-helpers.ts
import { db } from '@/lib/database/connection';
import { users, sessions } from '@/lib/database/schema';

export async function createTestUser(overrides = {}) {
  const userData = {
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    role: 'customer' as const,
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  };

  const [user] = await db.insert(users).values(userData).returning();
  return user;
}

export async function createTestSession(userId: string) {
  const sessionData = {
    userId,
    tokenType: 'access' as const,
    jti: 'test-jti',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  };

  const [session] = await db.insert(sessions).values(sessionData).returning();
  return session;
}

export async function cleanDatabase() {
  await db.delete(sessions);
  await db.delete(users);
}
```

## Next Steps

After setting up your database:

1. **[Dependencies Management](./dependencies.md)** - Managing project dependencies
2. **[Troubleshooting](./troubleshooting.md)** - Common development issues
3. **[API Development](../../api/README.md)** - Building API endpoints
4. **[Testing Guide](../coding-standards/testing.md)** - Database testing strategies

Your database is now ready for Kavach development! 🗄️