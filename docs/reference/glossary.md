# Glossary

This glossary provides definitions of technical terms, acronyms, and concepts used throughout the Kavach authentication and user management system and its documentation.

## A

### Access Token
A short-lived JWT token used to authenticate API requests. Typically expires within 15 minutes and must be refreshed using a refresh token.

### Admin
A user role with full system access, including user management, system configuration, and administrative functions.

### API (Application Programming Interface)
A set of protocols and tools for building software applications. In Kavach, refers to the REST API endpoints for authentication and user management.

### App Router
Next.js 13+ routing system that uses the `app` directory structure for defining routes and layouts.

### Audit Logging
The practice of recording user actions and system events for security monitoring, compliance, and troubleshooting purposes.

### Authentication
The process of verifying a user's identity, typically through email/password credentials or other verification methods.

### Authorization
The process of determining what actions an authenticated user is permitted to perform based on their role and permissions.

## B

### Bcrypt
A password hashing function designed to be slow and computationally expensive to resist brute-force attacks. Used for storing user passwords securely.

### Bearer Token
An authentication method where the client includes an access token in the Authorization header of HTTP requests.

## C

### CASCADE DELETE
A database constraint that automatically deletes related records when a parent record is deleted. Used to maintain referential integrity.

### CLI (Command Line Interface)
Text-based interface for interacting with the system through commands. Kavach provides various CLI commands for database management and administration.

### CORS (Cross-Origin Resource Sharing)
A security feature that allows or restricts web pages to access resources from other domains. Configured to control API access.

### CSP (Content Security Policy)
A security standard that helps prevent cross-site scripting (XSS) attacks by controlling which resources can be loaded by a web page.

### Customer
A user role representing end users who consume services provided by experts through the platform.

## D

### Database Migration
A script that modifies the database schema, such as creating tables, adding columns, or changing data types. Managed through Drizzle Kit.

### Drizzle ORM
A TypeScript ORM (Object-Relational Mapping) library used for database operations, providing type-safe database queries and schema management.

### Docker
A containerization platform used to package and deploy applications. Kavach uses Docker for PostgreSQL database deployment.

### Docker Compose
A tool for defining and running multi-container Docker applications using YAML configuration files.

## E

### Email Verification
The process of confirming a user's email address ownership through verification tokens or magic links sent to their email.

### Environment Variables
Configuration values stored outside the application code, used for sensitive information like database credentials and API keys.

### ESLint
A static code analysis tool for identifying and fixing problems in JavaScript/TypeScript code.

### Expert
A user role representing service providers who offer their expertise to customers through the platform.

## F

### Feature Flag
A configuration option that enables or disables specific functionality without code changes. Used for gradual feature rollouts and A/B testing.

### Foreign Key
A database constraint that establishes a link between data in two tables, ensuring referential integrity.

## G

### Governorate
An administrative division in Oman, used in user profiles for geographic location information.

## H

### Hash
A one-way cryptographic function that converts input data into a fixed-size string. Used for password storage and token generation.

### Health Check
An endpoint or process that verifies system components are functioning correctly, used for monitoring and load balancing.

### Hot Reload
A development feature that automatically updates the application when code changes are detected, without losing application state.

### HTTPS (HTTP Secure)
The secure version of HTTP that encrypts data transmission between client and server using TLS/SSL.

## I

### Index
A database structure that improves query performance by creating a sorted reference to table data.

### JWT (JSON Web Token)
A compact, URL-safe token format used for securely transmitting information between parties. Used for authentication tokens in Kavach.

### JTI (JWT ID)
A unique identifier for JWT tokens, used for token revocation and correlation in session management.

## L

### Load Balancer
A system that distributes incoming network traffic across multiple servers to ensure high availability and performance.

### Log Level
A classification system for log messages (error, warn, info, debug, trace) that controls the verbosity of application logging.

## M

### Magic Link
An authentication method where users receive a special URL via email that automatically logs them in when clicked, eliminating the need for password entry.

### Middleware
Software that sits between different components of an application, often used for authentication, logging, and request processing.

### Migration
See Database Migration.

## N

### Next.js
A React framework that provides features like server-side rendering, static site generation, and API routes. The foundation of the Kavach frontend.

### Node.js
A JavaScript runtime environment that allows running JavaScript on the server side.

### NPM (Node Package Manager)
A package manager for JavaScript that handles project dependencies and provides a registry of reusable code packages.

## O

### ORM (Object-Relational Mapping)
A programming technique that converts data between incompatible type systems in object-oriented programming languages and relational databases.

### OAuth
An authorization framework that enables applications to obtain limited access to user accounts on third-party services.

## P

### PostgreSQL
An open-source relational database management system used as the primary database for Kavach.

### Primary Key
A database constraint that uniquely identifies each record in a table.

### Profile Completion
The status indicating whether a user has filled out all required profile information beyond basic registration details.

## Q

### Query Builder
A tool or library that provides a programmatic interface for constructing database queries, often with type safety and validation.

## R

### Rate Limiting
A technique for controlling the number of requests a client can make to an API within a specified time period, used to prevent abuse.

