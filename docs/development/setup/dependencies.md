# Dependencies Management

This guide covers comprehensive dependency management for Kavach, including package installation, version management, security practices, and troubleshooting dependency issues.

## Overview

Kavach uses a modern JavaScript/TypeScript stack with carefully selected dependencies for:

- **Frontend**: React 19, Next.js 15, Tailwind CSS
- **Backend**: Node.js/Bun runtime with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with custom session management
- **Testing**: Vitest with comprehensive test utilities
- **Development**: ESLint, Prettier, and development tools

## Package Manager Setup

### Bun (Recommended)

Bun is the recommended package manager for Kavach due to its speed and compatibility.

#### Installation

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version

# Update Bun
bun upgrade
```

#### Configuration

Create or update `.bunfig.toml`:

```toml
[install]
# Lock file configuration
lockfile = true

# Install peer dependencies automatically
auto = true

# Use exact versions for better reproducibility
exact = false

# Registry configuration
registry = "https://registry.npmjs.org"

[install.cache]
# Cache directory
dir = "~/.bun/install/cache"

# Cache settings
disable = false
disableManifest = false

[install.scopes]
# Scoped package registries (if needed)
# "@myorg" = "https://npm.myorg.com"

[run]
# Shell to use for scripts
shell = "bash"

# Environment variables for scripts
env = { NODE_ENV = "development" }
```

#### Basic Commands

```bash
# Install all dependencies
bun install

# Add production dependency
bun add package-name

# Add development dependency
bun add -D package-name

# Remove dependency
bun remove package-name

# Update dependencies
bun update

# Run scripts
bun run dev
bun run test
```

### npm (Alternative)

If you prefer npm:

```bash
# Install dependencies
npm install

# Add dependencies
npm install package-name
npm install -D package-name

# Remove dependencies
npm uninstall package-name

# Update dependencies
npm update

# Audit security
npm audit
npm audit fix
```

### yarn (Alternative)

If you prefer Yarn:

```bash
# Install dependencies
yarn install

# Add dependencies
yarn add package-name
yarn add -D package-name

# Remove dependencies
yarn remove package-name

# Update dependencies
yarn upgrade

