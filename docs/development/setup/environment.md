# Development Environment Setup

This comprehensive guide will help you set up a complete development environment for Kavach. This goes beyond the basic installation to provide a professional development setup with all the tools and configurations needed for productive development.

## Overview

A complete Kavach development environment includes:

- **Runtime Environment**: Bun/Node.js with proper version management
- **Database**: PostgreSQL with development tools
- **Code Editor**: VS Code with recommended extensions
- **Development Tools**: Linting, formatting, testing, and debugging tools
- **Git Configuration**: Proper Git setup with hooks and workflows
- **Environment Management**: Multiple environment configurations

## Prerequisites

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+ recommended)
- **RAM**: 8GB minimum, 16GB recommended for optimal performance
- **Storage**: 10GB free space for development environment
- **Network**: Stable internet connection for package downloads

### Required Software

#### 1. Version Control
```bash
# Install Git
# macOS (using Homebrew)
brew install git

# Ubuntu/Debian
sudo apt update && sudo apt install git

# Windows
# Download from https://git-scm.com/download/win

# Verify installation
git --version
```

#### 2. Runtime Environment

**Option A: Bun (Recommended)**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Add to PATH (if not automatically added)
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
bun --version
```

**Option B: Node.js with Version Manager**
```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 18+
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version
npm --version
```

#### 3. Database

**PostgreSQL Installation:**
```bash
# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/

# Verify installation
psql --version
```

**Docker (Alternative for Database)**
```bash
# macOS
brew install --cask docker

# Ubuntu
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Windows
# Download Docker Desktop from https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

## Code Editor Setup

### VS Code Installation and Configuration

#### 1. Install VS Code
```bash
# macOS (using Homebrew)
brew install --cask visual-studio-code

# Ubuntu
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update && sudo apt install code

# Windows
# Download from https://code.visualstudio.com/
```

#### 2. Essential Extensions

Install these extensions for optimal Kavach development:

```bash
# Install via command line
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-vscode.vscode-json
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-jest
code --install-extension ms-vscode-remote.remote-containers
code --install-extension ms-vscode.vscode-docker
```

**Extension Details:**

| Extension | Purpose | Configuration |
|-----------|---------|---------------|
| TypeScript | TypeScript support | Auto-configured |
| Tailwind CSS | CSS IntelliSense | Auto-detects config |
| Prettier | Code formatting | See settings below |
| ESLint | Code linting | Uses project config |
| Auto Rename Tag | HTML/JSX tag sync | Auto-enabled |
| Path Intellisense | File path completion | Auto-enabled |
| Jest | Test runner integration | Auto-detects tests |
| Docker | Container support | For database |

#### 3. VS Code Settings