### RBAC (Role-Based Access Control)
An access control method that assigns permissions to users based on their roles within an organization.

### Refresh Token
A long-lived token used to obtain new access tokens without requiring the user to re-authenticate.

### Repository Pattern
A design pattern that encapsulates data access logic and provides a uniform interface for accessing data from different sources.

### REST (Representational State Transfer)
An architectural style for designing web services that uses HTTP methods and status codes for communication.

## S

### Salt
Random data added to passwords before hashing to prevent rainbow table attacks and ensure unique hashes for identical passwords.

### Schema
The structure of a database, including tables, columns, relationships, and constraints.

### Session
A temporary interaction between a user and the application, typically maintained through cookies or tokens.

### SMTP (Simple Mail Transfer Protocol)
A protocol used for sending email messages between servers. Used by Kavach for sending verification and notification emails.

### SSL/TLS (Secure Sockets Layer/Transport Layer Security)
Cryptographic protocols that provide secure communication over a network, commonly used for HTTPS connections.

## T

### Tailwind CSS
A utility-first CSS framework used for styling the Kavach user interface.

### Token
A piece of data that represents authentication credentials or authorization permissions, typically in the form of a string.

### TypeScript
A programming language that extends JavaScript by adding static type definitions, providing better tooling and error detection.

## U

### UUID (Universally Unique Identifier)
A 128-bit identifier that is unique across space and time, used as primary keys in Kavach database tables.

### Unique Constraint
A database constraint that ensures all values in a column or combination of columns are unique across all rows.

## V

### Validation
The process of checking that data meets specified criteria before processing or storage.

### Verification Token
A unique string sent to users (typically via email) to verify their identity or email address ownership.

### Vitest
A testing framework for JavaScript/TypeScript applications, used for unit and integration testing in Kavach.

## W

### Webhook
An HTTP callback that allows one application to send real-time data to another application when specific events occur.

### Wilayat
A subdivision of a governorate in Oman, used in user profiles for more specific geographic location information.

## Z

### Zod
A TypeScript-first schema validation library used for runtime type checking and data validation in Kavach.

### Zustand
A lightweight state management library for React applications, used for client-side state management in Kavach.

## Acronyms Reference

| Acronym | Full Form | Context |
|---------|-----------|---------|
| API | Application Programming Interface | Web services |
| CORS | Cross-Origin Resource Sharing | Web security |
| CSP | Content Security Policy | Web security |
| CLI | Command Line Interface | System administration |
| JWT | JSON Web Token | Authentication |
| JTI | JWT ID | Token management |
| ORM | Object-Relational Mapping | Database access |
| RBAC | Role-Based Access Control | Authorization |
| REST | Representational State Transfer | API architecture |
| SMTP | Simple Mail Transfer Protocol | Email delivery |
| SSL | Secure Sockets Layer | Network security |
| TLS | Transport Layer Security | Network security |
| UUID | Universally Unique Identifier | Database keys |

## Common File Extensions

| Extension | Description | Usage in Kavach |
|-----------|-------------|----------------|
| `.ts` | TypeScript source file | Application code |
| `.tsx` | TypeScript React component | React components |
| `.js` | JavaScript source file | Configuration files |
| `.jsx` | JavaScript React component | Legacy components |
| `.md` | Markdown documentation | Documentation |
| `.sql` | SQL database script | Database migrations |
| `.json` | JSON data file | Configuration, package definitions |
| `.env` | Environment variables file | Configuration |
| `.yml`/`.yaml` | YAML configuration file | Docker Compose, CI/CD |

## Status and State Values

### User Status Values
- **Active**: User account is active and functional
- **Pending**: User account awaiting approval (experts)
- **Approved**: User account has been approved
- **Banned**: User account has been banned (experts)
- **Paused**: User account has been temporarily paused (customers)
- **Verified**: User email has been verified
- **Unverified**: User email has not been verified

### Profile Status Values
- **Incomplete**: Profile information is not complete
- **Complete**: All required profile information has been provided
- **Under Review**: Profile is being reviewed for approval

### Token Status Values
- **Active**: Token is valid and not expired
- **Expired**: Token has passed its expiration time
- **Used**: Token has been consumed (verification tokens)
- **Revoked**: Token has been manually invalidated

## Business Logic Terms

### Account Lifecycle
The progression of a user account from registration through verification, profile completion, approval (for experts), and ongoing usage.

### Profile Completion Flow
The process by which users provide additional information beyond basic registration details to complete their profiles.

### Approval Workflow
The administrative process for reviewing and approving expert accounts before they can provide services.

### Session Management
The system for tracking user authentication state, including login, logout, and token refresh operations.

### Email Verification Flow
The process of confirming user email addresses through verification tokens or magic links.

## Related Documentation

- [API Documentation](../api/README.md) - For API-specific terminology
- [Architecture Documentation](../architecture/README.md) - For system design concepts
- [Development Documentation](../development/README.md) - For development-specific terms
- [Security Documentation](../security/README.md) - For security-related terminology

---

*Glossary last updated: January 2025*

*For terms not found in this glossary, please refer to the specific documentation sections or contact the development team.*