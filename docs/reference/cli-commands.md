# CLI Commands Reference

This document provides a comprehensive reference for all command-line interface commands available in the Kavach authentication and user management system.

## NPM Scripts

### Development Commands

#### `npm run dev`
**Alias**: `bun run dev`
**Description**: Start the development server with Turbopack
**Usage**: 
```bash
npm run dev
# or
bun run dev
```
**Options**:
- Uses Next.js development server
- Enables Turbopack for faster builds
- Hot reload enabled
- Runs on port 3000 by default

#### `npm run build`
**Alias**: `bun run build`
**Description**: Build the application for production
**Usage**:
```bash
npm run build
```
**Output**: Creates optimized production build in `.next` directory

#### `npm run start`
**Alias**: `bun run start`
**Description**: Start the production server
**Usage**:
```bash
npm run start
```
**Prerequisites**: Must run `npm run build` first

#### `npm run lint`
**Alias**: `bun run lint`
**Description**: Run ESLint to check code quality
**Usage**:
```bash
npm run lint
```
**Options**:
- Checks TypeScript and JavaScript files
- Uses Next.js ESLint configuration
- Reports code quality issues

### Testing Commands

#### `npm run test`
**Alias**: `bun run test`
**Description**: Run all tests once
**Usage**:
```bash
npm run test
```
**Features**:
- Runs unit and integration tests
- Uses Vitest test runner
- Generates test report

#### `npm run test:watch`
**Alias**: `bun run test:watch`
**Description**: Run tests in watch mode
**Usage**:
```bash
npm run test:watch
```
**Features**:
- Automatically reruns tests on file changes
- Interactive test runner
- Real-time feedback

#### `npm run test:coverage`
**Alias**: `bun run test:coverage`
**Description**: Run tests with coverage report
**Usage**:
```bash
npm run test:coverage
```
**Output**: Generates coverage report in `coverage/` directory

#### `npm run test:ui`
**Alias**: `bun run test:ui`
**Description**: Run tests with UI interface
**Usage**:
```bash
npm run test:ui
```
**Features**:
- Web-based test interface
- Visual test results
- Interactive debugging

### Database Commands

#### `npm run db:generate`
**Alias**: `bun run db:generate`
**Description**: Generate database migrations from schema changes
**Usage**:
```bash
npm run db:generate
```
**Output**: Creates migration files in `src/lib/database/migrations/`

#### `npm run db:migrate`
**Alias**: `bun run db:migrate`
**Description**: Run pending database migrations
**Usage**:
```bash
npm run db:migrate
```
**Prerequisites**: Database must be running and accessible

#### `npm run db:studio`
**Alias**: `bun run db:studio`
**Description**: Open Drizzle Studio for database management
**Usage**:
```bash
npm run db:studio
```
**Features**:
- Web-based database browser
- Visual query builder
- Data editing interface

#### `npm run db:push`
**Alias**: `bun run db:push`
**Description**: Push schema changes directly to database (development only)
**Usage**:
```bash
npm run db:push
```
**Warning**: Use only in development - bypasses migration system

#### `npm run db:init`
**Alias**: `bun run db:init`
**Description**: Initialize database with schema and basic setup
**Usage**:
```bash
npm run db:init
```
**Actions**:
- Starts PostgreSQL container
- Waits for database readiness
- Runs migrations
- Verifies setup

#### `npm run db:seed`
**Alias**: `bun run db:seed`
**Description**: Seed database with initial data
**Usage**:
```bash
npm run db:seed [command]
```
**Commands**:
- `seed`: Add initial data
- `clean`: Remove all data
- `reset`: Clean and reseed

#### `npm run db:maintenance`
**Alias**: `bun run db:maintenance`
**Description**: Perform database maintenance tasks
**Usage**:
```bash
npm run db:maintenance [command]
```
**Commands**:
- `cleanup`: Clean expired sessions and tokens
- `health`: Perform health check
- `stats`: Generate user statistics
- `orphans`: Clean orphaned records
- `full`: Complete maintenance routine

### Docker Commands

#### `npm run docker:up`
**Alias**: `bun run docker:up`
**Description**: Start Docker containers
**Usage**:
```bash
npm run docker:up
```
**Services**: Starts PostgreSQL database container

#### `npm run docker:down`
**Alias**: `bun run docker:down`
**Description**: Stop Docker containers
**Usage**:
```bash
npm run docker:down
```
**Actions**: Stops and removes containers

### Utility Commands

#### `npm run create-admin`
**Alias**: `bun run create-admin`
**Description**: Create admin user account
**Usage**:
```bash
npm run create-admin [options]
```
**Options**:
- `--email <email>`: Admin email address
- `--first-name <name>`: Admin first name
- `--last-name <name>`: Admin last name
- `--password <password>`: Admin password
- `--force`: Overwrite existing admin
- `--help`: Show help message

**Examples**:
```bash
# Interactive mode
bun run create-admin

# With parameters
bun run create-admin --email admin@company.com --force

# With custom password
bun run create-admin --email admin@company.com --password MySecurePass123!
```

#### `npm run test:email`
**Alias**: `bun run test:email`
**Description**: Test email service functionality
**Usage**:
```bash
npm run test:email
```
**Tests**:
- SMTP connection
- Magic link verification emails
- Welcome emails for different user roles

## Direct Script Commands

### Database Initialization

#### `bun run scripts/init-db.ts`
**Description**: Initialize database with complete setup
**Usage**:
```bash
bun run scripts/init-db.ts
```
**Actions**:
1. Start PostgreSQL container
2. Wait for database readiness
3. Run migrations
4. Verify table creation

