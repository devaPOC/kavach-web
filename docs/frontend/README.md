# Frontend Documentation

## Overview

The Kavach frontend is built with **Next.js 14** using the App Router, **React 18**, **TypeScript**, and **Tailwind CSS**. It provides a modern, responsive user interface for authentication, user management, and profile management functionality.

## Architecture

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks with custom state management patterns
- **Forms**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui component library
- **Icons**: Lucide React

### Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (frontend)/              # Frontend route group
│   │   ├── login/               # Login page
│   │   ├── signup/              # Signup page
│   │   ├── dashboard/           # User dashboard
│   │   ├── profile/             # Profile management
│   │   └── admin/               # Admin interface
│   └── layout.tsx               # Root layout
├── components/                   # React components
│   ├── ui/                      # Base UI components (shadcn/ui)
│   └── custom/                  # Custom application components
│       ├── auth/                # Authentication components
│       ├── admin/               # Admin components
│       ├── navigation/          # Navigation components
│       └── profile/             # Profile components
└── lib/                         # Utility libraries and hooks
    └── hooks/                   # Custom React hooks
```

## Key Features

### Authentication System
- **Multi-role authentication** (Customer, Expert, Admin)
- **Real-time email validation** during signup
- **Secure password handling** with visibility toggle
- **Form validation** with immediate feedback
- **Error handling** with user-friendly messages

### User Interface
- **Responsive design** that works on all devices
- **Accessible components** following WCAG guidelines
- **Consistent design system** with Tailwind CSS
- **Dark mode support** (configurable)
- **Loading states** and error boundaries

### Component Architecture
- **Reusable UI components** built on shadcn/ui
- **Custom business logic components** for specific features
- **Form components** with built-in validation
- **Layout components** for consistent page structure

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Basic knowledge of React and TypeScript
- Familiarity with Tailwind CSS

### Development Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Open http://localhost:3000 in your browser

### Component Development
- All components are TypeScript-first
- Use the existing UI components from `@/components/ui`
- Follow the established patterns for custom components
- Include proper TypeScript interfaces for all props

## Component Categories

### Base UI Components
Located in `src/components/ui/`, these are the foundational components based on shadcn/ui:
- Form controls (Button, Input, Select, Checkbox)
- Layout components (Card, Separator, Tabs)
- Feedback components (Alert, Dialog)
- Typography and styling utilities

### Authentication Components
Located in `src/components/custom/auth/`, these handle user authentication:
- LoginForm - Multi-role login with validation
- SignupWizard - Registration with real-time validation
- TabNavigation - Role-based navigation tabs

### Admin Components
Located in `src/components/custom/admin/`, these provide admin functionality:
- UserManagement - User CRUD operations
- DashboardStats - Admin dashboard metrics
- User dialogs for create/edit/delete operations

### Profile Components
Located in `src/components/custom/profile/`, these handle profile management:
- CustomerProfileWizard - Customer profile setup
- ExpertProfileWizard - Expert profile setup

### Navigation Components
Located in `src/components/custom/navigation/`:
- Navbar - Main application navigation

## Development Guidelines

### Component Standards
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Include error boundaries where appropriate
- Follow accessibility best practices
- Use consistent naming conventions

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow the design system color palette
- Implement responsive design patterns
- Use CSS variables for theme customization

### State Management
- Use React hooks for local state
- Implement custom hooks for shared logic
- Use context for global state when needed
- Follow unidirectional data flow patterns

## Testing

### Component Testing
- Unit tests for individual components
- Integration tests for component interactions
- Accessibility testing with automated tools
- Visual regression testing for UI consistency

### Testing Tools
- Jest for unit testing
- React Testing Library for component testing
- Playwright for end-to-end testing
- Axe for accessibility testing

## Performance

### Optimization Strategies
- Code splitting with Next.js dynamic imports
- Image optimization with Next.js Image component
- Bundle analysis and optimization
- Lazy loading for non-critical components

### Monitoring
- Core Web Vitals tracking
- Error boundary reporting
- Performance metrics collection
- User experience monitoring

## Related Documentation

- [UI Components](./components/ui-components.md) - Base UI component reference
- [Authentication Components](./components/auth-components.md) - Auth component documentation
- [Form Components](./components/form-components.md) - Form handling patterns
- [Styling Guide](./styling/design-system.md) - Design system and styling
- [State Management](./state-management/zustand.md) - State management patterns
- [Routing](./routing/app-router.md) - Next.js routing documentation

## Contributing

When contributing to the frontend:
1. Follow the established component patterns
2. Include proper TypeScript types
3. Add tests for new components
4. Update documentation for new features
5. Follow the code review process

For detailed contribution guidelines, see [Contributing Guide](../contributing/README.md).