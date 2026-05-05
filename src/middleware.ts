import { NextRequest, NextResponse } from 'next/server';
import { RouteChecker, SPECIAL_ROUTES, getRedirectUrl, getProfileRedirectUrl } from './lib/auth/route-config';
import { rateLimiters, getRateLimitHeaders, createRateLimitErrorResponse } from './lib/auth/rate-limiter';
import { sessionValidationMiddleware } from './lib/auth/session-validation-middleware';
import { addSecurityHeaders } from './lib/auth/middleware-utils';
import {
  getMiddlewareConfig,
  getRouteProtection,
  meetsRouteRequirements,
  ProtectionLevel
} from './lib/auth/middleware-config';
import { logger } from './lib/utils/logger';
import {
  isPreflightRequest,
  handleOptionsRequest,
  applyCorsHeaders,
  isApiRoute
} from './lib/middleware/cors-middleware';

// Request correlation tracking
const REQUEST_ID_HEADER = 'x-request-id';
const CORRELATION_ID_HEADER = 'x-correlation-id';

// Redirect loop prevention
const MAX_REDIRECTS = 3;
const REDIRECT_HISTORY_HEADER = 'x-redirect-count';

/**
 * Create redirect response with enhanced loop prevention and correlation tracking
 */
function createRedirect(request: NextRequest, path: string, requestId: string): NextResponse {
  // Check current redirect count to prevent loops
  const redirectCount = parseInt(request.headers.get(REDIRECT_HISTORY_HEADER) || '0', 10);

  // Prevent redirect loops by checking if we're already at the target path
  if (request.nextUrl.pathname === path) {
    logger.warn('Redirect loop prevented - same path', {
      currentPath: request.nextUrl.pathname,
      targetPath: path,
      requestId,
      redirectCount
    });
    return NextResponse.next();
  }

  // Prevent excessive redirects
  if (redirectCount >= MAX_REDIRECTS) {
    logger.warn('Redirect loop prevented - max redirects exceeded', {
      currentPath: request.nextUrl.pathname,
      targetPath: path,
      requestId,
      redirectCount
    });
    // Return to login as fallback
    const fallbackUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(fallbackUrl);
    addCorrelationHeaders(response, requestId, redirectCount + 1);
    return response;
  }

  const url = new URL(path, request.url);
  const response = NextResponse.redirect(url);
  addCorrelationHeaders(response, requestId, redirectCount + 1);

  logger.info('Redirect created', {
    from: request.nextUrl.pathname,
    to: path,
    requestId,
    redirectCount: redirectCount + 1
  });

  return response;
}

/**
 * Add correlation headers to response for request tracking
 */
function addCorrelationHeaders(response: NextResponse, requestId: string, redirectCount?: number): void {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  response.headers.set(CORRELATION_ID_HEADER, requestId);
  response.headers.set('x-timestamp', new Date().toISOString());

  if (redirectCount !== undefined) {
    response.headers.set(REDIRECT_HISTORY_HEADER, redirectCount.toString());
  }
}

/**
 * Create standardized error response for API routes with enhanced correlation
 */
function createApiErrorResponse(
  message: string,
  code: string,
  status: number,
  requestId: string,
  retryAfter?: number
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
      requestId
    },
    { status }
  );

  addCorrelationHeaders(response, requestId);

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

/**
 * Create rate limit exceeded response with enhanced headers
 */
function createRateLimitResponse(
  result: any,
  requestId: string
): NextResponse {
  const errorData = createRateLimitErrorResponse(result);
  const response = createApiErrorResponse(
    errorData.message,
    errorData.error,
    429,
    requestId,
    errorData.retryAfter
  );

  // Add standardized rate limit headers
  const headers = getRateLimitHeaders(result);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}


