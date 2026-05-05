/**
 * Middleware Configuration
 * Centralized configuration for middleware behavior and route protection
 */

export interface MiddlewareConfig {
  // Rate limiting configuration
  rateLimiting: {
    enabled: boolean;
    endpoints: string[];
  };

  // Security headers configuration
  securityHeaders: {
    enabled: boolean;
    strictCSP: boolean;
    hstsEnabled: boolean;
    enablePermissionsPolicy: boolean;
    enableReferrerPolicy: boolean;
    enableCORP: boolean; // Cross-Origin Resource Policy
  };

  // Session management configuration
  sessionManagement: {
    autoRenewal: boolean;
    renewalThreshold: number; // milliseconds
    strictValidation: boolean;
  };

  // Logging configuration
  logging: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logRequests: boolean;
    logSecurity: boolean;
  };

  // Redirect configuration
  redirects: {
    preventLoops: boolean;
    maxRedirects: number;
    preserveQuery: boolean;
    trackRedirectHistory: boolean;
  };

  // Request correlation configuration
  correlation: {
    enabled: boolean;
    includeUserAgent: boolean;
    includeClientIP: boolean;
    trackRedirects: boolean;
  };
}

/**
 * Default middleware configuration
 */
export const DEFAULT_MIDDLEWARE_CONFIG: MiddlewareConfig = {
  rateLimiting: {
    enabled: true,
    endpoints: [
      '/api/v1/auth/',
      '/api/v1/admin/login',
      '/api/v1/quizzes/',
      '/api/v1/admin/quizzes/',
      '/api/v1/learning-modules/'
    ]
  },

  securityHeaders: {
    enabled: true,
    strictCSP: process.env.NODE_ENV === 'production',
    hstsEnabled: process.env.NODE_ENV === 'production',
    enablePermissionsPolicy: true,
    enableReferrerPolicy: true,
    enableCORP: process.env.NODE_ENV === 'production'
  },

  sessionManagement: {
    autoRenewal: true,
    renewalThreshold: 24 * 60 * 60 * 1000, // 24 hours
    strictValidation: true
  },

  logging: {
    enabled: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    logRequests: true,
    logSecurity: true
  },

  redirects: {
    preventLoops: true,
    maxRedirects: 3,
    preserveQuery: true,
    trackRedirectHistory: true
  },

  correlation: {
    enabled: true,
    includeUserAgent: true,
    includeClientIP: true,
    trackRedirects: true
  }
};

/**
 * Route protection levels
 */
export enum ProtectionLevel {
  PUBLIC = 'public',
  AUTHENTICATED = 'authenticated',
  EMAIL_VERIFIED = 'email_verified',
  PROFILE_COMPLETED = 'profile_completed',
  APPROVED = 'approved',
  ADMIN = 'admin'
}

/**
 * Route protection configuration
 */
export interface RouteProtection {
  path: string;
  level: ProtectionLevel;
  roles?: string[];
  redirectTo?: string;
  apiRoute?: boolean;
}

/**
 * Enhanced route protection rules
 */
