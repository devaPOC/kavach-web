export interface RouteConfig {
  public: string[];
  protected: string[];
  admin: string[];
  emailVerificationRequired: string[];
  roleSpecific: {
    customer: string[];
    expert: string[];
    trainer: string[];
  };
}

/**
 * Centralized route configuration
 * This makes it easy to manage and update route access rules
 */
export const ROUTE_CONFIG: RouteConfig = {
  // Public routes - no authentication required
  public: [
    '/',
    '/login',
    '/signup',
    '/verify-email',
    '/api/v1/auth/signup',
    '/api/v1/auth/login',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/resend-verification',
    '/api/v1/auth/check-email',
    '/api/v1/admin/login',
    '/api/v1/health'
  ],

  // Protected routes - require authentication
  protected: [
    '/dashboard',
    '/profile',
    '/settings',
    '/complete-profile',
    '/pending-approval',
    '/api/v1/users',
    '/api/v1/auth/me',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout'
  ],

  // Admin-only routes
  admin: [
    '/admin',
    '/admin/awareness-sessions',
    '/api/v1/admin',
    '/api/v1/admin/awareness-sessions'
  ],

  // Routes that require email verification
  emailVerificationRequired: [
    '/dashboard',
    '/dashboard/awareness-session-request',
    '/profile',
    '/settings',
    '/complete-profile',
    '/pending-approval',
    '/admin/awareness-sessions',
    '/expert/awareness-sessions',
    '/api/v1/users/profile',
    '/api/v1/users/change-password',
    '/api/v1/awareness-sessions',
    '/api/v1/admin/awareness-sessions',
    '/api/v1/expert/awareness-sessions'
  ],

  // Role-specific routes
  roleSpecific: {
    customer: [
      '/customer',
      '/dashboard',
      '/dashboard/awareness-session-request',
      '/api/v1/customers',
      '/api/v1/awareness-sessions'
    ],
    expert: [
      '/expert',
      '/expert/dashboard',
      '/expert/awareness-sessions',
      '/api/v1/expert',
      '/api/v1/expert/awareness-sessions'
    ],
    trainer: [
      '/trainer',
      '/trainer/dashboard',
      '/trainer/resources',
      '/expert',
      '/expert/dashboard',
      '/expert/awareness-sessions',
      '/api/v1/trainer',
      '/api/v1/trainer/resources',
      '/api/v1/expert',
      '/api/v1/expert/awareness-sessions'
    ]
  }
};

/**
 * Special route paths
 */
export const SPECIAL_ROUTES = {
  ADMIN_LOGIN: '/admin/login',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  COMPLETE_PROFILE: '/complete-profile',
  PENDING_APPROVAL: '/pending-approval',
  ADMIN_DASHBOARD: '/admin/dashboard',
  USER_DASHBOARD: '/dashboard',
  EXPERT_DASHBOARD: '/expert/dashboard',
  TRAINER_DASHBOARD: '/trainer/dashboard',
  TRAINER_RESOURCES: '/trainer/resources'
} as const;

/**
 * Check if a path matches any of the given route patterns
 */
export function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    // Handle wildcard routes (ending with *)
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1));
    }

    // Exact match or starts with route + /
    return pathname === route || pathname.startsWith(route + '/');
  });
}

/**
 * Route checking utilities
 */
export const RouteChecker = {
  isPublic: (pathname: string): boolean => {
    return matchesRoute(pathname, ROUTE_CONFIG.public);
  },

  isProtected: (pathname: string): boolean => {
    return matchesRoute(pathname, ROUTE_CONFIG.protected) ||
      RouteChecker.isAdmin(pathname) ||
      RouteChecker.isRoleSpecific(pathname) ||
      (pathname.startsWith('/api/') && !RouteChecker.isPublic(pathname));
  },

  isAdmin: (pathname: string): boolean => {
    return matchesRoute(pathname, ROUTE_CONFIG.admin);
  },

  requiresEmailVerification: (pathname: string): boolean => {
    return matchesRoute(pathname, ROUTE_CONFIG.emailVerificationRequired);
  },

  isRoleSpecific: (pathname: string): boolean => {
    return matchesRoute(pathname, ROUTE_CONFIG.roleSpecific.customer) ||
      matchesRoute(pathname, ROUTE_CONFIG.roleSpecific.expert);
  },

  getRequiredRole: (pathname: string): 'customer' | 'expert' | null => {
    if (matchesRoute(pathname, ROUTE_CONFIG.roleSpecific.customer)) {
      return 'customer';
    }
    if (matchesRoute(pathname, ROUTE_CONFIG.roleSpecific.expert)) {
      return 'expert';
    }
    return null;
  },

  isApiRoute: (pathname: string): boolean => {
    return pathname.startsWith('/api/');
  },

  isStaticFile: (pathname: string): boolean => {
    return pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/_next/') ||
      (pathname.includes('.') && !pathname.startsWith('/api/'));
  }
};

/**
 * Get appropriate redirect URL based on user role and context
 */
export function getRedirectUrl(
  userRole: 'customer' | 'expert' | 'trainer' | 'admin' | undefined,
  context: 'login' | 'unauthorized' | 'email_verification' = 'login'
): string {
  switch (context) {
    case 'login':
      if (userRole === 'admin') {
        return SPECIAL_ROUTES.ADMIN_DASHBOARD;
      }
      // Trainers and experts go to expert dashboard
      if (userRole === 'trainer' || userRole === 'expert') {
        return SPECIAL_ROUTES.EXPERT_DASHBOARD;
      }
      return SPECIAL_ROUTES.USER_DASHBOARD;

    case 'unauthorized':
      if (userRole === 'admin') {
        return SPECIAL_ROUTES.ADMIN_LOGIN;
      }
      return SPECIAL_ROUTES.LOGIN;

    case 'email_verification':
      return SPECIAL_ROUTES.VERIFY_EMAIL;

    default:
      return SPECIAL_ROUTES.LOGIN;
  }
}

/**
 * Get appropriate redirect URL based on user profile completion status
 */
export function getProfileRedirectUrl(
  userRole: 'customer' | 'expert' | 'trainer' | 'admin',
  isProfileCompleted: boolean,
  isApproved: boolean
): string {
  // Admin users bypass profile completion flow
  if (userRole === 'admin') {
    return SPECIAL_ROUTES.ADMIN_DASHBOARD;
  }

  // If profile is not completed, redirect to profile completion
  if (!isProfileCompleted) {
    return SPECIAL_ROUTES.COMPLETE_PROFILE;
  }

  // If role is customer and profile is completed, go to dashboard
  if (userRole === 'customer') {
    return SPECIAL_ROUTES.USER_DASHBOARD;
  }

  // If role is expert or trainer and profile is completed
  if (userRole === 'expert' || userRole === 'trainer') {
    // If approved, go to expert dashboard (trainers use expert dashboard too)
    if (isApproved) {
      return SPECIAL_ROUTES.EXPERT_DASHBOARD;
    }
    // If not approved, wait for approval
    return SPECIAL_ROUTES.PENDING_APPROVAL;
  }

  // Fallback
  return SPECIAL_ROUTES.USER_DASHBOARD;
}