export async function middleware(request: NextRequest) {
  const config = getMiddlewareConfig();

  // Generate unique request ID for correlation tracking
  const requestId = sessionValidationMiddleware.createRequestContext(request).requestId;
  const { pathname } = request.nextUrl;

  // Enhanced request logging with correlation
  if (config.logging.logRequests) {
    logger.info('Middleware processing request', {
      path: pathname,
      method: request.method,
      requestId,
      userAgent: request.headers.get('user-agent'),
      clientIP: request.headers.get('x-forwarded-for') || 'unknown',
      redirectCount: request.headers.get(REDIRECT_HISTORY_HEADER) || '0'
    });
  }

  // Skip middleware for static files and Next.js internals
  if (RouteChecker.isStaticFile(pathname)) {
    const response = NextResponse.next();
    addCorrelationHeaders(response, requestId);
    return response;
  }

  // Handle CORS preflight requests for API routes
  if (isApiRoute(pathname) && isPreflightRequest(request)) {
    logger.info('CORS preflight request', { pathname, requestId });
    return handleOptionsRequest(request);
  }

  // Apply unified rate limiting if enabled
  if (config.rateLimiting.enabled) {
    const rateLimitResult = await applyUnifiedRateLimit(request, pathname, requestId, config);
    if (rateLimitResult) {
      // Apply CORS headers to rate limit responses for API routes
      if (isApiRoute(pathname)) {
        applyCorsHeaders(rateLimitResult, request);
      }
      return addSecurityHeaders(rateLimitResult);
    }
  }

  // Process unified session validation and renewal
  const sessionResult = await processUnifiedSession(request, requestId);
  const { response, session, isValid } = sessionResult;

  // Extract user state for route protection
  const userState = extractUserState(session, isValid);

  // Apply enhanced route protection
  const routeAccess = evaluateRouteAccess(pathname, userState);

  // Handle route access denial
  if (!routeAccess.allowed) {
    const deniedResponse = handleRouteAccessDenied(
      request,
      pathname,
      routeAccess,
      requestId,
      config
    );
    // Apply CORS headers to denied responses for API routes
    if (isApiRoute(pathname)) {
      applyCorsHeaders(deniedResponse, request);
    }
    return addSecurityHeaders(deniedResponse);
  }

  // Handle authenticated user redirects with loop prevention
  const redirectResult = handleAuthenticatedRedirects(
    request,
    pathname,
    userState,
    requestId
  );

  if (redirectResult) {
    return addSecurityHeaders(redirectResult);
  }

  // Apply CORS headers to API route responses
  if (isApiRoute(pathname)) {
    applyCorsHeaders(response, request);
  }

  // Add correlation headers and security headers to final response
  addCorrelationHeaders(response, requestId);
  return addSecurityHeaders(response);
}

/**
 * User state interface for route protection
 */
interface UserState {
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
  userRole?: string;
  session?: any;
}

/**
 * Route access evaluation result
 */
interface RouteAccessResult {
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
  statusCode?: number;
}

/**
 * Apply unified rate limiting with consistent logic
 */
async function applyUnifiedRateLimit(
  request: NextRequest,
  pathname: string,
  requestId: string,
  config: any
): Promise<NextResponse | null> {
  // Check if path requires rate limiting
  const shouldRateLimit = config.rateLimiting.endpoints.some((endpoint: string) =>
    pathname.startsWith(endpoint)
  );

  if (!shouldRateLimit) {
    return null;
  }

  // Unified rate limiter selection with fallback
  const rateLimiter = selectRateLimiter(pathname);

  if (!rateLimiter) {
    // Log unexpected path that should be rate limited but has no limiter
    logger.warn('No rate limiter found for path', { pathname, requestId });
    return null;
  }

  const result = rateLimiter(request);

  if (!result.success) {
    // Enhanced security logging
    if (config.logging.logSecurity) {
      logger.warn('Rate limit exceeded', {
        pathname,
        requestId,
        clientIP: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        blocked: result.blocked,
        retryAfter: result.retryAfter,
        remaining: result.remaining,
        resetTime: result.resetTime
      });
    }

    return createRateLimitResponse(result, requestId);
  }

  // Log successful rate limit check in debug mode
  if (config.logging.logLevel === 'debug') {
    logger.info('Rate limit check passed', {
      pathname,
      requestId,
      remaining: result.remaining,
      resetTime: result.resetTime
    });
  }

  return null;
}

