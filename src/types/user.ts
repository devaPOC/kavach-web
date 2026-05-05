export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isBanned: boolean; // For experts
  isPaused: boolean; // For customers
  isLocked: boolean; // Account locked due to security issues
  isTrainer: boolean; // Trainer status
  bannedAt?: Date;
  pausedAt?: Date;
  isProfileCompleted: boolean;
  isApproved: boolean;
  approvedAt?: Date;
  lockedAt?: Date;
  lockReason?: string;
  promotedToTrainerAt?: Date;
  promotedToTrainerBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API version with string dates for frontend consumption
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isBanned: boolean;
  isPaused: boolean;
  isLocked: boolean;
  isTrainer: boolean;
  bannedAt?: string;
  pausedAt?: string;
  isProfileCompleted: boolean;
  isApproved: boolean;
  approvedAt?: string;
  lockedAt?: string;
  lockReason?: string;
  promotedToTrainerAt?: string;
  promotedToTrainerBy?: string;
  createdAt: string;
  updatedAt: string;
}
