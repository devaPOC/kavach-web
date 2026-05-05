import type { User } from '@/types/user';
import type {
  SignupData as ValidationSignupData,
  LoginData as ValidationLoginData,
  EmailVerificationData
} from '../../validation/schemas';

// Re-export validation types for consistency
export type SignupData = ValidationSignupData;
export type LoginData = ValidationLoginData;
export type VerifyEmailData = EmailVerificationData;

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

export interface SignupResult {
  user: Omit<User, 'passwordHash'>;
  requiresVerification: boolean;
}

export interface VerifyEmailResult {
  message: string;
}

export interface LogoutResult {
  message: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}

// Request context interfaces
export interface RequestContext {
  correlationId: string;
  clientIP: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuthenticatedContext extends RequestContext {
  session: {
    userId: string;
    email: string;
    role: 'customer' | 'expert' | 'trainer' | 'admin';
    isEmailVerified: boolean;
    isProfileCompleted: boolean;
    isApproved: boolean;
  };
}