/**
 * Select appropriate rate limiter based on pathname
 */
function selectRateLimiter(pathname: string): ((req: NextRequest) => any) | null {
  // Import awareness lab rate limiters
  const { AwarenessLabRateLimiter } = require('./lib/security/awareness-lab-middleware');

  // Admin endpoints get stricter rate limiting
  if (pathname.includes('/admin/login')) {
    return rateLimiters.adminLogin;
  }

  // Awareness Lab endpoints
  if (pathname.includes('/api/v1/quizzes') && pathname.includes('/attempts') && pathname.includes('/submit')) {
    return (req: NextRequest) => AwarenessLabRateLimiter.checkQuizSubmissionLimit(req);
  }

  if (pathname.includes('/api/v1/quizzes') && pathname.includes('/attempts')) {
    return (req: NextRequest) => AwarenessLabRateLimiter.checkQuizAttemptLimit(req);
  }

  if (pathname.includes('/api/v1/admin/quizzes') && pathname.includes('POST')) {
    return (req: NextRequest) => AwarenessLabRateLimiter.checkAdminQuizCreationLimit(req);
  }

  if (pathname.includes('/api/v1/learning-modules')) {
    return (req: NextRequest) => AwarenessLabRateLimiter.checkLearningMaterialLimit(req);
  }

  // Authentication endpoints
  if (pathname.includes('/login')) {
    return rateLimiters.login;
  }

  if (pathname.includes('/signup')) {
    return rateLimiters.signup;
  }

  if (pathname.includes('/verify-email')) {
    return rateLimiters.emailVerification;
  }

  if (pathname.includes('/resend-verification')) {
    return rateLimiters.resendVerification;
  }

  if (pathname.includes('/refresh')) {
    return rateLimiters.login; // Use login rate limiter for refresh
  }

  return null;
}

/**
 * Process unified session validation and renewal
 */
async function processUnifiedSession(
  request: NextRequest,
  requestId: string
): Promise<{
  response: NextResponse;
  session: any;
  isValid: boolean;
}> {
  const initialResponse = NextResponse.next();

  try {
    const sessionResult = await sessionValidationMiddleware.processSessionMiddleware(
      request,
      initialResponse,
      requestId
    );

    return sessionResult;
  } catch (error) {
    logger.error('Unified session processing failed', { error, requestId });

    // Return safe defaults on error
    return {
      response: initialResponse,
      session: null,
      isValid: false
    };
  }
}

/**
 * Extract user state from session for route protection
 */
function extractUserState(session: any, isValid: boolean): UserState {
  if (!isValid || !session) {
    return {
      isAuthenticated: false,
      isEmailVerified: false,
      isProfileCompleted: false,
      isApproved: false
    };
  }

  return {
    isAuthenticated: true,
    isEmailVerified: sessionValidationMiddleware.isEmailVerified(session),
    isProfileCompleted: sessionValidationMiddleware.isProfileCompleted(session),
    isApproved: sessionValidationMiddleware.isApproved(session),
    userRole: session.role,
    session
  };
}

/**
 * Evaluate route access with simplified logic
 */
function evaluateRouteAccess(pathname: string, userState: UserState): RouteAccessResult {
  // Use existing route requirements logic but with cleaner interface
  const routeRequirements = meetsRouteRequirements(
    pathname,
    userState.userRole,
    userState.isAuthenticated,
    userState.isEmailVerified,
    userState.isProfileCompleted,
    userState.isApproved
  );

  return {
    allowed: routeRequirements.allowed,
    reason: routeRequirements.reason,
    redirectTo: routeRequirements.redirectTo,
    statusCode: determineStatusCode(routeRequirements.reason)
  };
}

