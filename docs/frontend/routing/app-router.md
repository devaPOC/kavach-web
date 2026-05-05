# Next.js App Router Guide

## Overview

Kavach uses **Next.js 14** with the **App Router** architecture, providing a modern, file-system based routing solution with built-in support for layouts, loading states, error boundaries, and server components. The routing structure is organized with route groups for better code organization and middleware integration.

## Project Structure

### Route Organization

```
src/app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Home page
├── globals.css                   # Global styles
├── (frontend)/                   # Frontend route group
│   ├── login/
│   │   └── page.tsx             # /login
│   ├── signup/
│   │   └── page.tsx             # /signup
│   ├── dashboard/
│   │   └── page.tsx             # /dashboard
│   ├── profile/
│   │   └── page.tsx             # /profile
│   ├── complete-profile/
│   │   └── page.tsx             # /complete-profile
│   ├── pending-approval/
│   │   └── page.tsx             # /pending-approval
│   ├── account-restricted/
│   │   └── page.tsx             # /account-restricted
│   ├── verify-email/
│   │   └── page.tsx             # /verify-email
│   └── admin/
│       ├── login/
│       │   └── page.tsx         # /admin/login
│       └── dashboard/
│           └── page.tsx         # /admin/dashboard
└── (backend)/                   # Backend route group
    └── api/
        └── v1/                  # API routes
            ├── auth/
            ├── admin/
            ├── profile/
            └── users/
```

### Route Groups

Route groups `(frontend)` and `(backend)` organize routes without affecting the URL structure:

- **(frontend)**: Contains all user-facing pages
- **(backend)**: Contains API routes and server-side logic

## Core Routing Concepts

### Pages and Layouts

#### Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kavach - Authentication & User Management",
  description: "Secure authentication and user management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

#### Page Components

```tsx
// src/app/(frontend)/dashboard/page.tsx
'use client';

import { useAuth, useRequireAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user, displayName, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useRequireAuth
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {displayName}</span>
            <Button variant="outline" onClick={logout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Name:</strong> {displayName}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Role:</strong> {user?.role}</p>
                <p><strong>Email Verified:</strong> {user?.isEmailVerified ? 'Yes' : 'No'}</p>
                <p><strong>Profile Completed:</strong> {user?.isProfileCompleted ? 'Yes' : 'No'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
```

### Dynamic Routes

#### Dynamic Segments

```tsx
// src/app/(frontend)/users/[id]/page.tsx
interface UserPageProps {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function UserPage({ params, searchParams }: UserPageProps) {
  const { id } = params;
  
  return (
    <div>
      <h1>User Profile: {id}</h1>
      {/* User profile content */}
    </div>
  );
}

// src/app/(frontend)/users/[id]/edit/page.tsx
export default function EditUserPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Edit User: {params.id}</h1>
      {/* Edit form */}
    </div>
  );
}
```

#### Catch-all Routes

```tsx
// src/app/(frontend)/docs/[...slug]/page.tsx
interface DocsPageProps {
  params: { slug: string[] };
}

export default function DocsPage({ params }: DocsPageProps) {
  const path = params.slug.join('/');
  
  return (
    <div>
      <h1>Documentation: {path}</h1>
      {/* Dynamic documentation content */}
    </div>
  );
}
```

### Route Handlers (API Routes)

```tsx
// src/app/(backend)/api/v1/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user/user.service';
import { withAuth } from '@/lib/auth/api-middleware';

export async function GET(request: NextRequest) {
  return withAuth(async (req, session) => {
    try {
      const users = await userService.getAllUsers();
      
      return NextResponse.json({
        success: true,
        data: users,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch users',
        },
        { status: 500 }
      );
    }
  })(request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, session) => {
    try {
      const body = await req.json();
      const user = await userService.createUser(body);
      
      return NextResponse.json({
        success: true,
        data: user,
      }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create user',
        },
        { status: 500 }
      );
    }
  })(request);
}

// src/app/(backend)/api/v1/users/[id]/route.ts
interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (req, session) => {
    try {
      const user = await userService.getUserById(params.id);
      
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: user,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch user',
        },
        { status: 500 }
      );
    }
  })(request);
}
```

