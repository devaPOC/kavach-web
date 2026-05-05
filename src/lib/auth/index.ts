// Password utilities
export {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateSecurePassword,
  passwordSchema,
  PasswordStrength,
  type PasswordValidationResult
} from './password-utils';

// JWT utilities
export {
  generateToken,
  generateRefreshToken,
  verifyToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpirationTime,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  jwtPayloadSchema,
  type JWTPayload
} from './jwt-utils';
export { AUTH_ERROR_CODES, type AuthErrorCode } from './error-codes';

// Legacy session management (deprecated - use unified session management)
export {
  createSession,
  getSession,
  destroySession,
  updateSession,
  isAuthenticated,
  hasRole,
  isEmailVerified,
  getSessionFromRequest,
  setSessionCookie,
  clearSessionCookie,
  validateSessionMiddleware,
  type SessionData as LegacySessionData,
  type CookieOptions
} from './session-manager';

// Unified session management (recommended)
export {
  SessionManager,
  CookieManager,
  sessionManager,
  cookieManager,
  type SessionData,
  type SessionResult,
  type SessionValidation
} from './unified-session-manager';

export {
  SessionValidationMiddleware,
  sessionValidationMiddleware,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createSessionRequiredResponse,
  createEmailVerificationRequiredResponse,
  createProfileCompletionRequiredResponse,
  type RequestContext,
  type AuthenticatedContext,
  type SessionValidationResult
} from './session-validation-middleware';

export {
  getCurrentSession,
  createSessionWithCookies,
  updateCurrentSession,
  destroyCurrentSession,
  validateApiRequest,
  requireAuth,
  requireRole,
  requireEmailVerification,
  requireProfileCompletion,
  processSessionInMiddleware,
  getSessionFromRequest as getSessionFromRequestUnified,
  setSessionCookies,
  clearSessionCookies,
  handleSessionRenewal
} from './session-helpers';

// Rate limiting
export {
  checkRateLimit,
  createRateLimitMiddleware,
  rateLimiters,
  resetRateLimit,
  getRateLimitHeaders,
  createRateLimitErrorResponse,
  RATE_LIMIT_CONFIGS,
  type RateLimitResult
} from './rate-limiter';

// Route configuration
export {
  ROUTE_CONFIG,
  SPECIAL_ROUTES,
  RouteChecker,
  getRedirectUrl,
  matchesRoute,
  type RouteConfig
} from './route-config';

// Route protection
export {
  checkRouteAccess,
  validateAwarenessSessionAccess,
  getDashboardUrl,
  getAwarenessSessionUrl,
  type RouteProtectionResult,
  type UserSession
} from './route-protection';

// Middleware utilities
export {
  addSecurityHeaders,
  getClientIP
} from './middleware-utils';

// API middleware
export {
  withAuth,
  withRole,
  withAdmin,
  withEmailVerification,
  withRateLimit,
  apiMiddleware,
  apiErrors,
  apiSuccess,
  type AuthenticatedRequest
} from './api-middleware';
