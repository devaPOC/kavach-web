import { NextRequest, NextResponse } from 'next/server';
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  type JWTPayload,
  isTokenExpired,
  shouldRenewToken
} from './jwt-utils';
import { sessionRepository } from '../database/repositories/session-repository';
import { revokeJti } from './revocation-store';
import { logger } from '../utils/logger';

// Session configuration constants
const SESSION_COOKIE_NAME = 'auth-session';
const REFRESH_COOKIE_NAME = 'auth-refresh';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const REFRESH_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const RENEWAL_THRESHOLD = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds - renew when less than 2 days left

export interface SessionData {
  userId: string;
  email: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
}

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  user: SessionData;
  expiresAt: Date;
}

export interface SessionValidation {
  isValid: boolean;
  session: SessionData | null;
  needsRefresh: boolean;
  error?: string;
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

/**
 * Unified Session Manager
 * Handles all session operations with consistent security and lifecycle management
 */
export class SessionManager {
  private static instance: SessionManager;

  private constructor() { }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Get secure cookie options based on environment
   */
  private getSecureCookieOptions(maxAge?: number): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: maxAge || SESSION_DURATION / 1000,
      path: '/'
    };
  }

  /**
   * Create a new session with access and refresh tokens
   */
  async createSession(sessionData: SessionData): Promise<SessionResult> {
    try {
      // Generate tokens
      const accessToken = await generateToken(sessionData);
      const refreshToken = await generateRefreshToken(sessionData);

      // Calculate expiration
      const expiresAt = new Date(Date.now() + SESSION_DURATION);

      // Persist refresh token in database for revocation tracking
      try {
        const refreshPayload = await verifyToken(refreshToken);
        if (refreshPayload?.exp && refreshPayload.jti) {
          await sessionRepository.create({
            userId: sessionData.userId,
            token: refreshToken,
            tokenType: 'refresh',
            jti: refreshPayload.jti,
            expiresAt: new Date(refreshPayload.exp * 1000)
          });
        }
      } catch (error) {
        logger.error('Failed to persist refresh session', { error, userId: sessionData.userId });
        // Don't fail session creation if persistence fails
      }

      logger.info('Session created successfully', { userId: sessionData.userId });

      return {
        accessToken,
        refreshToken,
        user: sessionData,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to create session', { error, userId: sessionData.userId });
      throw new Error('Session creation failed');
    }
  }

  /**
   * Validate session token and return session data
   */
  async validateSession(token: string): Promise<SessionValidation> {
    try {
      const payload = await verifyToken(token);

      if (!payload) {
        return {
          isValid: false,
          session: null,
          needsRefresh: false,
          error: 'Invalid token'
        };
      }

      // Ensure token type is access
      if (payload.tokenType && payload.tokenType !== 'access') {
        return {
          isValid: false,
          session: null,
          needsRefresh: false,
          error: 'Invalid token type'
        };
      }

      // Check if token needs refresh (within renewal threshold)
      const needsRefresh = this.shouldRenewToken(payload);

      const sessionData: SessionData = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        isEmailVerified: payload.isEmailVerified,
        isProfileCompleted: payload.isProfileCompleted ?? false,
        isApproved: payload.isApproved ?? false
      };

      return {
        isValid: true,
        session: sessionData,
        needsRefresh
      };
    } catch (error) {
      logger.error('Session validation failed', { error });
      return {
        isValid: false,
        session: null,
        needsRefresh: false,
        error: 'Token verification failed'
      };
    }
  }

  /**
   * Refresh session using refresh token
   */
  async refreshSession(refreshToken: string): Promise<SessionResult | null> {
    try {
      const payload = await verifyToken(refreshToken);

      if (!payload || payload.tokenType !== 'refresh') {
        return null;
      }

      // Revoke old refresh token
      try {
        if (payload.jti) {
          revokeJti(payload.jti);
        }
        await sessionRepository.deleteByToken(refreshToken);
      } catch (error) {
        logger.error('Failed to revoke old refresh token', { error });
      }

      // Create new session
      const sessionData: SessionData = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        isEmailVerified: payload.isEmailVerified,
        isProfileCompleted: payload.isProfileCompleted ?? false,
        isApproved: payload.isApproved ?? false
      };

      const newSession = await this.createSession(sessionData);

      logger.info('Session refreshed successfully', { userId: sessionData.userId });

      return newSession;
    } catch (error) {
      logger.error('Failed to refresh session', { error });
      return null;
    }
  }

  /**
   * Invalidate session and cleanup tokens
   */
  async invalidateSession(userId: string): Promise<void> {
    try {
      // Delete all refresh tokens for user
      await sessionRepository.deleteByUserId(userId);

      logger.info('Session invalidated successfully', { userId });
    } catch (error) {
      logger.error('Failed to invalidate session', { error, userId });
      throw new Error('Session invalidation failed');
    }
  }

  /**
   * Update session data and issue new tokens
   */
  async updateSessionData(userId: string, updates: Partial<SessionData>): Promise<SessionResult | null> {
    try {
      // Get current session data (this would need to be retrieved from somewhere)
      // For now, we'll require the full session data to be passed
      throw new Error('updateSessionData requires current session data - use createSession instead');
    } catch (error) {
      logger.error('Failed to update session data', { error, userId });
      return null;
    }
  }

  /**
   * Check if token should be renewed based on expiration time
   */
  private shouldRenewToken(payload: JWTPayload): boolean {
    // Use the centralized utility function
    return shouldRenewToken(payload, RENEWAL_THRESHOLD);
  }
}

