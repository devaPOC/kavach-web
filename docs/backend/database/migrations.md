# Database Migrations Guide

## Overview

Database migrations in the Kavach application are managed using Drizzle ORM's migration system. Migrations provide a version-controlled way to evolve the database schema over time while maintaining data integrity and enabling rollback capabilities.

## Migration Architecture

The migration system follows these principles:

- **Version Control** - All schema changes are tracked in version-controlled migration files
- **Sequential Execution** - Migrations are applied in chronological order
- **Idempotent Operations** - Migrations can be safely re-run without side effects
- **Rollback Support** - Migrations can be reversed when necessary
- **Environment Consistency** - Same schema across development, staging, and production

## Migration Structure

```
src/lib/database/migrations/
├── 0000_bumpy_bulldozer.sql          # Initial schema
├── 0001_add_token_type_to_sessions.sql # Session token types
├── 0002_add_jti_to_sessions.sql      # JWT correlation
├── 0003_add_ban_pause_fields.sql     # User status management
└── meta/
    ├── 0000_snapshot.json            # Schema snapshots
    ├── 0001_snapshot.json
    ├── 0002_snapshot.json
    ├── 0003_snapshot.json
    └── _journal.json                 # Migration journal
```

## Migration Files

### File Naming Convention

Migration files follow the pattern: `{sequence}_{descriptive_name}.sql`

- **Sequence Number** - 4-digit zero-padded sequence (0000, 0001, etc.)
- **Descriptive Name** - Snake_case description of the changes
- **Extension** - Always `.sql` for SQL migration files

### File Structure

Each migration file contains:

1. **Comments** - Description of the migration purpose
2. **SQL Statements** - DDL statements for schema changes
3. **Statement Separators** - `--> statement-breakpoint` comments
4. **Conditional Logic** - `IF NOT EXISTS` clauses where appropriate

## Migration History

### Migration 0000: Initial Schema (bumpy_bulldozer)

**Purpose:** Create the foundational database schema

**Changes:**
- Created `users` table with basic authentication fields
- Created `sessions` table for session management
- Created `email_verifications` table for email verification
- Established foreign key relationships with cascade delete

```sql
-- Create users table
CREATE TABLE "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "first_name" varchar(100) NOT NULL,
    "last_name" varchar(100) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "role" varchar(20) NOT NULL,
    "is_email_verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE("email")
);

-- Create sessions table
CREATE TABLE "sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "token" varchar(255) NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "sessions_token_unique" UNIQUE("token")
);

-- Create email_verifications table
CREATE TABLE "email_verifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "token" varchar(255) NOT NULL,
    "type" varchar(20) NOT NULL,
    "expires_at" timestamp NOT NULL,
    "is_used" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "email_verifications_token_unique" UNIQUE("token")
);

-- Add foreign key constraints
ALTER TABLE "email_verifications" 
ADD CONSTRAINT "email_verifications_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
ON DELETE cascade ON UPDATE no action;

ALTER TABLE "sessions" 
ADD CONSTRAINT "sessions_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
ON DELETE cascade ON UPDATE no action;
```

### Migration 0001: Session Token Types

**Purpose:** Add token type differentiation to sessions

**Changes:**
- Added `token_type` column to sessions table
- Set default value to 'access' for existing records
- Enables differentiation between access and refresh tokens

```sql
ALTER TABLE "sessions" 
ADD COLUMN IF NOT EXISTS "token_type" varchar(20) NOT NULL DEFAULT 'access';

UPDATE "sessions" 
SET "token_type" = 'access' 
WHERE "token_type" IS NULL;
```

**Impact:**
- Existing sessions are marked as 'access' tokens
- New sessions can be created with specific token types
- Enables proper JWT token management

### Migration 0002: JWT Correlation Support

**Purpose:** Add JWT ID (jti) support for token correlation and revocation

**Changes:**
- Added `jti` column to sessions table for JWT correlation
- Added index on `jti` for efficient revocation lookups
- Enables durable token revocation and correlation

