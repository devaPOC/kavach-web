# Getting Started with Kavach

Welcome to Kavach, a comprehensive Next.js authentication and user management system. This section will guide you through everything you need to get up and running quickly.

## What is Kavach?

Kavach is a full-stack TypeScript application built with Next.js 15 that provides:

- 🔐 **Multi-Role Authentication** - Customer, Expert, and Admin roles
- 📧 **Email Verification** - Magic link support with SMTP integration
- 🛡️ **Security-First Design** - Rate limiting, CSRF protection, anomaly detection
- 📊 **Health Monitoring** - System health checks and performance metrics
- 🗄️ **Database Management** - PostgreSQL with Drizzle ORM
- ✅ **Comprehensive Testing** - Unit and integration tests with Vitest
- 🚀 **Production Ready** - Docker support, monitoring, and logging

## Quick Navigation

Choose your path based on your needs:

### 🚀 [Installation Guide](./installation.md)
Complete step-by-step installation instructions for all operating systems.

### ⚡ [5-Minute Quick Start](./quick-start.md)
Get Kavach running locally in under 5 minutes with minimal setup.

### 👨‍💻 [First Steps](./first-steps.md)
What to do after installation - creating users, exploring features, and next steps.

## Prerequisites

Before you begin, ensure you have:

- **Bun** (recommended) or **Node.js 18+**
- **PostgreSQL 14+** (or use our Docker setup)
- **Git** for cloning the repository
- A code editor (VS Code recommended)

## Architecture Overview

Kavach follows a modern full-stack architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (PostgreSQL)  │
│   - React 19    │    │   - JWT Auth    │    │   - Drizzle ORM │
│   - Tailwind    │    │   - Rate Limit  │    │   - Migrations  │
│   - Zustand     │    │   - Validation  │    │   - Health      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Key Features

### Authentication System
- JWT tokens with refresh token rotation
- Session management with database persistence
- Role-based access control (RBAC)
- Email verification with magic links
- Password strength validation and secure hashing

### Security Features
- IP-based rate limiting with configurable thresholds
- CSRF protection for all state-changing operations
- Anomaly detection for suspicious login patterns
- Token revocation and blacklisting
- Comprehensive audit logging

### User Management
- Multi-role support (Customer, Expert, Admin)
- Profile management with validation
- Account status management (active, paused, banned)
- Admin dashboard for user administration

### Developer Experience
- Type-safe API with TypeScript
- Comprehensive test suite with Vitest
- Database migrations with Drizzle Kit
- Docker development environment
- Structured logging with Pino

## Getting Help

If you encounter issues during setup:

1. Check the [Installation Guide](./installation.md) for detailed instructions
2. Review [Common Issues](../development/setup/troubleshooting.md) in our troubleshooting guide
3. Ensure all [prerequisites](#prerequisites) are met
4. Check the [FAQ](../user-guides/faq/README.md) for common questions

## Next Steps

1. **New to Kavach?** Start with the [5-Minute Quick Start](./quick-start.md)
2. **Setting up for development?** Follow the [Installation Guide](./installation.md)
3. **Ready to explore?** Check out [First Steps](./first-steps.md) after installation

Let's get started! 🚀