/**
 * Cookie Manager
 * Handles consistent cookie operations across the application
 */
export class CookieManager {
  private static instance: CookieManager;

  private constructor() { }

  public static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  /**
   * Get secure cookie options
   */
  private getSecureCookieOptions(maxAge?: number): CookieOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: maxAge || SESSION_DURATION / 1000,
      path: '/'
    };
  }

  /**
   * Set authentication cookies in response
   */
  setAuthCookies(response: NextResponse, session: SessionResult): void {
    const sessionOptions = this.getSecureCookieOptions();
    const refreshOptions = this.getSecureCookieOptions(REFRESH_DURATION / 1000);

    response.cookies.set(SESSION_COOKIE_NAME, session.accessToken, sessionOptions);
    response.cookies.set(REFRESH_COOKIE_NAME, session.refreshToken, refreshOptions);
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(response: NextResponse): void {
    const options = this.getSecureCookieOptions();

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...options,
      maxAge: 0
    });

    response.cookies.set(REFRESH_COOKIE_NAME, '', {
      ...options,
      maxAge: 0
    });
  }

  /**
   * Get session data from request cookies
   */
  async getSessionFromCookies(request: NextRequest): Promise<SessionData | null> {
    try {
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

      if (!sessionCookie?.value) {
        return null;
      }

      const sessionManager = SessionManager.getInstance();
      const validation = await sessionManager.validateSession(sessionCookie.value);

      return validation.isValid ? validation.session : null;
    } catch (error) {
      logger.error('Failed to get session from cookies', { error });
      return null;
    }
  }

  /**
   * Get refresh token from request cookies
   */
  getRefreshTokenFromCookies(request: NextRequest): string | null {
    const refreshCookie = request.cookies.get(REFRESH_COOKIE_NAME);
    return refreshCookie?.value || null;
  }

  /**
   * Check if session needs renewal and handle it
   */
  async handleSessionRenewal(request: NextRequest, response: NextResponse): Promise<NextResponse> {
    try {
      const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

      if (!sessionCookie?.value) {
        return response;
      }

      const sessionManager = SessionManager.getInstance();
      const validation = await sessionManager.validateSession(sessionCookie.value);

      if (!validation.isValid) {
        this.clearAuthCookies(response);
        return response;
      }

      if (validation.needsRefresh && validation.session) {
        // Create new session with updated data
        const newSession = await sessionManager.createSession(validation.session);
        this.setAuthCookies(response, newSession);
      }

      return response;
    } catch (error) {
      logger.error('Failed to handle session renewal', { error });
      this.clearAuthCookies(response);
      return response;
    }
  }
}

// Export singleton instances
export const sessionManager = SessionManager.getInstance();
export const cookieManager = CookieManager.getInstance();
