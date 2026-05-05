export interface LoginCredentials {
  email: string;
  password: string;
  role?: 'customer' | 'expert';
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'customer' | 'expert';
  agreedToTerms: boolean;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  tokenType?: 'access' | 'refresh';
  jti?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface EmailVerification {
  id: string;
  userId: string;
  token: string;
  type: 'magic_link';
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}
