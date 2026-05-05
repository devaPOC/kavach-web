# Kavach

A full-stack TypeScript application built with Next.js 15, featuring comprehensive authentication, user management, and role-based access control.

## 🏗️ Project Overview

### Currency Update Notice

All previous references to USD ($) and Dollar icons across the UI have been migrated to use OMR (Omani Rial). Pricing components, dashboard statistics, expert earnings, and quote management now consistently display OMR. If you reintroduce multi-currency support later, ensure to:

1. Restore selectable currency options in quote creation/revision modals.
2. Reintroduce icon components or use a currency abstraction (e.g. a `CurrencyBadge` component).
3. Update `expert.service.ts` earnings response `currency` field accordingly.

Current formatting utilities live in `src/lib/utils/currency.ts`.

**Kavach** is a modern web application that provides a complete authentication and user management system. It features multi-role support (customers, experts, admins), email verification, session management, rate limiting, and a robust security infrastructure.

### ✨ Key Features

- 🔐 **Multi-Role Authentication** - Customer, Expert, and Admin roles
- 📧 **Email Verification** - Magic link support
- 🛡️ **Security-First** - Rate limiting, CSRF protection, anomaly detection
- 📊 **Health Monitoring** - System health checks and metrics
- 🗄️ **Database Management** - PostgreSQL with Drizzle ORM
- ✅ **Comprehensive Testing** - Unit and integration tests
- 🚀 **Production Ready** - Docker support, monitoring, and logging

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand

### Backend

- **Runtime**: Bun/Node.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: JWT + Sessions
- **Email**: Nodemailer (SMTP)

### DevOps & Tools

- **Testing**: Vitest
- **Linting**: ESLint
- **Database Tools**: Drizzle Kit
- **Containerization**: Docker & Docker Compose
- **Logging**: Pino

---

## 📁 Project Structure

```bash
kavach/
├── 📂 src/
│   ├── 📂 app/                    # Next.js App Router
│   │   ├── 📂 (backend)/          # API Routes
│   │   │   └── 📂 api/v1/         # Versioned API endpoints
│   │   │       ├── 📂 auth/       # Authentication endpoints
│   │   │       ├── 📂 admin/      # Admin-only endpoints
│   │   │       ├── 📂 users/      # User management endpoints
│   │   │       └── 📂 health/     # Health check endpoint
│   │   ├── 📂 (frontend)/         # Frontend pages
│   │   │   ├── 📂 login/          # Login page
│   │   │   ├── 📂 signup/         # Registration page
│   │   │   ├── 📂 dashboard/      # User dashboard
│   │   │   ├── 📂 admin/          # Admin dashboard
│   │   │   └── 📂 verify-email/   # Email verification
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Home page
│   │
│   ├── 📂 components/             # Reusable UI Components
│   │   ├── 📂 ui/                 # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── PasswordInput.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   └── 📂 auth/               # Authentication components
│   │       ├── LoginForm.tsx
│   │       ├── SignupWizard.tsx
│   │       └── TabNavigation.tsx
│   │
│   ├── 📂 lib/                    # Core Business Logic
│   │   ├── 📂 auth/               # Authentication system
│   │   │   ├── jwt-utils.ts       # JWT token management
│   │   │   ├── session-manager.ts # Session handling
│   │   │   ├── password-utils.ts  # Password hashing/validation
│   │   │   ├── rate-limiter.ts    # Rate limiting logic
│   │   │   ├── middleware-utils.ts # Auth middleware
│   │   │   ├── api-middleware.ts  # API protection middleware
│   │   │   ├── anomaly-detector.ts # Security anomaly detection
│   │   │   └── revocation-store.ts # Token revocation
│   │   │
│   │   ├── 📂 database/           # Database layer
│   │   │   ├── 📂 schema/         # Database schemas
│   │   │   │   ├── users.ts       # User table schema
│   │   │   │   ├── sessions.ts    # Session table schema
│   │   │   │   └── email-verifications.ts
│   │   │   ├── 📂 repositories/   # Data access layer
│   │   │   │   ├── user-repository.ts
│   │   │   │   ├── session-repository.ts
│   │   │   │   └── email-verification-repository.ts
│   │   │   ├── 📂 utils/          # Database utilities
│   │   │   ├── connection.ts      # Database connection
│   │   │   └── migrate.ts         # Migration runner
│   │   │
│   │   ├── 📂 services/           # Business logic services
│   │   │   ├── 📂 auth/           # Authentication services
│   │   │   ├── 📂 user/           # User management services
│   │   │   ├── 📂 admin/          # Admin services
│   │   │   └── base.service.ts    # Base service class
│   │   │
│   │   ├── 📂 controllers/        # API controllers
│   │   │   ├── 📂 auth/           # Auth endpoints
│   │   │   ├── 📂 user/           # User endpoints
│   │   │   └── 📂 admin/          # Admin endpoints
│   │   │
│   │   ├── 📂 email/              # Email system
│   │   │   ├── email-service.ts   # Email service
│   │   │   ├── smtp-config.ts     # SMTP configuration
│   │   │   ├── magic-link-utils.ts # Magic link generation
│   │   │   └── 📂 templates/      # Email templates
│   │   │
│   │   ├── 📂 api/                # API client
│   │   │   └── client.ts          # Frontend API client
│   │   │
│   │   └── 📂 utils/              # Shared utilities
│   │       ├── env.ts             # Environment validation
│   │       ├── validation.ts      # Form validation schemas
│   │       ├── logger.ts          # Logging utilities
│   │       ├── metrics.ts         # Performance metrics
│   │       └── audit-logger.ts    # Security audit logging
│   │
│   ├── 📂 infrastructure/         # Infrastructure layer
│   │   ├── 📂 database/           # Database infrastructure
│   │   ├── 📂 logging/            # Logging infrastructure
│   │   └── 📂 health/             # Health monitoring
│   │
│   ├── 📂 types/                  # TypeScript type definitions
│   │   ├── auth.ts                # Authentication types
│   │   └── user.ts                # User types
│   │
│   ├── 📂 test/                   # Test configuration
│   │   └── setup.ts               # Test environment setup
│   │
│   └── middleware.ts              # Next.js middleware (auth, rate limiting)
│
├── 📂 scripts/                    # Utility scripts
│   ├── init-db.ts                 # Database initialization
│   ├── seed-db.ts                 # Database seeding
│   ├── create-admin.ts            # Admin user creation
│   ├── db-maintenance.ts          # Database maintenance
│   └── test-email.ts              # Email testing
│
├── 📂 types/                      # Global type definitions
├── 📂 public/                     # Static assets
├── docker-compose.yml             # Docker configuration
├── drizzle.config.ts              # Drizzle ORM configuration
├── package.json                   # Dependencies and scripts
└── README.md                      # This file
```