## Navigation and Links

### Client-Side Navigation

```tsx
// src/components/navigation/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-xl font-bold">
              Kavach
            </Link>
            
            {isAuthenticated && (
              <div className="flex space-x-4">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === '/dashboard'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Dashboard
                </Link>
                
                <Link
                  href="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === '/profile'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Profile
                </Link>
                
                {user?.role === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === '/admin/dashboard'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm">
                  {user?.firstName} {user?.lastName}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

### Programmatic Navigation

```tsx
// src/components/auth/LoginForm.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (formData: LoginFormData) => {
    try {
      const result = await authApi.login(formData);
      
      if (result.success) {
        // Redirect to intended destination or dashboard
        const redirectTo = searchParams.get('redirect') || '/dashboard';
        router.push(redirectTo);
      }
    } catch (error) {
      // Handle error
    }
  };

  const handleSignupRedirect = () => {
    // Preserve current search params when redirecting
    const params = new URLSearchParams(searchParams);
    router.push(`/signup?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleSignupRedirect}>
          Sign Up Instead
        </Button>
        <Button type="submit">Sign In</Button>
      </div>
    </form>
  );
}
```

## Loading and Error States

### Loading UI

```tsx
// src/app/(frontend)/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded w-1/4"></div>
          <div className="grid gap-6">
            <div className="h-32 bg-muted animate-pulse rounded"></div>
            <div className="h-32 bg-muted animate-pulse rounded"></div>
            <div className="h-32 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/app/(frontend)/users/[id]/loading.tsx
export default function UserLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-4">
        <div className="h-6 bg-muted animate-pulse rounded w-1/3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-muted animate-pulse rounded"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
          <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}
```

### Error Boundaries

```tsx
// src/app/(frontend)/dashboard/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-destructive">
            Something went wrong!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            We encountered an error while loading your dashboard.
          </p>
          <div className="flex justify-center space-x-2">
            <Button onClick={reset}>Try Again</Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// src/app/(frontend)/error.tsx - Global error boundary
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-destructive">
              Application Error
            </h1>
            <p className="text-muted-foreground">
              Something went wrong with the application.
            </p>
            <Button onClick={reset}>Try Again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### Not Found Pages

```tsx
// src/app/(frontend)/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
          <div className="flex justify-center">
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// src/app/(frontend)/users/[id]/not-found.tsx
export default function UserNotFound() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p className="text-muted-foreground">
          The user you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/users">Back to Users</Link>
        </Button>
      </div>
    </div>
  );
}
```

## Middleware Integration

### Route Protection

```tsx
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { sessionValidationMiddleware } from './lib/auth/session-validation-middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Process session validation
  const sessionResult = await sessionValidationMiddleware.processSessionMiddleware(
    request,
    NextResponse.next()
  );

  const { session, isValid } = sessionResult;

  // Protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/admin'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !isValid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes
  if (pathname.startsWith('/admin') && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect authenticated users away from auth pages
  const authPages = ['/login', '/signup'];
  if (authPages.includes(pathname) && isValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return sessionResult.response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## Search Params and Query Handling

### Reading Search Parameters

```tsx
// src/app/(frontend)/search/page.tsx
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');

  const updateSearchParams = (newQuery: string, newCategory: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (newQuery) {
      params.set('q', newQuery);
    } else {
      params.delete('q');
    }
    
    if (newCategory !== 'all') {
      params.set('category', newCategory);
    } else {
      params.delete('category');
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams(query, category);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Categories</option>
            <option value="users">Users</option>
            <option value="posts">Posts</option>
          </select>
          <Button type="submit">Search</Button>
        </div>
      </form>
      
      <div className="mt-8">
        <h2>Search Results</h2>
        <p>Query: {searchParams.get('q')}</p>
        <p>Category: {searchParams.get('category') || 'all'}</p>
      </div>
    </div>
  );
}
```

### Server-Side Search Params

```tsx
// src/app/(frontend)/users/page.tsx
interface UsersPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
  };
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const page = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '10');
  const search = searchParams.search || '';
  const role = searchParams.role || '';

  // Fetch users based on search params
  const users = await getUsersWithFilters({
    page,
    limit,
    search,
    role,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Users</h1>
      
      {/* Search and filter UI */}
      <UserFilters
        currentSearch={search}
        currentRole={role}
        currentPage={page}
      />
      
      {/* Users list */}
      <UsersList users={users.data} />
      
      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={users.totalPages}
        baseUrl="/users"
        searchParams={searchParams}
      />
    </div>
  );
}
```

## Metadata and SEO

### Static Metadata

```tsx
// src/app/(frontend)/about/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - Kavach',
  description: 'Learn more about Kavach and our mission to provide secure authentication solutions.',
  keywords: ['authentication', 'security', 'user management'],
  openGraph: {
    title: 'About Us - Kavach',
    description: 'Learn more about Kavach and our mission.',
    type: 'website',
    url: 'https://kavach.com/about',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Us - Kavach',
    description: 'Learn more about Kavach and our mission.',
  },
};

export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      {/* Page content */}
    </div>
  );
}
```

### Dynamic Metadata

```tsx
// src/app/(frontend)/users/[id]/page.tsx
import type { Metadata } from 'next';
import { getUserById } from '@/lib/services/user/user.service';

interface UserPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const user = await getUserById(params.id);

  if (!user) {
    return {
      title: 'User Not Found - Kavach',
    };
  }

  return {
    title: `${user.firstName} ${user.lastName} - Kavach`,
    description: `View profile for ${user.firstName} ${user.lastName}`,
    openGraph: {
      title: `${user.firstName} ${user.lastName}`,
      description: `View profile for ${user.firstName} ${user.lastName}`,
      type: 'profile',
    },
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const user = await getUserById(params.id);

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.firstName} {user.lastName}</h1>
      {/* User profile content */}
    </div>
  );
}
```

## Best Practices

### Route Organization

1. **Use route groups**: Organize related routes with parentheses
2. **Consistent naming**: Use kebab-case for route segments
3. **Logical hierarchy**: Structure routes to match user mental models
4. **Separate concerns**: Keep API routes separate from page routes

### Performance

1. **Server components by default**: Use server components unless client interactivity is needed
2. **Streaming**: Use loading.tsx files for better perceived performance
3. **Metadata optimization**: Include proper metadata for SEO
4. **Image optimization**: Use Next.js Image component for optimized images

### Error Handling

1. **Error boundaries**: Implement error.tsx files for graceful error handling
2. **Not found pages**: Create custom 404 pages for better UX
3. **Loading states**: Provide loading feedback for async operations
4. **Fallback UI**: Always provide fallback UI for error states

### Security

1. **Route protection**: Use middleware for authentication and authorization
2. **Input validation**: Validate all user inputs on both client and server
3. **CSRF protection**: Implement CSRF protection for forms
4. **Rate limiting**: Apply rate limiting to API routes

### SEO and Accessibility

1. **Semantic HTML**: Use proper HTML elements and structure
2. **Meta tags**: Include comprehensive metadata
3. **Alt text**: Provide alt text for all images
4. **Focus management**: Ensure proper focus management for navigation

## Related Documentation

- [Authentication Components](../components/auth-components.md) - Auth component integration
- [Middleware Guide](../../backend/middleware/authentication.md) - Authentication middleware
- [API Routes](../../api/README.md) - API route documentation
- [State Management](../state-management/zustand.md) - Client-side state management
- [Performance Guide](../../development/coding-standards/performance.md) - Performance optimization