# Run scripts
yarn dev
yarn test
```

## Core Dependencies

### Production Dependencies

#### Frontend Framework
```json
{
  "next": "15.4.6",           // Next.js framework
  "react": "19.1.0",          // React library
  "react-dom": "19.1.0"       // React DOM renderer
}
```

#### UI and Styling
```json
{
  "tailwindcss": "^4",                    // Utility-first CSS framework
  "@tailwindcss/postcss": "^4",          // PostCSS integration
  "class-variance-authority": "^0.7.1",   // Component variants
  "clsx": "^2.1.1",                      // Conditional classes
  "tailwind-merge": "^3.3.1",            // Tailwind class merging
  "lucide-react": "^0.539.0"             // Icon library
}
```

#### Radix UI Components
```json
{
  "@radix-ui/react-checkbox": "^1.3.3",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-label": "^2.1.7",
  "@radix-ui/react-select": "^2.2.6",
  "@radix-ui/react-separator": "^1.1.7",
  "@radix-ui/react-slot": "^1.2.3",
  "@radix-ui/react-tabs": "^1.1.13"
}
```

#### Database and ORM
```json
{
  "drizzle-orm": "^0.44.4",    // Type-safe ORM
  "postgres": "^3.4.7"         // PostgreSQL client
}
```

#### Authentication and Security
```json
{
  "bcryptjs": "^3.0.2",        // Password hashing
  "jsonwebtoken": "^9.0.2",    // JWT tokens
  "jose": "^6.0.12",           // JWT utilities
  "uuid": "^11.1.0"            // UUID generation
}
```

#### Forms and Validation
```json
{
  "react-hook-form": "^7.62.0",      // Form management
  "@hookform/resolvers": "^5.2.1",   // Form validation resolvers
  "zod": "^4.0.17"                   // Schema validation
}
```

#### State Management
```json
{
  "zustand": "^5.0.7"          // Lightweight state management
}
```

#### Email and Communication
```json
{
  "nodemailer": "^7.0.5"       // Email sending
}
```

#### Utilities
```json
{
  "dotenv": "^17.2.1",         // Environment variables
  "pino": "^9.3.2"             // Logging
}
```

### Development Dependencies

#### TypeScript
```json
{
  "typescript": "^5",                    // TypeScript compiler
  "@types/node": "^20",                  // Node.js types
  "@types/react": "^19",                 // React types
  "@types/react-dom": "^19",             // React DOM types
  "@types/bcryptjs": "^3.0.0",           // bcryptjs types
  "@types/jsonwebtoken": "^9.0.10",      // JWT types
  "@types/nodemailer": "^6.4.17",        // Nodemailer types
  "@types/pg": "^8.15.5",                // PostgreSQL types
  "@types/uuid": "^10.0.0"               // UUID types
}
```

#### Testing
```json
{
  "vitest": "^3.2.4",                    // Test runner
  "@vitest/coverage-v8": "3.2.4",        // Coverage with V8
  "@vitest/coverage-istanbul": "3.2.4"   // Coverage with Istanbul
}
```

#### Database Tools
```json
{
  "drizzle-kit": "^0.31.4"      // Database migrations and studio
}
```

#### Code Quality
```json
{
  "eslint": "^9",                        // Linting
  "eslint-config-next": "15.4.6",        // Next.js ESLint config
  "@eslint/eslintrc": "^3"               // ESLint configuration
}
```

#### Build Tools
```json
{
  "tw-animate-css": "^1.3.6"    // Tailwind animations
}
```

## Dependency Management Best Practices

### 1. Version Management

#### Semantic Versioning
```json
{
  "dependencies": {
    "exact-version": "1.2.3",      // Exact version
    "patch-updates": "~1.2.3",     // Allow patch updates (1.2.x)
    "minor-updates": "^1.2.3",     // Allow minor updates (1.x.x)
    "latest": "*"                   // Latest (not recommended)
  }
}
```

#### Lock Files
```bash
# Bun creates bun.lockb
# npm creates package-lock.json
# yarn creates yarn.lock

# Always commit lock files to ensure reproducible builds
git add bun.lockb
git commit -m "Update dependencies"
```

### 2. Security Practices

#### Regular Security Audits
```bash
# Bun security audit
bun audit

# npm security audit
npm audit
npm audit fix

# Check for vulnerabilities
bun add -D audit-ci
bun run audit-ci --config audit-ci.json
```

#### Dependency Scanning
```bash
# Install security scanning tools
bun add -D snyk

# Scan for vulnerabilities
bunx snyk test
bunx snyk monitor
```

### 3. Dependency Updates

#### Regular Updates
```bash
# Check outdated packages
bun outdated
# or
npm outdated

# Update all dependencies
bun update
# or
npm update

# Update specific package
bun add package-name@latest
```

#### Automated Updates
```json
// .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "team-leads"
    assignees:
      - "maintainers"
```

### 4. Bundle Size Management

#### Analyze Bundle Size
```bash
# Analyze Next.js bundle
ANALYZE=true bun run build

# Install bundle analyzer
bun add -D @next/bundle-analyzer

# Configure in next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});
```

#### Tree Shaking
```typescript
// Import only what you need
import { useState } from 'react';           // Good
import React from 'react';                  // Avoid if possible

// Use specific imports
import { format } from 'date-fns';          // Good
import * as dateFns from 'date-fns';        // Avoid

// Dynamic imports for code splitting
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

## Environment-Specific Dependencies

### Development Dependencies

```bash
# Development-only packages
bun add -D \
  @types/node \
  @types/react \
  eslint \
  prettier \
  vitest \
  @vitest/coverage-v8 \
  drizzle-kit
```

### Production Dependencies

```bash
# Production packages
bun add \
  next \
  react \
  react-dom \
  drizzle-orm \
  postgres \
  bcryptjs \
  jsonwebtoken \
  zod
```

### Optional Dependencies

```json
{
  "optionalDependencies": {
    "sharp": "^0.32.0"    // Image optimization (optional for Next.js)
  }
}
```