---

## 🔧 Core Architecture

### 1. **Authentication System**

The authentication system is built around JWT tokens with session management:

- **JWT Tokens**: Stateless authentication with access/refresh token pattern
- **Session Management**: Database-backed sessions for security
- **Role-Based Access**: Customer, Expert, Admin roles with granular permissions
- **Email Verification**: Magic link verification support
- **Password Security**: bcrypt hashing with strength validation

#### Key Files

- `src/lib/auth/jwt-utils.ts` - Token generation and verification
- `src/lib/auth/session-manager.ts` - Session CRUD operations
- `src/lib/auth/password-utils.ts` - Password hashing and validation
- `src/middleware.ts` - Route protection and auth middleware

### 2. **Database Layer**

Built with Drizzle ORM and PostgreSQL:

- **Schema Definition**: Type-safe database schemas
- **Repository Pattern**: Data access abstraction
- **Migrations**: Version-controlled database changes
- **Connection Management**: Pooled database connections

#### Key Tables

- **users** - User profiles and authentication data
- **sessions** - Active user sessions
- **email_verifications** - Email verification tokens

### 3. **API Architecture**

RESTful API with Next.js App Router:

- **Versioned Endpoints**: `/api/v1/` namespace
- **Controller Pattern**: Business logic separation
- **Middleware Chain**: Authentication, rate limiting, validation
- **Error Handling**: Standardized error responses

#### API Endpoints

```bash
/api/v1/auth/
├── POST /login           # User authentication
├── POST /signup          # User registration
├── POST /logout          # Session termination
├── POST /refresh         # Token refresh
├── POST /verify-email    # Email verification
└── POST /resend-verification

/api/v1/users/
├── GET  /profile         # Get user profile
├── PUT  /profile         # Update profile
└── POST /change-password # Change password

/api/v1/admin/
├── POST /login           # Admin authentication
├── GET  /users           # List all users
├── POST /users           # Create user
├── PUT  /users/:id       # Update user
└── DELETE /users/:id     # Delete user

/api/v1/health            # System health check
```

### 4. **Security Features**

Comprehensive security implementation:

- **Rate Limiting**: IP-based request throttling
- **CSRF Protection**: Cross-site request forgery prevention
- **Anomaly Detection**: Login failure monitoring
- **Token Revocation**: Blacklisted token management
- **Audit Logging**: Security event tracking

### 5. **Frontend Architecture**

React-based frontend with TypeScript:

- **Component Library**: Reusable UI components
- **Form Validation**: Zod schema validation
- **State Management**: Zustand for global state
- **API Integration**: Type-safe API client

---

## 🚀 Getting Started

### Prerequisites

- **Bun** or Node.js 18+
- **PostgreSQL** 14+

### 1. Clone and Install

```bash
git clone <repository-url>
cd kavach
bun install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Start PostgreSQL (using Docker)
bun run docker:up

# Initialize database
bun run db:init

# Run migrations
bun run db:migrate

# Seed with sample data
bun run db:seed
```