/**
 * Determine appropriate HTTP status code based on access denial reason
 */
function determineStatusCode(reason?: string): number {
  if (!reason) return 403;

  if (reason.includes('Authentication')) return 401;
  if (reason.includes('Admin')) return 403;
  if (reason.includes('Email')) return 403;
  if (reason.includes('Profile')) return 403;
  if (reason.includes('approval')) return 403;

  return 403;
}

/**
 * Handle route access denied scenarios with enhanced error handling
 */
function handleRouteAccessDenied(
  request: NextRequest,
  pathname: string,
  routeAccess: RouteAccessResult,
  requestId: string,
  config: any
): NextResponse {
  const isApiRoute = RouteChecker.isApiRoute(pathname);

  // Enhanced security logging
  if (config.logging.logSecurity) {
    logger.warn('Route access denied', {
      pathname,
      requestId,
      reason: routeAccess.reason,
      redirectTo: routeAccess.redirectTo,
      statusCode: routeAccess.statusCode,
      isApiRoute,
      clientIP: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent')
    });
  }

  if (isApiRoute) {
    // Return standardized API error response
    const errorCode = mapReasonToErrorCode(routeAccess.reason);

    return createApiErrorResponse(
      routeAccess.reason || 'Access denied',
      errorCode,
      routeAccess.statusCode || 403,
      requestId
    );
  }

  // Handle page redirects with enhanced logic
  if (routeAccess.redirectTo) {
    return handlePageRedirect(request, pathname, routeAccess.redirectTo, requestId, config);
  }

  // Fallback to login with correlation tracking
  return createRedirect(request, '/login', requestId);
}

/**
 * Map access denial reason to standardized error code
 */
function mapReasonToErrorCode(reason?: string): string {
  if (!reason) return 'ACCESS_DENIED';

  if (reason.includes('Authentication')) return 'AUTHENTICATION_REQUIRED';
  if (reason.includes('Admin')) return 'ADMIN_ACCESS_REQUIRED';
  if (reason.includes('Email')) return 'EMAIL_VERIFICATION_REQUIRED';
  if (reason.includes('Profile')) return 'PROFILE_COMPLETION_REQUIRED';
  if (reason.includes('approval')) return 'ACCOUNT_APPROVAL_REQUIRED';

  return 'ACCESS_DENIED';
}

/**
 * Handle page redirects with query preservation and loop prevention
 */
function handlePageRedirect(
  request: NextRequest,
  pathname: string,
  redirectTo: string,
  requestId: string,
  config: any
): NextResponse {
  // Preserve original destination for login redirects
  if (redirectTo === '/login' && config.redirects.preserveQuery) {
    const loginUrl = new URL(redirectTo, request.url);

    // Only preserve redirect parameter if it's not already a login page
    if (pathname !== '/login' && pathname !== '/signup') {
      loginUrl.searchParams.set('redirect', pathname);
    }

    const redirectResponse = NextResponse.redirect(loginUrl);
    addCorrelationHeaders(redirectResponse, requestId);
    return redirectResponse;
  }

  return createRedirect(request, redirectTo, requestId);
}

/**
 * Handle authenticated user redirects with enhanced loop prevention
 */
