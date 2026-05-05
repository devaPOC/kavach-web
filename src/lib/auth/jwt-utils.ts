import { SignJWT, jwtVerify } from 'jose';
import { isJtiRevokedAsync } from './revocation-store';
import { z } from 'zod';

// Edge/runtime-safe JTI generator (uses Web Crypto API)
function generateJti(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  // Convert to UUID v4 format manually
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// JWT payload schema
export const jwtPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['customer', 'expert', 'trainer', 'admin']),
  isEmailVerified: z.boolean(),
  isProfileCompleted: z.boolean().optional(),
  isApproved: z.boolean().optional(),
  tokenType: z.enum(['access', 'refresh']).optional(),
  jti: z.string().uuid().optional(),
  iat: z.number().optional(),
  exp: z.number().optional()
});

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // 7 days for regular tokens
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // 30 days for refresh tokens

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'tokenType' | 'jti'>): Promise<string> {
  const enriched = {
    ...payload,
    tokenType: 'access' as const,
    jti: generateJti(),
    isProfileCompleted: payload.isProfileCompleted ?? false,
    isApproved: payload.isApproved ?? false
  };
  const token = await new SignJWT(enriched)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret);

  return token;
}

export async function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'tokenType' | 'jti'>): Promise<string> {
  const enriched = {
    ...payload,
    tokenType: 'refresh' as const,
    jti: generateJti(),
    isProfileCompleted: payload.isProfileCompleted ?? false,
    isApproved: payload.isApproved ?? false
  };
  const token = await new SignJWT(enriched)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRES_IN)
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    // Validate the payload structure
    const validatedPayload = jwtPayloadSchema.parse(payload);
    // Use async revocation check for token validation
    if (await isJtiRevokedAsync(validatedPayload.jti)) return null;
    return validatedPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}


/**
 * Extract token from Authorization header
 * Utility function for API routes
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Check if token is expired
 * Utility function for token validation
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) {
    return false; // No expiration time means token doesn't expire
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTime; // Use <= instead of < to be more precise
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpirationTime(payload: JWTPayload): number | null {
  if (!payload.exp) {
    return null;
  }

  return payload.exp * 1000; // Convert to milliseconds
}

/**
 * Check if token should be renewed soon
 * Returns true if token expires within the renewal threshold
 */
export function shouldRenewToken(payload: JWTPayload, thresholdMs: number = 2 * 24 * 60 * 60 * 1000): boolean {
  if (!payload.exp) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const timeLeft = (payload.exp - now) * 1000;

  return timeLeft > 0 && timeLeft <= thresholdMs;
}

/**
 * Get time until token expires in milliseconds
 */
export function getTimeUntilExpiry(payload: JWTPayload): number | null {
  if (!payload.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const timeLeft = (payload.exp - now) * 1000;

  return Math.max(0, timeLeft);
}

export async function generateEmailVerificationToken(userId: string, email: string): Promise<string> {
  const payload = {
    userId,
    email,
    type: 'email_verification'
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // 1 hour expiration for email verification
    .sign(secret);

  return token;
}

/**
 * Verify email verification token
 */
export async function verifyEmailVerificationToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== 'email_verification') {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string
    };
  } catch (error) {
    console.error('Email verification token verification failed:', error);
    return null;
  }
}
