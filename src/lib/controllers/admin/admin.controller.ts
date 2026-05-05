import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from '../auth/auth.controller';
import { adminService } from '@/lib/services/admin/admin.service';
import { awarenessSessionService } from '@/lib/services/awareness-session.service';
import { logger } from '@/infrastructure/logging/logger';
import { cookieManager, type SessionResult } from '@/lib/auth/unified-session-manager';


/**
 * Admin controller handling administrative endpoints
 */
export class AdminController extends BaseController {
  /**
   * Create a new user (admin only)
   */
  async createUser(request: NextRequest, adminUserId?: string): Promise<NextResponse> {
    try {
      // If no adminUserId provided, extract from session and verify admin role
      let targetAdminUserId = adminUserId;
      if (!targetAdminUserId) {
        const session = await this.validateSession(request);
        if (!session.success) {
          return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
        }
        if (session.role !== 'admin') {
          return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
        }
        targetAdminUserId = session.userId;
      }

      const body = await this.parseBody<{
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        role: 'customer' | 'expert' | 'admin';
      }>(request);

      const validation = this.validateRequired(body, ['email', 'firstName', 'lastName', 'password', 'role']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      const result = await adminService.createUser(body!, targetAdminUserId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data, undefined, 201);
    } catch (error: any | Error) {
      logger.error('Failed to create user:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Update user (admin only)
   */
  async updateUser(request: NextRequest, userId: string, adminUserId: string): Promise<NextResponse> {
    try {
      const body = await this.parseBody<{
        firstName?: string;
        lastName?: string;
        role?: 'customer' | 'expert' | 'admin';
        isEmailVerified?: boolean;
      }>(request);

      if (!body || Object.keys(body).length === 0) {
        return this.error('No update data provided', undefined, 400);
      }

      const result = await adminService.updateUser(userId, body, adminUserId);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to update user:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Delete user (admin only) with reason and email notification
   */
  async deleteUser(request: NextRequest, userId: string, adminUserId: string): Promise<NextResponse> {
    try {
      // Parse request body to get deletion reason
      const body = await this.parseBody<{
        reason?: string;
      }>(request);

      const deletionReason = body?.reason;

      const result = await adminService.deleteUser(userId, adminUserId, deletionReason);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to delete user:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get user details (admin only)
   */
  async getUser(request: NextRequest, userId: string, adminUserId: string): Promise<NextResponse> {
    try {
      const result = await adminService.getUser(userId, adminUserId);

      if (!result.success) {
        logger.error('Failed to get user details:', (result as any | Error).error);
        return this.error(result.error, result.code, 404);
      }

      return this.success(result.data);
    } catch (error: any | Error) {
      logger.error('Failed to get user details:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Invalidate all user sessions (admin only)
   */
  async invalidateUserSessions(request: NextRequest, userId: string, adminUserId: string): Promise<NextResponse> {
    try {
      const result = await adminService.invalidateUserSessions(userId, adminUserId);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      logger.error('Failed to invalidate user sessions:', (error as any | Error).message);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Force verify user email (admin only)
   */
  async verifyUserEmail(request: NextRequest, userId: string, adminUserId: string): Promise<NextResponse> {
    try {
      const result = await adminService.verifyUserEmail(userId, adminUserId);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to verify user email:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get admin statistics (admin only)
   */
  async getAdminStats(request: NextRequest, adminUserId: string): Promise<NextResponse> {
    try {
      const result = await adminService.getAdminStats(adminUserId);

      if (!result.success) {
        return this.error(result.error, result.code, 403);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get admin statistics:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get sales statistics for admin dashboard (admin only)
   */
  async getSalesStats(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.getSalesStats(session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get sales statistics:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Admin login
   */
  async login(request: NextRequest): Promise<NextResponse> {
    try {
      const body = await this.parseBody<{
        email: string;
        password: string;
      }>(request);

      const validation = this.validateRequired(body, ['email', 'password']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      const context = this.createRequestContext(request);

      // Import AdminAuthService
      const { adminAuthService } = await import('@/lib/services/admin/admin-auth.service');

      console.log('Admin login attempt:', { email: body!.email, clientIP: context.clientIP });

      // Use AdminAuthService which authenticates against admins table
      const result = await adminAuthService.login(body!.email, body!.password, context);

      console.log('Login result:', {
        success: result.success,
        error: !result.success ? result.error : null
      });

      if (!result.success || !result.admin) {
        return this.error(result.error || 'Login failed', undefined, 401);
      }

      // Create response first
      const response = this.success({
        message: 'Admin login successful',
        user: {
          id: result.admin.id,
          email: result.admin.email,
          firstName: result.admin.firstName,
          lastName: result.admin.lastName,
          role: result.admin.role,
          isEmailVerified: true,
          isProfileCompleted: true,
          isApproved: true,
        }
      });

      // Use unified cookie manager to ensure consistency with middleware/session validation
      const sessionResult: SessionResult = {
        accessToken: result.accessToken!,
        refreshToken: result.refreshToken || result.accessToken!, // Use refreshToken if available
        user: {
          userId: result.admin.id,
          email: result.admin.email,
          role: result.admin.role as 'admin',
          isEmailVerified: true,
          isProfileCompleted: true,
          isApproved: true
        },
        // Align with unified session duration (7 days) so renewal logic works uniformly
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      cookieManager.setAuthCookies(response, sessionResult);

      logger.info('Admin login successful, unified auth cookies set', {
        email: result.admin.email,
        userId: result.admin.id
      });

      return response;
    } catch (error) {
      console.error('Failed to login:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Get pagination and filter parameters from query
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const role = searchParams.get('role') as 'customer' | 'expert' | 'admin' | null;
      const approvedParam = searchParams.get('approved');
      const approved = approvedParam === 'true' ? true : approvedParam === 'false' ? false : undefined;
      const verifiedParam = searchParams.get('verified');
      const verified = verifiedParam === 'true' ? true : verifiedParam === 'false' ? false : undefined;
      const lockedParam = searchParams.get('locked');
      const locked = lockedParam === 'true' ? true : lockedParam === 'false' ? false : undefined;
      const bannedParam = searchParams.get('banned');
      const banned = bannedParam === 'true' ? true : bannedParam === 'false' ? false : undefined;
      const pausedParam = searchParams.get('paused');
      const paused = pausedParam === 'true' ? true : pausedParam === 'false' ? false : undefined;
      const search = searchParams.get('search') || undefined;
      const startDateStr = searchParams.get('startDate');
      const endDateStr = searchParams.get('endDate');

      const result = await adminService.getUsers(session.userId!, page, limit, {
        role: role || undefined,
        approved,
        verified,
        locked,
        banned,
        paused,
        search,
        createdFrom: startDateStr ? new Date(startDateStr) : undefined,
        createdTo: endDateStr ? new Date(endDateStr) : undefined,
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get users:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get global user counts (admin only)
   */
  async getUserCounts(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.getUserCounts(session.userId!);
      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }
      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get user counts:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get user by ID (admin only) - session-based variant
   */
  async getUserById(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.getUser(userId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 404);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Update user (admin only) - session-based variant
   */
  async updateUserById(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        firstName?: string;
        lastName?: string;
        role?: 'customer' | 'expert' | 'admin';
        isEmailVerified?: boolean;
      }>(request);

      if (!body || Object.keys(body).length === 0) {
        return this.error('No update data provided', undefined, 400);
      }

      const result = await adminService.updateUser(userId, body, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to update user:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Delete user (admin only) - session-based variant with reason and email notification
   */
  async deleteUserById(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse request body to get deletion reason
      const body = await this.parseBody<{
        reason?: string;
      }>(request);

      const deletionReason = body?.reason;

      const result = await adminService.deleteUser(userId, session.userId!, deletionReason);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to delete user:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Ban expert (admin only)
   */
  async banExpert(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.banExpert(userId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to ban expert:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Unban expert (admin only)
   */
  async unbanExpert(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.unbanExpert(userId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to unban expert:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Pause customer (admin only)
   */
  async pauseCustomer(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.pauseCustomer(userId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to pause customer:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Unpause customer (admin only)
   */
  async unpauseCustomer(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.unpauseCustomer(userId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to unpause customer:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get user profile (admin only)
   */
  async getUserProfile(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.getUserProfile(userId);

      if (!result.success) {
        return this.error(result.error, result.code, result.code === 'USER_NOT_FOUND' ? 404 : 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Approve expert profile (admin only)
   */
  async approveExpert(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.approveExpert(userId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to approve expert:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Reject expert profile (admin only)
   */
  async rejectExpert(request: NextRequest, userId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse request body to get rejection reason (optional)
      const body = await this.parseBody<{
        reason?: string;
      }>(request);

      const rejectionReason = body?.reason;

      const result = await adminService.rejectExpert(userId, session.userId!, rejectionReason);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to reject expert:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get all service requests (admin only)
   */
  async getServiceRequests(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Parse query parameters for filtering and pagination
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const priority = url.searchParams.get('priority');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');

      const result = await adminService.getServiceRequests({
        status: status as any,
        priority: priority as any,
        page,
        limit
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get service requests:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Assign expert to service request (admin only)
   */
  async assignExpertToServiceRequest(request: NextRequest, requestId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        expertId: string;
      }>(request);

      const validation = this.validateRequired(body, ['expertId']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      const result = await adminService.assignExpertToServiceRequest(
        requestId,
        body!.expertId,
        session.userId!
      );

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to assign expert to service request:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Update service request status (admin only)
   */
  async updateServiceRequestStatus(request: NextRequest, requestId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        status: string;
        notes?: string;
      }>(request);

      const validation = this.validateRequired(body, ['status']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      const result = await adminService.updateServiceRequestStatus(
        requestId,
        body!.status,
        body!.notes,
        session.userId!
      );

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data, 'Service request status updated successfully');
    } catch (error) {
      console.error('Failed to update service request status:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Delete service request (admin only)
   */
  async deleteServiceRequest(request: NextRequest, requestId: string): Promise<NextResponse> {
    try {
      console.log('Controller: deleteServiceRequest called with requestId:', requestId);

      const session = await this.validateSession(request);
      console.log('Controller: Session validation result:', { success: session.success, role: session.role, userId: session.userId });

      if (!session.success) {
        console.log('Controller: Session validation failed');
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        console.log('Controller: User is not admin, role:', session.role);
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      console.log('Controller: Calling adminService.deleteServiceRequest');

      const result = await adminService.deleteServiceRequest(
        requestId,
        session.userId!
      );

      console.log('Controller: Service result:', {
        success: result.success,
        error: !result.success ? result.error : null,
        code: !result.success ? result.code : null
      });

      if (!result.success) {
        console.log('Controller: Service failed, returning error');
        return this.error(result.error, result.code, 400);
      }

      console.log('Controller: Service succeeded, returning success');
      return this.success(result.data, result.data.message);
    } catch (error) {
      console.error('Failed to delete service request:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get list of experts (admin only)
   */
  async getExpertList(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.getExpertList();

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get expert list:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get awareness session requests for admin dashboard
   */
  async getAwarenessSessionRequests(request: NextRequest): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      // Get pagination and filter parameters from query
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const status = searchParams.get('status') as 'pending_admin_review' | 'forwarded_to_expert' | 'confirmed' | 'rejected' | 'expert_declined' | null;
      const search = searchParams.get('search') || undefined;
      const startDateStr = searchParams.get('startDate');
      const endDateStr = searchParams.get('endDate');
      const sessionMode = searchParams.get('sessionMode') as 'on_site' | 'online' | null;

      const result = await awarenessSessionService.getRequestsForAdmin(page, limit, status || undefined, {
        search,
        startDate: startDateStr ? new Date(startDateStr) : undefined,
        endDate: endDateStr ? new Date(endDateStr) : undefined,
        sessionMode: sessionMode || undefined,
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      logger.error('Failed to get awareness session requests for admin:', { error });
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Review awareness session request (approve/reject)
   */
  async reviewAwarenessSessionRequest(request: NextRequest, requestId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        action: 'approve' | 'reject';
        notes?: string;
        expertId?: string;
      }>(request);

      const validation = this.validateRequired(body, ['action']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      // Additional validation for approve action
      if (body!.action === 'approve' && !body!.expertId) {
        return this.error('Expert ID is required when approving a request', undefined, 400);
      }

      // Additional validation for reject action
      if (body!.action === 'reject' && !body!.notes) {
        return this.error('Notes are required when rejecting a request', undefined, 400);
      }

      const result = await awarenessSessionService.adminReview(requestId, session.userId!, body!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      logger.error('Failed to review awareness session request:', { error });
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Assign expert to awareness session request
   */
  async assignExpertToAwarenessSession(request: NextRequest, requestId: string): Promise<NextResponse> {
    try {
      // Extract from session and verify admin role
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        expertId: string;
        notes?: string;
      }>(request);

      const validation = this.validateRequired(body, ['expertId']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      const result = await awarenessSessionService.assignExpert(
        requestId,
        body!.expertId,
        session.userId!,
        body!.notes
      );

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      logger.error('Failed to assign expert to awareness session:', { error });
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get all quotes with filtering (admin only)
   */
  async getQuotes(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const status = searchParams.get('status');
      const customerId = searchParams.get('customerId');
      const serviceRequestId = searchParams.get('serviceRequestId');

      const result = await adminService.getQuotes({
        page,
        limit,
        status: status as any,
        customerId: customerId || undefined,
        serviceRequestId: serviceRequestId || undefined
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get quotes:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Create a new quote (admin only)
   */
  async createQuote(request: NextRequest): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        serviceRequestId: string;
        quotedPrice: number;
        description?: string;
        validUntil?: string;
      }>(request);

      const validation = this.validateRequired(body, ['serviceRequestId', 'quotedPrice']);
      if (!validation.isValid) {
        return this.error(`Missing required fields: ${validation.missingFields?.join(', ')}`, undefined, 400);
      }

      const result = await adminService.createQuote({
        serviceRequestId: body!.serviceRequestId,
        quotedPrice: body!.quotedPrice,
        description: body!.description,
        validUntil: body!.validUntil,
        adminId: session.userId!
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data, 'Quote created successfully', 201);
    } catch (error) {
      console.error('Failed to create quote:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Get quote by ID (admin only)
   */
  async getQuoteById(request: NextRequest, quoteId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.getQuoteById(quoteId);

      if (!result.success) {
        return this.error(result.error, result.code, result.code === 'QUOTE_NOT_FOUND' ? 404 : 400);
      }

      return this.success(result.data);
    } catch (error) {
      console.error('Failed to get quote:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Update/revise quote (admin only)
   */
  async updateQuote(request: NextRequest, quoteId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const body = await this.parseBody<{
        quotedPrice?: number;
        description?: string;
        validUntil?: string;
      }>(request);

      if (!body || Object.keys(body).length === 0) {
        return this.error('No update data provided', undefined, 400);
      }

      const result = await adminService.updateQuote(quoteId, {
        quotedPrice: body.quotedPrice,
        description: body.description,
        validUntil: body.validUntil,
        adminId: session.userId!
      });

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data, 'Quote updated successfully');
    } catch (error) {
      console.error('Failed to update quote:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }

  /**
   * Delete quote (admin only)
   */
  async deleteQuote(request: NextRequest, quoteId: string): Promise<NextResponse> {
    try {
      const session = await this.validateSession(request);
      if (!session.success) {
        return this.error('Authentication required', 'AUTHENTICATION_REQUIRED', 401);
      }
      if (session.role !== 'admin') {
        return this.error('Admin access required', 'ADMIN_ACCESS_REQUIRED', 403);
      }

      const result = await adminService.deleteQuote(quoteId, session.userId!);

      if (!result.success) {
        return this.error(result.error, result.code, 400);
      }

      return this.success(result.data, 'Quote deleted successfully');
    } catch (error) {
      console.error('Failed to delete quote:', error);
      return this.error('Internal server error', undefined, 500);
    }
  }


}

// Export singleton instance
export const adminController = new AdminController();