function handleAuthenticatedRedirects(
  request: NextRequest,
  pathname: string,
  userState: UserState,
  requestId: string
): NextResponse | null {
  if (!userState.isAuthenticated || !userState.session) {
    return null;
  }

  const { userRole } = userState;
  const { isProfileCompleted, isApproved } = userState;

  // Check for redirect loops before processing
  const redirectCount = parseInt(request.headers.get(REDIRECT_HISTORY_HEADER) || '0', 10);
  if (redirectCount >= MAX_REDIRECTS) {
    logger.warn('Skipping redirect due to max redirects reached', {
      pathname,
      requestId,
      redirectCount,
      userRole
    });
    return null;
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage(pathname)) {
    const redirectUrl = getProfileRedirectUrl(userRole as any, isProfileCompleted, isApproved);
    return createRedirect(request, redirectUrl, requestId);
  }

  // Redirect authenticated admin users away from admin login
  if (pathname === SPECIAL_ROUTES.ADMIN_LOGIN && userRole === 'admin') {
    return createRedirect(request, SPECIAL_ROUTES.ADMIN_DASHBOARD, requestId);
  }

  // Redirect experts and trainers from general dashboard to expert dashboard
  if (pathname === SPECIAL_ROUTES.USER_DASHBOARD && (userRole === 'expert' || userRole === 'trainer') && isApproved) {
    return createRedirect(request, SPECIAL_ROUTES.EXPERT_DASHBOARD, requestId);
  }



  // Handle profile completion flow with enhanced edge case handling
  if (userRole && userRole !== 'admin') {
    const profileRedirect = handleProfileFlowRedirects(
      pathname,
      userRole,
      isProfileCompleted,
      isApproved,
      request,
      requestId
    );

    if (profileRedirect) {
      return profileRedirect;
    }
  }

  return null;
}

/**
 * Check if pathname is an authentication page
 */
function isAuthPage(pathname: string): boolean {
  return pathname === SPECIAL_ROUTES.LOGIN ||
    pathname === SPECIAL_ROUTES.SIGNUP;
}

/**
 * Handle profile completion flow redirects with edge case prevention
 */
function handleProfileFlowRedirects(
  pathname: string,
  userRole: string,
  isProfileCompleted: boolean,
  isApproved: boolean,
  request: NextRequest,
  requestId: string
): NextResponse | null {
  // Redirect from complete-profile if already completed
  if (pathname === SPECIAL_ROUTES.COMPLETE_PROFILE && isProfileCompleted) {
    console.log(`[MIDDLEWARE DEBUG] Complete-profile redirect logic:`, {
      userRole,
      isApproved,
      isProfileCompleted,
      pathname
    });

    if ((userRole === 'expert' || userRole === 'trainer') && !isApproved) {
      console.log(`[MIDDLEWARE DEBUG] Redirecting unapproved expert/trainer to pending-approval`);
      return createRedirect(request, SPECIAL_ROUTES.PENDING_APPROVAL, requestId);
    }
    if ((userRole === 'expert' || userRole === 'trainer') && isApproved) {
      console.log(`[MIDDLEWARE DEBUG] Redirecting approved expert/trainer to expert dashboard`);
      return createRedirect(request, SPECIAL_ROUTES.EXPERT_DASHBOARD, requestId);
    }
    console.log(`[MIDDLEWARE DEBUG] Redirecting customer to dashboard`);
    return createRedirect(request, '/dashboard', requestId);
  }

  // Handle pending-approval page access with role validation
  if (pathname === SPECIAL_ROUTES.PENDING_APPROVAL) {
    // Only experts and trainers should access pending approval page
    if (userRole !== 'expert' && userRole !== 'trainer') {
      return createRedirect(request, '/dashboard', requestId);
    }

    // If expert/trainer is already approved, redirect to expert dashboard
    if (isApproved) {
      return createRedirect(request, SPECIAL_ROUTES.EXPERT_DASHBOARD, requestId);
    }

    // If expert/trainer hasn't completed profile, redirect to complete profile
    if (!isProfileCompleted) {
      return createRedirect(request, SPECIAL_ROUTES.COMPLETE_PROFILE, requestId);
    }
  }

  // Handle dashboard access for incomplete profiles
  if (pathname === '/dashboard' && !isProfileCompleted) {
    return createRedirect(request, SPECIAL_ROUTES.COMPLETE_PROFILE, requestId);
  }

  return null;
}



/**
 * Middleware configuration
 * Specify which routes should run the middleware
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