export const ROUTE_PROTECTIONS: RouteProtection[] = [
  // Public routes
  { path: '/', level: ProtectionLevel.PUBLIC },
  { path: '/login', level: ProtectionLevel.PUBLIC },
  { path: '/signup', level: ProtectionLevel.PUBLIC },
  { path: '/verify-email', level: ProtectionLevel.PUBLIC },

  // API public routes
  { path: '/api/v1/auth/signup', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/auth/login', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/auth/verify-email', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/auth/resend-verification', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/auth/check-email', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/auth/forgot-password', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/auth/reset-password', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/admin/login', level: ProtectionLevel.PUBLIC, apiRoute: true },
  { path: '/api/v1/health', level: ProtectionLevel.PUBLIC, apiRoute: true },

  // Admin routes
  { path: '/admin/login', level: ProtectionLevel.PUBLIC },
  { path: '/admin', level: ProtectionLevel.ADMIN, roles: ['admin'] },
  { path: '/api/v1/admin', level: ProtectionLevel.ADMIN, roles: ['admin'], apiRoute: true },

  // Authenticated routes
  { path: '/dashboard', level: ProtectionLevel.PROFILE_COMPLETED, roles: ['customer'] }, // Customers only
  { path: '/expert/dashboard', level: ProtectionLevel.APPROVED, roles: ['expert', 'trainer'] }, // Experts and trainers
  { path: '/profile', level: ProtectionLevel.PROFILE_COMPLETED }, // Allow profile access after completion
  { path: '/complete-profile', level: ProtectionLevel.EMAIL_VERIFIED, roles: ['customer', 'expert', 'trainer'] },
  { path: '/pending-approval', level: ProtectionLevel.PROFILE_COMPLETED, roles: ['expert', 'trainer'] },

  // API authenticated routes
  { path: '/api/v1/auth/me', level: ProtectionLevel.AUTHENTICATED, apiRoute: true },
  { path: '/api/v1/auth/refresh', level: ProtectionLevel.AUTHENTICATED, apiRoute: true },
  { path: '/api/v1/auth/logout', level: ProtectionLevel.AUTHENTICATED, apiRoute: true },
  { path: '/api/v1/users', level: ProtectionLevel.EMAIL_VERIFIED, apiRoute: true },
  { path: '/api/v1/profile', level: ProtectionLevel.EMAIL_VERIFIED, apiRoute: true },

  // Awareness Lab API routes - Allow customers, experts, and trainers
  { path: '/api/v1/quizzes', level: ProtectionLevel.PROFILE_COMPLETED, roles: ['customer', 'expert', 'trainer'], apiRoute: true },
  { path: '/api/v1/learning-modules', level: ProtectionLevel.PROFILE_COMPLETED, roles: ['customer', 'expert', 'trainer'], apiRoute: true },
  { path: '/api/v1/admin/quizzes', level: ProtectionLevel.ADMIN, roles: ['admin'], apiRoute: true },
  { path: '/api/v1/admin/quiz-templates', level: ProtectionLevel.ADMIN, roles: ['admin'], apiRoute: true },
  { path: '/api/v1/admin/learning-modules', level: ProtectionLevel.ADMIN, roles: ['admin'], apiRoute: true },
  { path: '/api/v1/admin/analytics', level: ProtectionLevel.ADMIN, roles: ['admin'], apiRoute: true },
  { path: '/api/v1/admin/me', level: ProtectionLevel.ADMIN, roles: ['admin'], apiRoute: true }
];

/**
 * Get protection level for a given path
 */
export function getRouteProtection(pathname: string): RouteProtection | null {
  // Find exact match first
  const exactMatch = ROUTE_PROTECTIONS.find(rule => rule.path === pathname);
  if (exactMatch) {
    return exactMatch;
  }

  // Find prefix match
  const prefixMatch = ROUTE_PROTECTIONS.find(rule =>
    pathname.startsWith(rule.path) &&
    (rule.path.endsWith('/') || pathname.charAt(rule.path.length) === '/')
  );

  return prefixMatch || null;
}

/**
 * Check if path requires specific protection level
 */
export function requiresProtectionLevel(
  pathname: string,
  level: ProtectionLevel
): boolean {
  const protection = getRouteProtection(pathname);
  if (!protection) {
    return false;
  }

  const levelHierarchy = [
    ProtectionLevel.PUBLIC,
    ProtectionLevel.AUTHENTICATED,
    ProtectionLevel.EMAIL_VERIFIED,
    ProtectionLevel.PROFILE_COMPLETED,
    ProtectionLevel.APPROVED,
    ProtectionLevel.ADMIN
  ];

  const requiredIndex = levelHierarchy.indexOf(protection.level);
  const providedIndex = levelHierarchy.indexOf(level);

  return providedIndex >= requiredIndex;
}

/**
 * Check if user meets route requirements
 */
export function meetsRouteRequirements(
  pathname: string,
  userRole: string | undefined,
  isAuthenticated: boolean,
  isEmailVerified: boolean,
  isProfileCompleted: boolean,
  isApproved: boolean
): { allowed: boolean; reason?: string; redirectTo?: string } {
  const protection = getRouteProtection(pathname);

  if (!protection || protection.level === ProtectionLevel.PUBLIC) {
    return { allowed: true };
  }

  // Check authentication
  if (!isAuthenticated) {
    return {
      allowed: false,
      reason: 'Authentication required',
      redirectTo: '/login'
    };
  }

  // Check admin access
  if (protection.level === ProtectionLevel.ADMIN) {
    if (userRole !== 'admin') {
      return {
        allowed: false,
        reason: 'Admin access required',
        redirectTo: userRole ? '/dashboard' : '/login'
      };
    }
    return { allowed: true };
  }

  // Check role requirements with inheritance support
  // Trainers have all expert permissions plus trainer-specific features
  if (protection.roles && protection.roles.length > 0) {
    if (!userRole) {
      return {
        allowed: false,
        reason: `Role ${protection.roles.join(' or ')} required`,
        redirectTo: '/dashboard'
      };
    }

    // Direct role match
    const hasDirectRole = protection.roles.includes(userRole);

    // Trainer inheritance: trainers can access expert routes
    const hasInheritedRole = userRole === 'trainer' && protection.roles.includes('expert');

    if (!hasDirectRole && !hasInheritedRole) {
      return {
        allowed: false,
        reason: `Role ${protection.roles.join(' or ')} required`,
        redirectTo: '/dashboard'
      };
    }
  }

  // Check email verification
  const levelHierarchy = [
    ProtectionLevel.PUBLIC,
    ProtectionLevel.AUTHENTICATED,
    ProtectionLevel.EMAIL_VERIFIED,
    ProtectionLevel.PROFILE_COMPLETED,
    ProtectionLevel.APPROVED,
    ProtectionLevel.ADMIN
  ];

  const requiredIndex = levelHierarchy.indexOf(protection.level);
  const emailVerifiedIndex = levelHierarchy.indexOf(ProtectionLevel.EMAIL_VERIFIED);

  if (requiredIndex >= emailVerifiedIndex && !isEmailVerified) {
    return {
      allowed: false,
      reason: 'Email verification required',
      redirectTo: '/verify-email'
    };
  }

  // Check profile completion
  const profileCompletedIndex = levelHierarchy.indexOf(ProtectionLevel.PROFILE_COMPLETED);

  if (requiredIndex >= profileCompletedIndex && !isProfileCompleted) {
    return {
      allowed: false,
      reason: 'Profile completion required',
      redirectTo: '/complete-profile'
    };
  }

  // Special handling for experts and trainers who completed profile but are not approved
  if ((userRole === 'expert' || userRole === 'trainer') && isProfileCompleted && !isApproved) {
    // Only allow access to pending-approval, profile pages, and essential API routes
    const allowedPaths = ['/pending-approval', '/profile', '/expert/dashboard'];
    const allowedApiPaths = [
      '/api/v1/auth/me',
      '/api/v1/auth/logout',
      '/api/v1/auth/refresh',
      '/api/v1/profile',
      '/api/v1/quizzes',
      '/api/v1/learning-modules'
    ];

    const isAllowedPath = allowedPaths.some(allowedPath => pathname.startsWith(allowedPath));
    const isAllowedApiPath = allowedApiPaths.some(allowedApiPath => pathname.startsWith(allowedApiPath));

    if (!isAllowedPath && !isAllowedApiPath) {
      return {
        allowed: false,
        reason: 'Account approval required - access restricted to profile and status pages only',
        redirectTo: '/pending-approval'
      };
    }
  }

  // Check approval (for experts and trainers accessing dashboard)
  if (pathname === '/dashboard' && (userRole === 'expert' || userRole === 'trainer') && !isApproved) {
    return {
      allowed: false,
      reason: 'Account approval required',
      redirectTo: '/pending-approval'
    };
  }

  // Check approval (for experts and trainers)
  const approvedIndex = levelHierarchy.indexOf(ProtectionLevel.APPROVED);

  if (requiredIndex >= approvedIndex && (userRole === 'expert' || userRole === 'trainer') && !isApproved) {
    return {
      allowed: false,
      reason: 'Account approval required',
      redirectTo: '/pending-approval'
    };
  }

  return { allowed: true };
}

/**
 * Get middleware configuration with environment overrides
 */
export function getMiddlewareConfig(): MiddlewareConfig {
  const config = { ...DEFAULT_MIDDLEWARE_CONFIG };

  // Turn off rate limiting by default for now
  config.rateLimiting.enabled = false;

  // Environment-specific overrides
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    config.rateLimiting.enabled = false;
  }

  if (process.env.DISABLE_SECURITY_HEADERS === 'true') {
    config.securityHeaders.enabled = false;
  }

  if (process.env.MIDDLEWARE_LOG_LEVEL) {
    config.logging.logLevel = process.env.MIDDLEWARE_LOG_LEVEL as any;
  }

  if (process.env.DISABLE_REDIRECT_TRACKING === 'true') {
    config.correlation.trackRedirects = false;
  }

  if (process.env.DISABLE_SECURITY_HEADERS === 'true') {
    config.securityHeaders.enabled = false;
  }

  return config;
}
