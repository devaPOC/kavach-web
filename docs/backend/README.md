# Backend Documentation

## Overview

The Kavach backend is built using Next.js API routes with a layered architecture that emphasizes separation of concerns, type safety, and maintainability. The backend provides a comprehensive authentication and user management system with role-based access control, profile management, and administrative capabilities.

## Architecture

The backend follows a clean architecture pattern with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Routes Layer                         │
│  (Next.js API routes - HTTP request/response handling)     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Controllers Layer                         │
│     (Business logic orchestration and validation)          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                           │
│  (Core business logic, authentication, user management)    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                           │
│        (Data access abstraction and queries)               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
│     (PostgreSQL with Drizzle ORM and migrations)           │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Services Layer

The services layer contains the core business logic and is organized into specialized services:

- **[Authentication Service](./services/authentication.md)** - Handles user authentication, registration, and session management
- **[User Management Service](./services/user-management.md)** - Manages user profiles and account operations
- **[Profile Management Service](./services/profile-management.md)** - Handles customer and expert profile creation and management
- **[Admin Service](./services/admin.md)** - Administrative operations and user management

### Database Layer

The database layer uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **[Database Schema](./database/schema.md)** - Complete database schema documentation
- **[Migrations](./database/migrations.md)** - Database migration guide and best practices
- **[Repositories](./database/repositories.md)** - Data access layer patterns and implementation

### Middleware Layer

Middleware components handle cross-cutting concerns:

- **[Authentication Middleware](./middleware/authentication.md)** - JWT validation and session management
- **[Rate Limiting Middleware](./middleware/rate-limiting.md)** - API rate limiting and abuse prevention
- **[Validation Middleware](./middleware/validation.md)** - Input validation and sanitization
- **[Error Handling Middleware](./middleware/error-handling.md)** - Centralized error handling and logging

## Key Features

### Authentication & Authorization

- **JWT-based Authentication** - Secure token-based authentication with refresh tokens
- **Role-based Access Control** - Support for customer, expert, and admin roles
- **Email Verification** - Magic link email verification system
- **Session Management** - Unified session management with automatic cleanup
- **Security Monitoring** - Anomaly detection and security event logging

### User Management

- **Multi-role Support** - Customers, experts, and administrators
- **Profile Management** - Comprehensive profile system for different user types
- **Account Status Management** - Ban/unban experts, pause/unpause customers
- **Admin Operations** - Full administrative control over users and system

### Data Management

- **Transaction Support** - ACID transactions for complex operations
- **Audit Logging** - Comprehensive audit trail for all operations
- **Data Validation** - Unified validation system with detailed error reporting
- **Error Handling** - Structured error handling with correlation IDs

## Technology Stack

### Core Technologies

- **Next.js 14** - Full-stack React framework with API routes
- **TypeScript** - Type-safe development with strict type checking
- **PostgreSQL** - Relational database for data persistence
- **Drizzle ORM** - Type-safe database toolkit and query builder

### Authentication & Security

- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing and verification
- **Rate Limiting** - Request rate limiting and abuse prevention
- **CORS** - Cross-origin resource sharing configuration

### Development & Operations

- **Vitest** - Unit and integration testing framework
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Docker** - Containerization for deployment

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Docker (optional, for containerized development)

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Initialize Database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Development Workflow

1. **Database Changes** - Create migrations for schema changes
2. **Service Development** - Implement business logic in services
3. **API Routes** - Create API endpoints using controllers
4. **Testing** - Write unit and integration tests
5. **Documentation** - Update relevant documentation

## API Structure

The API follows RESTful conventions with the following structure:

```
/api/v1/
├── auth/                    # Authentication endpoints
│   ├── signup              # User registration
│   ├── login/              # User login (with role-specific endpoints)
│   ├── logout              # User logout
│   ├── refresh             # Token refresh
│   ├── verify-email        # Email verification
│   └── resend-verification # Resend verification email
├── users/                  # User management
│   ├── profile             # User profile operations
│   └── change-password     # Password change
├── profile/                # Profile management
│   ├── customer            # Customer profile operations
│   └── expert              # Expert profile operations
├── admin/                  # Administrative operations
│   ├── login               # Admin login
│   └── users/              # User management
└── health                  # Health check endpoint
```

## Error Handling

The backend implements comprehensive error handling with:

- **Structured Error Types** - Custom error classes for different scenarios
- **Correlation IDs** - Request tracking across services
- **Audit Logging** - Security and operational event logging
- **Rate Limiting** - Protection against abuse and attacks
- **Validation Errors** - Detailed validation error reporting

## Security Features

### Authentication Security

- **Password Hashing** - bcrypt with configurable rounds
- **JWT Security** - Secure token generation and validation
- **Session Management** - Automatic session cleanup and invalidation
- **Rate Limiting** - Protection against brute force attacks

### Data Protection

- **Input Validation** - Comprehensive input sanitization
- **SQL Injection Prevention** - Parameterized queries via ORM
- **CORS Configuration** - Proper cross-origin request handling
- **Security Headers** - Security-focused HTTP headers

### Monitoring & Auditing

- **Audit Logging** - Complete audit trail of user actions
- **Security Monitoring** - Anomaly detection and alerting
- **Error Tracking** - Comprehensive error logging and reporting
- **Performance Monitoring** - Request timing and performance metrics

## Testing

The backend includes comprehensive testing:

- **Unit Tests** - Service and utility function testing
- **Integration Tests** - API endpoint and database testing
- **Security Tests** - Authentication and authorization testing
- **Performance Tests** - Load and stress testing capabilities

## Deployment

The backend supports multiple deployment options:

- **Docker Containers** - Containerized deployment with Docker Compose
- **Cloud Platforms** - AWS, Google Cloud, Azure deployment guides
- **Serverless** - Vercel and Netlify deployment options
- **Traditional Hosting** - VPS and dedicated server deployment

## Monitoring & Operations

### Health Monitoring

- **Health Check Endpoints** - System health and dependency status
- **Database Health** - Connection and query performance monitoring
- **Service Health** - Individual service status monitoring

### Logging & Metrics

- **Structured Logging** - JSON-formatted logs with correlation IDs
- **Performance Metrics** - Request timing and throughput metrics
- **Error Metrics** - Error rates and types tracking
- **Business Metrics** - User registration, authentication success rates

## Contributing

When contributing to the backend:

1. **Follow Architecture** - Maintain the layered architecture pattern
2. **Write Tests** - Include unit and integration tests
3. **Document Changes** - Update relevant documentation
4. **Security Review** - Consider security implications of changes
5. **Performance Impact** - Assess performance impact of changes

## Related Documentation

- [API Documentation](../api/README.md) - Complete API reference
- [Security Documentation](../security/README.md) - Security implementation details
- [Deployment Documentation](../deployment/README.md) - Deployment guides
- [Development Setup](../development/setup/README.md) - Development environment setup