### Database Seeding

#### `bun run scripts/seed-db.ts`
**Description**: Manage database seeding
**Usage**:
```bash
bun run scripts/seed-db.ts [command]
```
**Commands**:
- `seed`: Seed database with initial data
- `clean`: Remove all data from database
- `reset`: Clean and then seed database

**Examples**:
```bash
# Seed with initial data
bun run scripts/seed-db.ts seed

# Clean all data
bun run scripts/seed-db.ts clean

# Reset database
bun run scripts/seed-db.ts reset
```

### Database Maintenance

#### `bun run scripts/db-maintenance.ts`
**Description**: Perform database maintenance operations
**Usage**:
```bash
bun run scripts/db-maintenance.ts [command]
```
**Commands**:
- `cleanup`: Clean up expired sessions and verification tokens
- `health`: Perform database health check
- `stats`: Generate user statistics report
- `orphans`: Clean up orphaned records
- `full`: Perform full maintenance routine

**Examples**:
```bash
# Clean expired data
bun run scripts/db-maintenance.ts cleanup

# Health check
bun run scripts/db-maintenance.ts health

# Full maintenance
bun run scripts/db-maintenance.ts full
```

### Admin User Creation

#### `bun run scripts/create-admin.ts`
**Description**: Create or update admin user accounts
**Usage**:
```bash
bun run scripts/create-admin.ts [options]
```
**Options**:
- `--email <email>`: Admin email address
- `--first-name <name>`: Admin first name
- `--last-name <name>`: Admin last name
- `--password <password>`: Admin password (generates if not provided)
- `--force`: Overwrite existing admin user
- `--help`, `-h`: Show help message

**Examples**:
```bash
# Interactive mode
bun run scripts/create-admin.ts

# Create with specific email
bun run scripts/create-admin.ts --email admin@company.com

# Force overwrite existing admin
bun run scripts/create-admin.ts --email admin@company.com --force

# Create with custom password
bun run scripts/create-admin.ts --email admin@company.com --password MySecurePass123!
```

### Email Testing

#### `bun run scripts/test-email.ts`
**Description**: Test email service configuration and functionality
**Usage**:
```bash
bun run scripts/test-email.ts
```
**Tests Performed**:
1. SMTP connection test
2. Magic link verification email
3. Welcome email for customer role
4. Welcome email for expert role

## Docker Commands

### Container Management

#### `docker compose up -d`
**Description**: Start all services in detached mode
**Usage**:
```bash
docker compose up -d
```
**Services**: PostgreSQL database

#### `docker compose down`
**Description**: Stop and remove containers
**Usage**:
```bash
docker compose down
```

#### `docker compose ps`
**Description**: Show running containers
**Usage**:
```bash
docker compose ps
```

#### `docker compose logs`
**Description**: View container logs
**Usage**:
```bash
docker compose logs [service]
```
**Examples**:
```bash
# All services
docker compose logs

# PostgreSQL only
docker compose logs postgres
```

### Database Container Commands

#### `docker exec -it kavach_postgres psql`
**Description**: Connect to PostgreSQL database
**Usage**:
```bash
docker exec -it kavach_postgres psql -U kavach_user -d kavach_auth
```

#### Database Queries
**Description**: Execute SQL queries directly
**Examples**:
```bash
# List all tables
docker exec kavach_postgres psql -U kavach_user -d kavach_auth -c "\dt"

# Count users
docker exec kavach_postgres psql -U kavach_user -d kavach_auth -c "SELECT COUNT(*) FROM users;"

# Show user roles
docker exec kavach_postgres psql -U kavach_user -d kavach_auth -c "SELECT role, COUNT(*) FROM users GROUP BY role;"
```

## Drizzle Kit Commands

### Migration Management

#### `drizzle-kit generate`
**Description**: Generate migration files from schema changes
**Usage**:
```bash
npx drizzle-kit generate
```

#### `drizzle-kit migrate`
**Description**: Run database migrations
**Usage**:
```bash
npx drizzle-kit migrate
```

#### `drizzle-kit studio`
**Description**: Open Drizzle Studio
**Usage**:
```bash
npx drizzle-kit studio
```

#### `drizzle-kit push`
**Description**: Push schema changes directly (development only)
**Usage**:
```bash
npx drizzle-kit push
```

## Environment-Specific Commands

### Development

```bash
# Start development environment
npm run dev

# Run tests in watch mode
npm run test:watch

# Initialize database
npm run db:init

# Seed with test data
npm run db:seed
```

### Production

```bash
# Build application
npm run build

# Start production server
npm run start

# Run migrations
npm run db:migrate

# Perform maintenance
npm run db:maintenance full
```

### Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Test email service
npm run test:email
```

## Command Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check if database is running
   docker compose ps
   
   # Restart database
   docker compose restart postgres
   
   # Check logs
   docker compose logs postgres
   ```

2. **Migration Failures**
   ```bash
   # Check database status
   npm run db:maintenance health
   
   # Reset database (development only)
   npm run db:seed reset
   ```

3. **Permission Errors**
   ```bash
   # Fix file permissions
   chmod +x scripts/*.ts
   
   # Use bun instead of npm
   bun run [command]
   ```

## Related Documentation

- [Environment Variables Reference](./environment-variables.md)
- [Configuration Reference](./configuration.md)
- [Development Setup](../development/setup/README.md)
- [Database Documentation](../backend/database/README.md)

---

*CLI commands reference last updated: January 2025*