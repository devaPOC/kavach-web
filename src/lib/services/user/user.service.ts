import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { userRepository } from '../../database/repositories/user-repository';
import { hashPassword } from '../../auth/password-utils';
import { AUTH_ERROR_CODES } from '../../auth/error-codes';
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User service handling user profile and account management
 */
export class UserService extends BaseService {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<ServiceResult<UserProfile>> {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      return serviceSuccess({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted || false,
        isApproved: user.isApproved || false,
        approvedAt: user.approvedAt || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'UserService.getProfile');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<ServiceResult<UserProfile>> {
    try {
      // Validate that user exists
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Update user
      const updatedUser = await userRepository.update(userId, {
        firstName: data.firstName,
        lastName: data.lastName
      });

      if (!updatedUser) {
        return serviceError('Failed to update profile.', AUTH_ERROR_CODES.UNKNOWN);
      }

      this.audit({
        event: 'auth.signup.success', // Using existing event types
        userId: updatedUser.id,
        email: updatedUser.email
      });

      return serviceSuccess({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        isProfileCompleted: updatedUser.isProfileCompleted || false,
        isApproved: updatedUser.isApproved || false,
        approvedAt: updatedUser.approvedAt || null,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'UserService.updateProfile');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: ChangePasswordData): Promise<ServiceResult<{ message: string }>> {
    try {
      // Get user with current password
      const user = await userRepository.findById(userId);
      if (!user) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Verify current password
      const { verifyPassword } = await import('../../auth/password-utils');
      const isValidPassword = await verifyPassword(data.currentPassword, user.passwordHash);
      if (!isValidPassword) {
        this.audit({
          event: 'auth.login.failed',
          userId: user.id,
          email: user.email,
          errorCode: AUTH_ERROR_CODES.INVALID_CREDENTIALS
        });
        return serviceError('Current password is incorrect.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Hash new password
      const newPasswordHash = await hashPassword(data.newPassword);

      // Update password
      const updatedUser = await userRepository.update(userId, {
        passwordHash: newPasswordHash
      });

      if (!updatedUser) {
        return serviceError('Failed to update password.', AUTH_ERROR_CODES.UNKNOWN);
      }

      this.audit({
        event: 'auth.login.success', // Using existing event types for password change
        userId: updatedUser.id,
        email: updatedUser.email
      });

      return serviceSuccess({ message: 'Password changed successfully.' });

    } catch (error) {
      return this.handleError(error, 'UserService.changePassword');
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Verify user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Delete user (this should cascade to related records)
      const deleted = await userRepository.delete(userId);
      if (!deleted) {
        return serviceError('Failed to delete account.', AUTH_ERROR_CODES.UNKNOWN);
      }

      this.audit({
        event: 'auth.logout', // Using existing event types for account deletion
        userId: user.id,
        email: user.email
      });

      return serviceSuccess({ message: 'Account deleted successfully.' });

    } catch (error) {
      return this.handleError(error, 'UserService.deleteAccount');
    }
  }

  /**
   * Get user by email (admin function)
   */
  async getUserByEmail(email: string, requestingUserId: string): Promise<ServiceResult<UserProfile>> {
    try {
      // Verify requesting user is admin
      const requestingUser = await userRepository.findById(requestingUserId);
      if (!requestingUser || requestingUser.role !== 'admin') {
        return serviceError('Access denied.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      const user = await userRepository.findByEmail(email);
      if (!user) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      return serviceSuccess({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted || false,
        isApproved: user.isApproved || false,
        approvedAt: user.approvedAt || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'UserService.getUserByEmail');
    }
  }
}

// Export singleton instance
export const userService = new UserService();