### 4. Development

```bash
# Start development server
bun run dev

# Run tests
bun run test

# Database management
bun run db:studio
```

---

## 📜 Available Scripts

### Development

- `bun run dev` - Start development server with Turbopack
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

### Testing

- `bun run test` - Run all tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Generate coverage report
- `bun run test:ui` - Open Vitest UI

### Database

- `bun run db:generate` - Generate migrations
- `bun run db:migrate` - Run migrations
- `bun run db:push` - Push schema changes
- `bun run db:studio` - Open Drizzle Studio
- `bun run db:init` - Initialize database
- `bun run db:seed` - Seed with sample data
- `bun run db:maintenance` - Run maintenance tasks

### Utilities

- `bun run create-admin` - Create admin user
- `bun run test:email` - Test email configuration
- `bun run docker:up` - Start Docker services
- `bun run docker:down` - Stop Docker services

---

## 🔐 Environment Variables

### Required Variables

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kavach

# Authentication
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key

# Email (SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="Kavach App <noreply@kavach.com>"
```

### Optional Variables

```env
# Admin Configuration
ADMIN_EMAIL=admin@kavach.com
ADMIN_PASSWORD=admin-secure-password

# Development
USE_INMEM_DB=false
DISABLE_ENV_VALIDATION=false
```

---

## 🧪 Testing

The project includes comprehensive testing with Vitest:

### Test Structure

```bash
src/
├── lib/auth/__tests__/          # Authentication tests
├── lib/database/repositories/__tests__/  # Repository tests
├── lib/email/__tests__/         # Email service tests
├── lib/utils/__tests__/         # Utility tests
└── test/setup.ts                # Test configuration
```

### Running Tests

```bash
# Run all tests
bun run test

# Watch mode for development
bun run test:watch

# Coverage report
bun run test:coverage

# Visual test UI
bun run test:ui
```

---

## 🐳 Docker Deployment

### Development with Docker

```bash
# Start PostgreSQL
bun run docker:up

# Stop services
bun run docker:down
```

### Docker Compose Services

- **PostgreSQL**: Database server
- **Adminer**: Database admin interface

---

## 📊 Monitoring & Health

### Health Checks

The application includes comprehensive health monitoring:

- **Database Health**: Connection and query performance
- **Memory Usage**: Heap and system memory monitoring
- **External Services**: Email connectivity

Access health status: `GET /api/v1/health`

### Logging

Structured logging with Pino:

- **Request Logging**: All HTTP requests
- **Error Logging**: Application errors and exceptions
- **Audit Logging**: Security events and user actions
- **Performance Metrics**: Response times and system metrics

---

## 🛡️ Security Features

### Authentication Security

- JWT token expiration and refresh
- Password strength requirements
- Session management with expiration
- Token revocation/blacklisting

### Rate Limiting

- IP-based request limiting
- Endpoint-specific limits
- Memory-based rate limiting
- Automatic lockout for abuse

### Data Protection

- Input validation with Zod schemas
- SQL injection prevention (Drizzle ORM)
- XSS protection
- CSRF token validation

### Monitoring

- Failed login attempt tracking
- Anomaly detection for brute force
- Audit trail for sensitive operations
- Real-time security alerts

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow project linting rules
- **Testing**: Unit tests for all new features
- **Documentation**: Update README for significant changes

---

## 📖 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[📚 Complete Documentation](./docs/README.md)** - Main documentation hub
- **[🚀 Development Setup](./docs/development/setup-guide.md)** - Complete development environment setup
- **[📋 API Reference](./docs/api/error-responses.md)** - API endpoints and error response formats
- **[🔒 Security Guide](./docs/security/security-guide.md)** - Security best practices and implementation
- **[🚀 Deployment Guide](./docs/deployment/session-management-deployment.md)** - Production deployment instructions
- **[🔧 Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions

### Quick Links

- **Getting Started**: [Development Setup Guide](./docs/development/setup-guide.md)
- **API Documentation**: [Error Response Formats](./docs/api/error-responses.md)
- **Security**: [Security Best Practices](./docs/security/security-guide.md)
- **Deployment**: [Production Deployment](./docs/deployment/session-management-deployment.md)
- **Help**: [Troubleshooting Guide](./docs/troubleshooting.md)

## 🚨 Watch out for

- Files approaching 600+ lines
- Mixed responsibilities in one file
- Deep nesting levels
- Repetitive code patterns

## Some commands that might be useful

### Database operations

- bun run db:generate    # Generate migrations
- bun run db:migrate     # Run migrations
- bun run db:studio      # Open Drizzle Studio

### Development

- bun run dev           # Start development server
- bun run test          # Run tests
- bun run test:watch    # Watch mode for tests

### Create admin user for testing

- bun run create-admin
