import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { userService } from '@/lib/services/user/user.service';

/**
 * User controller handling user-related endpoints
 */
export class UserController extends BaseController {
  /**
   * Get user profile
   */
  async getProfile(request: NextRequest, userId?: string): Promise<NextResponse> {
    try {
      // If no userId provided, extract from session
      let targetUserId = userId;
      if (!targetUserId) {
        const session = await this.validateSession(request);
        if (!session.success) {
          return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
        }
        targetUserId = session.userId;
      }

      const result = await userService.getProfile(targetUserId!);

      if (!result.success) {
        return this.error(result.error, result.code, 404);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(request: NextRequest, userId?: string): Promise<NextResponse> {
    try {
      // If no userId provided, extract from session
      let targetUserId = userId;
      if (!targetUserId) {
        const session = await this.validateSession(request);
        if (!session.success) {
          return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
        }
        targetUserId = session.userId;
      }

      const body = await this.parseBody<{
        firstName?: string;
        lastName?: string;
      }>(request);

      if (!body || Object.keys(body).length === 0) {
        return this.error('No update data provided', undefined, 400);
      }

      const result = await userService.updateProfile(targetUserId!, body);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Change user password
   */
  async changePassword(request: NextRequest, userId?: string): Promise<NextResponse> {
    try {
      // If no userId provided, extract from session
      let targetUserId = userId;
      if (!targetUserId) {
        const session = await this.validateSession(request);
        if (!session.success) {
          return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
        }
        targetUserId = session.userId;
      }

      const body = await this.parseBody<{
        currentPassword: string;
        newPassword: string;
      }>(request);

      const validation = this.validateRequired(body, ['currentPassword', 'newPassword']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      const result = await userService.changePassword(targetUserId!, body!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to change user password:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const result = await userService.deleteAccount(userId);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to delete user account:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }
}

// Export singleton instance
export const userController = new UserController();