Create `.vscode/settings.json` in your project:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.exclude": {
    "**/.next": true,
    "**/node_modules": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/tsconfig.tsbuildinfo": true
  },
  "search.exclude": {
    "**/.next": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/*.log": true
  }
}
```

#### 4. VS Code Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "shell",
      "command": "bun",
      "args": ["run", "dev"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      },
      "problemMatcher": []
    },
    {
      "label": "test",
      "type": "shell",
      "command": "bun",
      "args": ["run", "test"],
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "lint",
      "type": "shell",
      "command": "bun",
      "args": ["run", "lint"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "db:studio",
      "type": "shell",
      "command": "bun",
      "args": ["run", "db:studio"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
```

#### 5. Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "bun run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "bun run dev",
      "serverReadyAction": {
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

## Git Configuration

### 1. Global Git Setup

```bash
# Configure user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Configure line endings
git config --global core.autocrlf input  # macOS/Linux
git config --global core.autocrlf true   # Windows

# Enable helpful features
git config --global pull.rebase false
git config --global push.default simple
git config --global branch.autosetupmerge always
git config --global branch.autosetuprebase always
```

### 2. Git Hooks Setup

Create pre-commit hooks for code quality:

```bash
# Create hooks directory
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Pre-commit hook for Kavach

echo "Running pre-commit checks..."

# Run linting
echo "Checking code style..."
bun run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix the issues before committing."
  exit 1
fi

# Run tests
echo "Running tests..."
bun run test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Please fix the failing tests before committing."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
EOF

# Make hook executable
chmod +x .git/hooks/pre-commit
```

### 3. Git Ignore Configuration

Ensure your `.gitignore` includes development files:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Next.js
.next/
out/

# Production
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Database
*.db
*.sqlite

# IDE
.vscode/settings.json
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# TypeScript
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Temporary folders
tmp/
temp/
```

## Environment Configuration

### 1. Multiple Environment Setup

Create environment files for different stages:

```bash
# Development environment
cp .env.example .env.development

# Test environment
cp .env.example .env.test

# Local environment (personal overrides)
cp .env.example .env.local
```

### 2. Environment File Management

**`.env.development`** (Development-specific settings):
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Development database
DATABASE_URL=postgresql://kavach_user:dev_password@localhost:5432/kavach_auth_dev

# Development secrets (weaker for convenience)
JWT_SECRET=dev-jwt-secret-not-for-production
SESSION_SECRET=dev-session-secret-not-for-production

# Development email (use Ethereal or MailHog)
EMAIL_USER=dev@example.com
EMAIL_PASSWORD=dev_password
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false

# Development admin
ADMIN_EMAIL=admin@dev.local
ADMIN_PASSWORD=admin123

# Development flags
LOG_LEVEL=debug
DISABLE_RATE_LIMITING=true
```

**`.env.test`** (Testing environment):
```env
NODE_ENV=test
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Test database
DATABASE_URL=postgresql://kavach_user:test_password@localhost:5432/kavach_auth_test

# Test secrets
JWT_SECRET=test-jwt-secret
SESSION_SECRET=test-session-secret

# Disable external services in tests
EMAIL_USER=test@example.com
EMAIL_PASSWORD=test_password
SMTP_HOST=localhost
SMTP_PORT=1025

# Test admin
ADMIN_EMAIL=admin@test.local
ADMIN_PASSWORD=test123

# Test flags
LOG_LEVEL=error
DISABLE_EMAIL=true
DISABLE_RATE_LIMITING=true
```

### 3. Environment Validation

Create a script to validate environment setup:

```bash
# Create validation script
cat > scripts/validate-env.ts << 'EOF'
#!/usr/bin/env bun

import { z } from 'zod';
import { config } from 'dotenv';

// Load environment
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  EMAIL_USER: z.string().email(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
});

try {
  const env = envSchema.parse(process.env);
  console.log('✅ Environment validation passed');
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Database: ${env.DATABASE_URL.split('@')[1]}`);
  console.log(`SMTP: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach(err => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}
EOF

# Make executable
chmod +x scripts/validate-env.ts

# Add to package.json scripts
# "validate-env": "bun run scripts/validate-env.ts"
```

## Development Tools Setup

### 1. Package Manager Configuration

**Bun Configuration** (`.bunfig.toml`):
```toml
[install]
# Equivalent to npm's package-lock.json
lockfile = true

# Install peer dependencies automatically
auto = true

# Use exact versions
exact = false

[install.cache]
# Cache directory
dir = "~/.bun/install/cache"

# Disable cache for development
disable = false
```

### 2. TypeScript Configuration

Enhance `tsconfig.json` for development:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/lib/utils/*"]
    },
    "types": ["bun-types", "node"],
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist",
    "build"
  ]
}
```

### 3. ESLint Configuration

Enhance `.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    "prefer-const": "off",
    "no-console": "warn",
    "no-debugger": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.test.tsx"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

### 4. Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

## Database Development Setup

### 1. Development Database

```bash
# Create development database
createdb kavach_auth_dev

# Create test database
createdb kavach_auth_test

# Or using Docker
docker run --name kavach-dev-db \
  -e POSTGRES_DB=kavach_auth_dev \
  -e POSTGRES_USER=kavach_user \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### 2. Database Tools

```bash
# Install database CLI tools
npm install -g @databases/pg-cli

# Or use GUI tools
# - pgAdmin: https://www.pgadmin.org/
# - DBeaver: https://dbeaver.io/
# - TablePlus: https://tableplus.com/
```

### 3. Migration Workflow

```bash
# Generate migration after schema changes
bun run db:generate

# Review generated migration
ls src/lib/database/migrations/

# Apply migration
bun run db:migrate

# Rollback if needed (manual process)
# Edit migration files and re-run
```

## Testing Environment

### 1. Test Database Setup

```bash
# Create test database
createdb kavach_auth_test

# Set test environment
export NODE_ENV=test

# Run migrations for test database
DATABASE_URL=postgresql://kavach_user:test_password@localhost:5432/kavach_auth_test bun run db:migrate
```

### 2. Test Configuration

Enhance `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/migrations/',
      ],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

## Performance Monitoring

### 1. Development Monitoring

```bash
# Install development monitoring tools
bun add -D clinic autocannon

# Add monitoring scripts to package.json
# "perf:doctor": "clinic doctor -- node server.js"
# "perf:flame": "clinic flame -- node server.js"
# "perf:bubbleprof": "clinic bubbleprof -- node server.js"
```

### 2. Bundle Analysis

```bash
# Analyze bundle size
ANALYZE=true bun run build

# Or use webpack-bundle-analyzer
bun add -D @next/bundle-analyzer
```

## Development Workflow

### 1. Daily Development Routine

```bash
# Start development session
git pull origin main
bun install  # Update dependencies if needed
bun run docker:up  # Start database
bun run db:migrate  # Apply any new migrations
bun run dev  # Start development server

# Development cycle
# 1. Make changes
# 2. Run tests: bun run test:watch
# 3. Check linting: bun run lint
# 4. Commit changes: git commit -m "feat: description"

# End development session
bun run docker:down  # Stop database
git push origin feature-branch
```

### 2. Code Quality Checks

```bash
# Full quality check
bun run lint
bun run test
bun run build

# Fix common issues
bun run lint --fix
```

### 3. Database Development

```bash
# Common database tasks
bun run db:studio  # Open database GUI
bun run db:generate  # Generate migrations
bun run db:migrate  # Apply migrations
bun run db:seed  # Seed development data
bun run db:maintenance  # Run maintenance tasks
```

## Troubleshooting Development Environment

### Common Issues and Solutions

#### 1. Port Conflicts
```bash
# Find process using port
lsof -i :3000
kill -9 <PID>

# Use different port
PORT=3001 bun run dev
```

#### 2. Database Connection Issues
```bash
# Check database status
pg_isready -h localhost -p 5432

# Restart database
bun run docker:down && bun run docker:up

# Check connection string
echo $DATABASE_URL
```

#### 3. TypeScript Issues
```bash
# Clear TypeScript cache
rm -rf .next
rm tsconfig.tsbuildinfo

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### 4. Package Issues
```bash
# Clear package cache
bun pm cache rm
rm -rf node_modules
bun install

# Check for conflicting versions
bun outdated
```

## Next Steps

After setting up your development environment:

1. **[Database Setup](./database.md)** - Detailed database configuration
2. **[Dependencies Management](./dependencies.md)** - Managing project dependencies
3. **[Troubleshooting](./troubleshooting.md)** - Common development issues
4. **[Coding Standards](../coding-standards/README.md)** - Code style and conventions
5. **[Testing Guide](../coding-standards/testing.md)** - Testing best practices

Your development environment is now ready for productive Kavach development! 🚀