```sql
-- Add jti column for JWT correlation
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS jti uuid;

-- Add index for efficient jti lookups
CREATE INDEX IF NOT EXISTS sessions_jti_idx ON sessions (jti);
```

**Impact:**
- Enables correlation between JWT tokens and database sessions
- Supports efficient token revocation by JTI
- Improves security through token tracking

### Migration 0003: User Status Management

**Purpose:** Add ban and pause functionality for user account management

**Changes:**
- Added `is_banned` field for expert account banning
- Added `is_paused` field for customer account pausing
- Added timestamp fields for tracking when actions occurred
- Enables administrative control over user accounts

```sql
-- Add ban and pause functionality to users table
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN is_paused BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN banned_at TIMESTAMP;
ALTER TABLE users ADD COLUMN paused_at TIMESTAMP;
```

**Impact:**
- Admins can ban expert accounts
- Admins can pause customer accounts
- Audit trail for administrative actions
- Enhanced user account lifecycle management

## Migration Commands

### Generate New Migration

```bash
# Generate migration from schema changes
npm run db:generate

# Generate migration with custom name
npm run db:generate -- --name add_profile_tables
```

### Apply Migrations

```bash
# Apply all pending migrations
npm run db:migrate

# Apply migrations to specific environment
NODE_ENV=production npm run db:migrate

# Apply migrations with verbose output
npm run db:migrate -- --verbose
```

### Check Migration Status

```bash
# Check current migration status
npm run db:status

# View migration history
npm run db:history
```

### Rollback Migrations

```bash
# Rollback last migration
npm run db:rollback

# Rollback to specific migration
npm run db:rollback -- --to 0002

# Rollback with confirmation
npm run db:rollback -- --confirm
```

## Migration Best Practices

### Schema Design Principles

1. **Additive Changes** - Prefer adding new columns over modifying existing ones
2. **Default Values** - Always provide default values for new NOT NULL columns
3. **Backward Compatibility** - Ensure changes don't break existing application code
4. **Data Preservation** - Never delete data without explicit backup procedures

### Migration Safety

1. **Test Thoroughly** - Test migrations on development and staging environments
2. **Backup First** - Always backup production database before applying migrations
3. **Monitor Performance** - Watch for performance impact during migration
4. **Rollback Plan** - Have a rollback plan ready for each migration

### Code Organization

1. **Single Responsibility** - Each migration should have a single, clear purpose
2. **Descriptive Names** - Use clear, descriptive names for migration files
3. **Documentation** - Include comments explaining the purpose and impact
4. **Version Control** - Commit migration files with related application code

## Advanced Migration Patterns

### Adding Columns with Data Population

```sql
-- Add new column with default value
ALTER TABLE users 
ADD COLUMN full_name varchar(200);

-- Populate column with existing data
UPDATE users 
SET full_name = CONCAT(first_name, ' ', last_name);

-- Make column NOT NULL after population
ALTER TABLE users 
ALTER COLUMN full_name SET NOT NULL;
```

### Renaming Columns Safely

```sql
-- Step 1: Add new column
ALTER TABLE users 
ADD COLUMN new_column_name varchar(100);

-- Step 2: Copy data
UPDATE users 
SET new_column_name = old_column_name;

-- Step 3: Make new column NOT NULL
ALTER TABLE users 
ALTER COLUMN new_column_name SET NOT NULL;

-- Step 4: Drop old column (in separate migration)
-- ALTER TABLE users DROP COLUMN old_column_name;
```

### Creating Indexes Concurrently

```sql
-- Create index without blocking writes (PostgreSQL)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
ON users(is_email_verified);
```

### Data Migration with Validation

```sql
-- Add new column
ALTER TABLE users 
ADD COLUMN status varchar(20) DEFAULT 'active';

-- Migrate data with validation
UPDATE users 
SET status = CASE 
    WHEN is_banned = true THEN 'banned'
    WHEN is_paused = true THEN 'paused'
    ELSE 'active'
END;

-- Add constraint after data migration
ALTER TABLE users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'banned', 'paused', 'suspended'));
```