## Package Scripts Management

### Core Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### Database Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun run src/lib/database/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push",
    "db:init": "bun run scripts/init-db.ts",
    "db:seed": "bun run scripts/seed-db.ts",
    "db:maintenance": "bun run scripts/db-maintenance.ts"
  }
}
```

### Utility Scripts

```json
{
  "scripts": {
    "create-admin": "bun run scripts/create-admin.ts",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "test:email": "bun run scripts/test-email.ts",
    "clean": "rm -rf .next node_modules/.cache",
    "reset": "rm -rf node_modules bun.lockb && bun install"
  }
}
```

### Custom Scripts

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "validate": "bun run type-check && bun run lint && bun run test",
    "prepare": "husky install",
    "precommit": "lint-staged"
  }
}
```

## Dependency Troubleshooting

### Common Issues

#### 1. Version Conflicts

```bash
# Check dependency tree
bun why package-name
# or
npm ls package-name

# Resolve conflicts
bun add package-name@specific-version

# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

#### 2. Peer Dependency Warnings

```bash
# Install missing peer dependencies
bun add -D @types/react @types/react-dom

# Check peer dependencies
bun add --dry-run package-name
```

#### 3. Module Resolution Issues

```typescript
// tsconfig.json - Configure module resolution
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

#### 4. Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Clear TypeScript cache
rm tsconfig.tsbuildinfo

# Reinstall dependencies
rm -rf node_modules
bun install

# Check for duplicate dependencies
bun ls --depth=0
```

### Performance Issues

#### 1. Slow Installation

```bash
# Use Bun for faster installs
bun install

# Clear package manager cache
bun pm cache rm
# or
npm cache clean --force

# Use offline mode if packages are cached
bun install --offline
```

#### 2. Large Bundle Size

```bash
# Analyze bundle
ANALYZE=true bun run build

# Check for duplicate packages
bunx duplicate-package-checker-webpack-plugin

# Use dynamic imports
const Component = lazy(() => import('./Component'));
```

## Advanced Dependency Management

### 1. Monorepo Setup (if needed)

```json
// package.json for monorepo
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build:all": "bun run --filter='*' build",
    "test:all": "bun run --filter='*' test"
  }
}
```

### 2. Custom Package Registry

```toml
# .bunfig.toml
[install.scopes]
"@mycompany" = "https://npm.mycompany.com"

[install]
registry = "https://registry.npmjs.org"
```

### 3. Dependency Overrides

```json
{
  "overrides": {
    "package-name": "1.2.3",
    "nested-package": {
      "dependency": "2.0.0"
    }
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/dependencies.yml
name: Dependencies

on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  update-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Update dependencies
        run: bun update
        
      - name: Run tests
        run: bun run test
        
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: update dependencies'
          body: 'Automated dependency updates'
```

### Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Security audit
        run: bun audit
        
      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## Documentation and Maintenance

### 1. Dependency Documentation

Create `docs/dependencies.md`:

```markdown
# Project Dependencies

## Core Dependencies
- **Next.js**: React framework for production
- **React**: UI library
- **Drizzle ORM**: Type-safe database ORM
- **Tailwind CSS**: Utility-first CSS framework

## Development Dependencies
- **TypeScript**: Type safety
- **Vitest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Update Schedule
- Security updates: Immediate
- Minor updates: Weekly
- Major updates: Monthly review
```

### 2. Maintenance Schedule

```json
{
  "scripts": {
    "deps:check": "bun outdated",
    "deps:update": "bun update",
    "deps:audit": "bun audit",
    "deps:clean": "rm -rf node_modules bun.lockb && bun install"
  }
}
```

## Next Steps

After setting up dependency management:

1. **[Troubleshooting](./troubleshooting.md)** - Common development issues
2. **[Coding Standards](../coding-standards/README.md)** - Code quality guidelines
3. **[Testing Guide](../coding-standards/testing.md)** - Testing best practices
4. **[Deployment](../../deployment/README.md)** - Production deployment

Your dependency management is now optimized for Kavach development! 📦