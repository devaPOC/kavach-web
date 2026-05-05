# Contributing to Kavach

Welcome to the Kavach project! We appreciate your interest in contributing to our authentication and user management system. This guide will help you get started with contributing effectively.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Types](#contribution-types)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Guidelines](#documentation-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** or **Bun runtime** installed
- **PostgreSQL 14+** for database development
- **Git** for version control
- **VS Code** (recommended) with suggested extensions

### First-Time Contributors

1. **Read the documentation** to understand the project structure
2. **Set up the development environment** following our setup guide
3. **Look for "good first issue" labels** in the issue tracker
4. **Join our community channels** for questions and discussions
5. **Review existing code** to understand our patterns and standards

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/kavach.git
cd kavach

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/kavach.git
```

### 2. Install Dependencies

```bash
# Install dependencies
bun install

# Copy environment configuration
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

# Seed development data
bun run db:seed
```

### 4. Start Development Server

```bash
# Start the development server
bun run dev

# In another terminal, run tests
bun run test:watch
```

### 5. Verify Setup

- Visit `http://localhost:3000` to see the application
- Run `bun run test` to ensure all tests pass
- Check `bun run lint` for code style compliance

## Contribution Types

### 1. Bug Fixes

- **Small fixes**: Typos, minor UI issues, simple logic errors
- **Medium fixes**: Component bugs, API issues, validation problems
- **Large fixes**: Complex logic errors, security issues, performance problems

### 2. New Features

- **UI components**: New React components and interfaces
- **API endpoints**: New backend functionality and routes
- **Services**: Business logic and data processing
- **Integrations**: External service connections

### 3. Improvements

- **Performance**: Optimization and efficiency improvements
- **Security**: Security enhancements and vulnerability fixes
- **Developer Experience**: Tooling and development workflow improvements
- **Code Quality**: Refactoring and technical debt reduction

### 4. Documentation

- **API documentation**: Endpoint documentation and examples
- **User guides**: End-user documentation and tutorials
- **Developer docs**: Technical documentation and guides
- **Code comments**: Inline documentation and explanations

## Development Workflow

### 1. Issue Creation

Before starting work, create or find an issue:

```markdown
## Issue Template

**Type**: Bug / Feature / Improvement / Documentation

**Description**
Clear description of the issue or feature request.

**Steps to Reproduce** (for bugs)
1. Go to...
2. Click on...
3. See error...

**Expected Behavior**
What should happen.

**Actual Behavior**
What actually happens.

**Acceptance Criteria**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Additional Context**
Screenshots, logs, or other relevant information.
```

### 2. Branch Creation

Create a feature branch from `develop`:

```bash
# Update develop branch
git checkout develop
git pull upstream develop

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description
```

### 3. Development Process

#### Make Changes
- Follow our [coding standards](../development/coding-standards/)
- Write tests for new functionality
- Update documentation as needed
- Commit changes with clear messages

#### Test Your Changes
```bash
# Run all tests
bun run test

# Run linting
bun run lint

# Check TypeScript
bunx tsc --noEmit

# Test build
bun run build
```

#### Commit Guidelines
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature commits
git commit -m "feat(auth): add two-factor authentication"

# Bug fix commits
git commit -m "fix(validation): resolve email regex issue"

# Documentation commits
git commit -m "docs(api): update authentication endpoints"
```

### 4. Pull Request Creation

#### Before Creating PR
- Ensure all tests pass
- Update documentation
- Rebase on latest develop
- Self-review your changes

#### PR Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Checklist
- [ ] Code follows the project's coding standards
- [ ] Self-review of code completed
- [ ] Code is properly commented
- [ ] Documentation updated if necessary
- [ ] No new warnings or errors introduced

## Related Issues
Closes #123

## Screenshots (if applicable)
Add screenshots for UI changes.
```

## Code Standards

### 1. TypeScript Standards

- Use strict TypeScript with no `any` types
- Provide comprehensive type definitions
- Follow naming conventions (camelCase, PascalCase, SCREAMING_SNAKE_CASE)
- Use utility types and generics appropriately

```typescript
// ✅ Good
interface UserService {
  createUser(data: CreateUserData): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
}

// ❌ Bad
interface UserService {
  createUser(data: any): Promise<any>;
  updateUser(id: any, updates: any): Promise<any>;
}
```

### 2. React Standards

- Use functional components with hooks
- Implement proper prop types with TypeScript
- Follow component structure patterns
- Use React.memo and useMemo for performance optimization

```tsx
// ✅ Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  onClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  variant, 
  disabled = false, 
  onClick, 
  children 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### 3. API Standards

- Use consistent error handling
- Implement proper validation
- Follow RESTful conventions
- Include comprehensive logging

```typescript
// ✅ Good
export async function POST(request: NextRequest) {
  try {
    const body = await validateRequest(request);
    const result = await userService.createUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Testing Requirements

### 1. Test Coverage

Maintain minimum test coverage:
- **Lines**: 80%
- **Statements**: 80%
- **Branches**: 70%
- **Functions**: 75%

### 2. Test Types

#### Unit Tests
```typescript
// Test individual functions and components
describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

#### Integration Tests
```typescript
// Test component interactions and API endpoints
describe('User API', () => {
  it('should create user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send(validUserData)
      .expect(201);

    expect(response.body.user.email).toBe(validUserData.email);
  });
});
```

#### Component Tests
```tsx
// Test React components
describe('LoginForm', () => {
  it('should submit form with valid data', async () => {
    const mockSubmit = vi.fn();
    render(<LoginForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});
```

### 3. Test Guidelines

- Write descriptive test names
- Use Arrange-Act-Assert pattern
- Mock external dependencies
- Test error conditions
- Keep tests isolated and deterministic

## Documentation Guidelines

### 1. Code Documentation

#### Function Documentation
```typescript
/**
 * Authenticates a user with email and password
 * 
 * @param credentials - User login credentials
 * @param context - Request context with correlation ID and client info
 * @returns Promise resolving to authentication result
 * @throws {ValidationError} When credentials are invalid
 * @throws {AuthenticationError} When authentication fails
 * 
 * @example
 * ```typescript
 * const result = await authService.login(
 *   { email: 'user@example.com', password: 'password123' },
 *   { correlationId: 'abc-123', clientIP: '127.0.0.1' }
 * );
 * ```
 */
async login(
  credentials: LoginCredentials,
  context: RequestContext
): Promise<ServiceResult<AuthResult>> {
  // Implementation
}
```

#### Component Documentation
```tsx
/**
 * Login form component with validation and error handling
 * 
 * @param props.onSubmit - Callback function called when form is submitted
 * @param props.loading - Whether the form is in loading state
 * @param props.error - Error message to display
 * @param props.role - User role for role-specific login
 * 
 * @example
 * ```tsx
 * <LoginForm
 *   role="customer"
 *   onSubmit={handleLogin}
 *   loading={isLoading}
 *   error={loginError}
 * />
 * ```
 */
interface LoginFormProps {
  role: 'customer' | 'expert';
  onSubmit: (data: LoginFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}
```

### 2. API Documentation

Document all API endpoints with:
- Request/response schemas
- Authentication requirements
- Error codes and messages
- Usage examples

### 3. README Updates

Update relevant README files when:
- Adding new features
- Changing setup procedures
- Modifying configuration
- Adding new dependencies

## Pull Request Process

### 1. Pre-Submission Checklist

- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Self-review completed
- [ ] Branch is up to date with develop
- [ ] Commit messages follow conventions

### 2. Review Process

#### Automated Checks
All PRs must pass:
- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests (Vitest)
- Build verification
- Security scanning

#### Manual Review
- Code quality and standards
- Test coverage and quality
- Documentation completeness
- Security considerations
- Performance impact

### 3. Addressing Feedback

- Respond to all review comments
- Make requested changes promptly
- Ask for clarification when needed
- Update tests and documentation
- Request re-review when ready

### 4. Merge Requirements

- At least one approval from team member
- All automated checks passing
- All review comments addressed
- Documentation updated
- No merge conflicts

## Community Guidelines

### 1. Code of Conduct

We are committed to providing a welcoming and inclusive environment:

- **Be respectful** and considerate in all interactions
- **Be collaborative** and help others learn and grow
- **Be constructive** when providing feedback or criticism
- **Be patient** with newcomers and those learning
- **Be professional** in all communications

### 2. Communication

#### Issue Discussions
- Stay on topic and relevant to the issue
- Provide clear, actionable feedback
- Use appropriate labels and milestones
- Reference related issues and PRs

#### Code Reviews
- Focus on the code, not the person
- Explain the reasoning behind suggestions
- Acknowledge good practices and solutions
- Be specific about required vs. optional changes

#### Community Channels
- Use appropriate channels for different topics
- Search existing discussions before asking questions
- Provide context when asking for help
- Share knowledge and help others

### 3. Recognition

We recognize contributions through:
- **Contributor acknowledgments** in release notes
- **GitHub contributor graphs** and statistics
- **Community highlights** for significant contributions
- **Mentorship opportunities** for active contributors

## Getting Help

### 1. Documentation Resources

- [Development Setup](../development/setup/) - Environment configuration
- [Coding Standards](../development/coding-standards/) - Code style guidelines
- [API Documentation](../api/) - Complete API reference
- [Architecture Guide](../architecture/) - System design overview

### 2. Community Support

#### GitHub Issues
- Search existing issues before creating new ones
- Use appropriate issue templates
- Provide detailed information and context
- Follow up on responses and feedback

#### Discussion Forums
- Ask questions in appropriate categories
- Share knowledge and help others
- Participate in design discussions
- Provide feedback on proposals

### 3. Direct Support

For urgent issues or security concerns:
- Contact maintainers directly
- Use security reporting channels
- Provide detailed information
- Follow responsible disclosure practices

## Contribution Recognition

### 1. Types of Recognition

- **Code Contributors**: Direct code contributions
- **Documentation Contributors**: Documentation improvements
- **Community Contributors**: Helping others and community building
- **Testing Contributors**: Bug reports and testing assistance

### 2. Contributor Levels

#### New Contributors
- First-time contributors to the project
- Focus on learning and small contributions
- Mentorship and guidance provided

#### Regular Contributors
- Consistent contributors with multiple PRs
- Familiar with project standards and processes
- Can mentor new contributors

#### Core Contributors
- Significant ongoing contributions
- Deep understanding of project architecture
- Involved in design decisions and planning

### 3. Contribution Tracking

We track contributions through:
- GitHub contribution graphs
- Release note acknowledgments
- Contributor documentation
- Community recognition programs

## Summary

1. **Follow the development workflow** with proper branching and testing
2. **Adhere to code standards** for consistency and quality
3. **Write comprehensive tests** to maintain reliability
4. **Document your changes** for future maintainers
5. **Participate in code reviews** constructively and promptly
6. **Communicate effectively** with the community
7. **Be patient and respectful** in all interactions
8. **Continuously learn and improve** your contributions
9. **Help others** and share your knowledge
10. **Have fun** and enjoy contributing to the project!

---

Thank you for contributing to Kavach! Your efforts help make this project better for everyone. If you have questions or suggestions about this contribution guide, please open an issue or start a discussion.

*This guide is a living document that evolves with our project and community. Please suggest improvements and updates as needed.*