## Environment-Specific Considerations

### Development Environment

- Migrations can be more aggressive (dropping/recreating tables)
- Test data can be reset during migrations
- Performance is less critical

```bash
# Reset development database
npm run db:reset
npm run db:migrate
npm run db:seed
```

### Staging Environment

- Should mirror production migration process
- Full testing of migration procedures
- Performance impact assessment

```bash
# Staging migration with backup
npm run db:backup
npm run db:migrate
npm run db:verify
```

### Production Environment

- Requires careful planning and coordination
- Backup and rollback procedures mandatory
- Minimal downtime strategies

```bash
# Production migration checklist
npm run db:backup
npm run db:migrate:dry-run
npm run db:migrate
npm run db:verify
npm run db:monitor
```

## Troubleshooting Migrations

### Common Issues

1. **Migration Conflicts**
   ```bash
   # Resolve conflicts by regenerating
   npm run db:generate -- --resolve-conflicts
   ```

2. **Failed Migrations**
   ```bash
   # Check migration status
   npm run db:status
   
   # Rollback and retry
   npm run db:rollback
   npm run db:migrate
   ```

3. **Schema Drift**
   ```bash
   # Detect schema differences
   npm run db:introspect
   npm run db:generate -- --introspect
   ```

### Recovery Procedures

1. **Partial Migration Failure**
   - Check database state
   - Manually complete or rollback
   - Update migration journal

2. **Data Corruption**
   - Restore from backup
   - Replay migrations from known good state
   - Validate data integrity

3. **Performance Issues**
   - Monitor query performance during migration
   - Consider breaking large migrations into smaller chunks
   - Use concurrent index creation where possible

## Migration Testing

### Automated Testing

```typescript
// Migration test example
describe('Database Migrations', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('should apply all migrations successfully', async () => {
    await runMigrations();
    const schema = await introspectSchema();
    expect(schema).toMatchSnapshot();
  });

  it('should preserve data during migration', async () => {
    await seedTestData();
    await runMigrations();
    const data = await queryTestData();
    expect(data).toBeDefined();
  });
});
```

### Manual Testing Checklist

- [ ] Migration applies without errors
- [ ] Schema matches expected structure
- [ ] Existing data is preserved
- [ ] Application functions correctly
- [ ] Performance is acceptable
- [ ] Rollback works correctly

## Monitoring and Observability

### Migration Metrics

1. **Execution Time** - Track how long migrations take
2. **Success Rate** - Monitor migration success/failure rates
3. **Impact Assessment** - Measure performance impact
4. **Rollback Frequency** - Track rollback occurrences

### Logging and Alerts

```typescript
// Migration logging example
logger.info('Starting migration', {
  migration: '0004_add_profile_tables',
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

// Alert on migration failure
if (migrationFailed) {
  alerting.critical('Migration failed', {
    migration: migrationName,
    error: error.message,
    environment: process.env.NODE_ENV
  });
}
```

## Future Migration Planning

### Upcoming Migrations

1. **Profile Tables** - Add expert_profiles and customer_profiles tables
2. **Audit Logging** - Add comprehensive audit trail tables
3. **Performance Optimization** - Add additional indexes and constraints
4. **Data Archiving** - Add archiving tables for historical data

### Long-term Strategy

1. **Schema Evolution** - Plan for future feature requirements
2. **Performance Scaling** - Consider partitioning and sharding strategies
3. **Data Retention** - Implement data lifecycle management
4. **Compliance** - Ensure schema supports regulatory requirements

## Security Considerations

### Migration Security

1. **Access Control** - Limit who can run migrations in production
2. **Audit Trail** - Log all migration activities
3. **Sensitive Data** - Handle sensitive data carefully during migrations
4. **Backup Security** - Secure backup files and access

### Best Practices

1. **Principle of Least Privilege** - Migration users should have minimal required permissions
2. **Encryption** - Ensure backups and data transfers are encrypted
3. **Validation** - Validate data integrity after migrations
4. **Monitoring** - Monitor for suspicious migration activities