# Git Workflow

This document outlines the Git workflow and branching strategy for the Kavach project. Following these guidelines ensures consistent collaboration, code quality, and release management.

## Table of Contents

- [Branching Strategy](#branching-strategy)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Standards](#commit-message-standards)
- [Pull Request Process](#pull-request-process)
- [Release Management](#release-management)
- [Hotfix Process](#hotfix-process)
- [Best Practices](#best-practices)
- [Git Commands Reference](#git-commands-reference)

## Branching Strategy

We use a modified Git Flow strategy optimized for continuous deployment and feature development.

### Main Branches

#### `main`
- **Purpose**: Production-ready code
- **Protection**: Protected branch with required reviews
- **Deployment**: Automatically deployed to production
- **Merging**: Only from `develop` via pull requests

#### `develop`
- **Purpose**: Integration branch for features
- **Protection**: Protected branch with required reviews
- **Deployment**: Automatically deployed to staging
- **Merging**: From feature branches and hotfixes

### Supporting Branches

#### Feature Branches (`feature/*`)
- **Purpose**: New features and enhancements
- **Lifetime**: Created from `develop`, merged back to `develop`
- **Naming**: `feature/description-of-feature`
- **Example**: `feature/user-authentication`, `feature/profile-management`

#### Bugfix Branches (`bugfix/*`)
- **Purpose**: Non-critical bug fixes
- **Lifetime**: Created from `develop`, merged back to `develop`
- **Naming**: `bugfix/description-of-fix`
- **Example**: `bugfix/login-validation-error`, `bugfix/email-formatting`

#### Hotfix Branches (`hotfix/*`)
- **Purpose**: Critical production fixes
- **Lifetime**: Created from `main`, merged to both `main` and `develop`
- **Naming**: `hotfix/description-of-fix`
- **Example**: `hotfix/security-vulnerability`, `hotfix/critical-login-bug`

#### Release Branches (`release/*`)
- **Purpose**: Prepare releases and final testing
- **Lifetime**: Created from `develop`, merged to `main` and `develop`
- **Naming**: `release/version-number`
- **Example**: `release/1.2.0`, `release/2.0.0-beta`

### Branch Flow Diagram

```mermaid
gitgraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Setup"
    
    branch feature/auth
    checkout feature/auth
    commit id: "Add login"
    commit id: "Add signup"
    
    checkout develop
    merge feature/auth
    commit id: "Merge auth"
    
    branch release/1.0.0
    checkout release/1.0.0
    commit id: "Version bump"
    commit id: "Bug fixes"
    
    checkout main
    merge release/1.0.0
    commit id: "Release 1.0.0"
    
    checkout develop
    merge release/1.0.0
    
    branch hotfix/critical-fix
    checkout hotfix/critical-fix
    commit id: "Fix security issue"
    
    checkout main
    merge hotfix/critical-fix
    commit id: "Hotfix 1.0.1"
    
    checkout develop
    merge hotfix/critical-fix
```

## Branch Naming Conventions

### Format
Use lowercase with hyphens to separate words:

```bash
# ✅ Good
feature/user-profile-management
bugfix/email-validation-error
hotfix/security-vulnerability-fix
release/2.1.0

# ❌ Bad
feature/UserProfileManagement
bugfix/email_validation_error
hotfix/securityFix
release/v2.1.0
```

### Categories

#### Feature Branches
```bash
feature/authentication-system
feature/user-dashboard
feature/email-notifications
feature/admin-panel
feature/api-rate-limiting
```

#### Bugfix Branches
```bash
bugfix/login-form-validation
bugfix/password-reset-email
bugfix/profile-image-upload
bugfix/database-connection-timeout
```

#### Hotfix Branches
```bash
hotfix/sql-injection-vulnerability
hotfix/memory-leak-fix
hotfix/authentication-bypass
hotfix/data-corruption-fix
```

#### Release Branches
```bash
release/1.0.0
release/1.1.0
release/2.0.0-beta
release/2.0.0-rc1
```

## Commit Message Standards

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for consistent commit messages.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates
- **ci**: CI/CD configuration changes
- **build**: Build system or external dependency changes

### Examples

#### Feature Commits
```bash
feat(auth): add JWT token refresh mechanism

Implement automatic token refresh to improve user experience
and reduce authentication failures.

- Add refresh token endpoint
- Update client-side token management
- Add token expiration handling

Closes #123
```

#### Bug Fix Commits
```bash
fix(validation): resolve email validation regex issue

The previous regex was too restrictive and rejected valid
email addresses with plus signs.

- Update email validation regex
- Add comprehensive test cases
- Update validation error messages

Fixes #456
```

#### Documentation Commits
```bash
docs(api): update authentication endpoint documentation

- Add missing request/response examples
- Update error code descriptions
- Fix typos in parameter descriptions
```

#### Refactoring Commits
```bash
refactor(services): extract common validation logic

Move shared validation functions to a common utility module
to reduce code duplication and improve maintainability.

- Create validation utility module
- Update service classes to use shared validators
- Add unit tests for validation utilities
```

### Commit Message Rules

1. **Use imperative mood** in the subject line ("add" not "added")
2. **Capitalize the subject line** first letter
3. **No period at the end** of the subject line
4. **Limit subject line to 50 characters**
5. **Wrap body at 72 characters**
6. **Use body to explain what and why**, not how
7. **Reference issues and pull requests** when applicable

## Pull Request Process

### 1. Creating Pull Requests

#### PR Title Format
Use the same format as commit messages:

```
feat(auth): implement two-factor authentication
fix(database): resolve connection pool exhaustion
docs(api): update user management endpoints
```

#### PR Description Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

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
Fixes #456
Related to #789

## Screenshots (if applicable)
Add screenshots for UI changes.

## Additional Notes
Any additional information or context.
```

### 2. Review Process

#### Required Reviews
- **Feature branches**: At least 1 approval from team member
- **Hotfix branches**: At least 1 approval from senior developer
- **Release branches**: At least 2 approvals from senior developers

#### Review Checklist
- [ ] Code quality and standards compliance
- [ ] Test coverage and quality
- [ ] Documentation updates
- [ ] Security considerations
- [ ] Performance impact
- [ ] Breaking changes identified

#### Automated Checks
All PRs must pass:
- [ ] Linting (ESLint)
- [ ] Type checking (TypeScript)
- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] Security scanning
- [ ] Build verification

### 3. Merging Strategy

#### Merge Types
- **Squash and merge**: For feature branches (default)
- **Merge commit**: For release and hotfix branches
- **Rebase and merge**: For small, clean commits

#### Before Merging
1. Ensure all checks pass
2. Resolve all review comments
3. Update branch with latest changes from target branch
4. Verify deployment readiness

## Release Management

### 1. Version Numbering

We use [Semantic Versioning (SemVer)](https://semver.org/):

```
MAJOR.MINOR.PATCH

1.0.0 - Initial release
1.1.0 - New features, backward compatible
1.1.1 - Bug fixes, backward compatible
2.0.0 - Breaking changes
```

### 2. Release Process

#### Step 1: Create Release Branch
```bash
# From develop branch
git checkout develop
git pull origin develop
git checkout -b release/1.2.0
```

#### Step 2: Prepare Release
```bash
# Update version numbers
npm version 1.2.0 --no-git-tag-version

# Update CHANGELOG.md
# Update documentation
# Final testing

# Commit changes
git add .
git commit -m "chore(release): prepare version 1.2.0"
```

#### Step 3: Create Pull Request
- Create PR from `release/1.2.0` to `main`
- Include release notes and changelog
- Require senior developer approval

#### Step 4: Merge and Tag
```bash
# After PR approval and merge
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0

# Merge back to develop
git checkout develop
git merge main
git push origin develop
```

#### Step 5: Deploy
- Production deployment triggered automatically
- Monitor deployment and system health
- Communicate release to stakeholders

### 3. Release Notes Template

```markdown
# Release v1.2.0

## 🚀 New Features
- **Authentication**: Added two-factor authentication support
- **Dashboard**: New user analytics dashboard
- **API**: Rate limiting for all endpoints

## 🐛 Bug Fixes
- Fixed email validation regex issue
- Resolved database connection timeout
- Fixed profile image upload error

## 🔧 Improvements
- Improved login performance by 30%
- Enhanced error messages
- Updated dependencies

## 🔒 Security
- Fixed potential SQL injection vulnerability
- Updated JWT token validation
- Enhanced password strength requirements

## 📚 Documentation
- Updated API documentation
- Added deployment guides
- Improved troubleshooting section

## 🔄 Breaking Changes
- Changed user role enum values (migration required)
- Updated API response format for user endpoints

## 📦 Dependencies
- Updated Next.js to v15.4.6
- Updated React to v19.1.0
- Added new security packages

## 🧪 Testing
- Added 50+ new unit tests
- Improved test coverage to 85%
- Added integration tests for auth flow
```

## Hotfix Process

### 1. Critical Issues

For production issues requiring immediate fixes:

#### Step 1: Create Hotfix Branch
```bash
# From main branch
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix
```

#### Step 2: Implement Fix
```bash
# Make minimal changes to fix the issue
# Add tests if possible
# Update version number (patch increment)

git add .
git commit -m "fix(security): resolve authentication bypass vulnerability"
```

#### Step 3: Create Emergency PR
- Create PR from hotfix branch to `main`
- Mark as urgent/critical
- Include detailed description of issue and fix
- Require immediate review from senior developer

#### Step 4: Deploy and Merge Back
```bash
# After merge to main and deployment
git checkout develop
git merge main  # Merge hotfix back to develop
git push origin develop

# Clean up hotfix branch
git branch -d hotfix/critical-security-fix
git push origin --delete hotfix/critical-security-fix
```

### 2. Hotfix Checklist

- [ ] Issue is critical and affects production
- [ ] Fix is minimal and targeted
- [ ] Tests added or updated
- [ ] Documentation updated if necessary
- [ ] Senior developer review completed
- [ ] Deployment plan prepared
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

## Best Practices

### 1. Branch Management

#### Keep Branches Small and Focused
```bash
# ✅ Good - focused feature
feature/user-login-form

# ❌ Bad - too broad
feature/complete-authentication-system
```

#### Regular Updates
```bash
# Update feature branch with latest develop
git checkout feature/my-feature
git fetch origin
git merge origin/develop

# Or use rebase for cleaner history
git rebase origin/develop
```

#### Clean Up Branches
```bash
# Delete merged branches locally
git branch -d feature/completed-feature

# Delete remote branches
git push origin --delete feature/completed-feature

# Prune remote tracking branches
git remote prune origin
```

### 2. Commit Best Practices

#### Atomic Commits
Make commits that represent single, complete changes:

```bash
# ✅ Good - atomic commits
git commit -m "feat(auth): add login form validation"
git commit -m "test(auth): add login form validation tests"
git commit -m "docs(auth): update login API documentation"

# ❌ Bad - mixed concerns
git commit -m "add login validation, fix typos, update tests"
```

#### Commit Frequency
- Commit early and often
- Don't commit broken code
- Use meaningful commit messages
- Squash commits before merging if needed

### 3. Collaboration Guidelines

#### Before Starting Work
1. Check for existing branches/PRs
2. Discuss approach with team
3. Create issue if needed
4. Pull latest changes

#### During Development
1. Push changes regularly
2. Keep PRs small and focused
3. Respond to review comments promptly
4. Update documentation as needed

#### Code Review Guidelines
1. Review code thoroughly
2. Provide constructive feedback
3. Test changes locally if needed
4. Approve only when confident

## Git Commands Reference

### Basic Workflow

```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# Work on feature
git add .
git commit -m "feat: add new functionality"
git push origin feature/new-feature

# Update with latest develop
git fetch origin
git merge origin/develop

# Create pull request (via GitHub/GitLab UI)

# After merge, clean up
git checkout develop
git pull origin develop
git branch -d feature/new-feature
```

### Advanced Commands

```bash
# Interactive rebase to clean up commits
git rebase -i HEAD~3

# Cherry-pick specific commit
git cherry-pick <commit-hash>

# Stash changes temporarily
git stash push -m "work in progress"
git stash pop

# Reset to previous commit (careful!)
git reset --hard HEAD~1

# View commit history
git log --oneline --graph --decorate

# Find when bug was introduced
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
```

### Branch Management

```bash
# List all branches
git branch -a

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# Rename current branch
git branch -m new-branch-name

# Track remote branch
git branch --set-upstream-to=origin/branch-name
```

### Troubleshooting

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Fix last commit message
git commit --amend -m "new message"

# Resolve merge conflicts
git status
# Edit conflicted files
git add .
git commit

# Abort merge
git merge --abort
```

## Summary

1. **Use Git Flow** with `main`, `develop`, and feature branches
2. **Follow naming conventions** for branches and commits
3. **Write meaningful commit messages** using conventional commits
4. **Create focused pull requests** with proper descriptions
5. **Require code reviews** for all changes
6. **Use semantic versioning** for releases
7. **Handle hotfixes carefully** with proper process
8. **Keep branches clean** and up to date
9. **Communicate changes** through proper channels
10. **Document everything** for future reference

---

*This Git workflow ensures code quality, collaboration efficiency, and release reliability. Please follow these guidelines consistently and suggest improvements as needed.*