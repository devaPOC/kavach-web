import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { userRepository } from '../../database/repositories/user-repository';
import { sessionRepository } from '../../database/repositories/session-repository';
import { emailVerificationRepository } from '../../database/repositories/email-verification-repository';
import { emailService } from '@/lib/email';
import { ArchiveService } from '@/lib/services/archive.service';
import { hashPassword } from '../../auth/password-utils';
import { AUTH_ERROR_CODES } from '../../auth/error-codes';
import { db } from '../../database';
import { serviceData } from '../../database/schema/service-data';
import { users } from '../../database/schema/users';
import { eq, and, or, desc, count, gte, lte, sql, isNull } from 'drizzle-orm';
import type { User } from '@/types/user';
import { getServiceNameByType } from '../../utils/service-mapping';

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified?: boolean;
  isBanned?: boolean;
  isPaused?: boolean;
  isTrainer?: boolean;
  promotedToTrainerAt?: Date;
  promotedToTrainerBy?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'expert' | 'trainer' | 'admin';
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  isApproved: boolean;
  isBanned: boolean;
  isPaused: boolean;
  isLocked: boolean;
  bannedAt?: Date;
  pausedAt?: Date;
  lockedAt?: Date;
  lockReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  totalCustomers: number;
  totalExperts: number;
  totalAdmins: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  activeSessions: number;
}

export interface ServiceRequestItem {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  assignedExpertId?: string;
  expertName?: string;
  expertEmail?: string;
  serviceType?: string;
  status: string;
  priority?: string;
  title?: string;
  description?: string;
  assignedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetServiceRequestsOptions {
  status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
  page: number;
  limit: number;
}

export interface GetUsersOptions {
  role?: 'customer' | 'expert' | 'trainer' | 'admin';
  approved?: boolean;
  verified?: boolean;
  locked?: boolean;
  banned?: boolean;
  paused?: boolean;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export interface ServiceRequestsResponse {
  requests: ServiceRequestItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserCounts {
  totalUsers: number;
  locked: number;
  banned: number;
  paused: number;
  pendingApprovalExperts: number;
  verified: number;
}

/**
 * Admin service handling administrative operations
 */
export class AdminService extends BaseService {

  /**
   * Verify admin access - checks both admins table (new) and users table (legacy)
   */
  private async verifyAdminAccess(adminUserId: string): Promise<User | null> {
    // First, try to find admin in the dedicated admins table
    const { admins } = await import('../../database/schema/admins');
    const [adminFromAdminsTable] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, adminUserId))
      .limit(1);

    if (adminFromAdminsTable && adminFromAdminsTable.isActive && !adminFromAdminsTable.deletedAt) {
      // Return a User-like object for compatibility
      return {
        id: adminFromAdminsTable.id,
        email: adminFromAdminsTable.email,
        firstName: adminFromAdminsTable.firstName,
        lastName: adminFromAdminsTable.lastName,
        role: 'admin' as const,
        isEmailVerified: true,
        isProfileCompleted: true,
        isApproved: true,
        isBanned: false,
        isPaused: false,
        isLocked: false,
        createdAt: adminFromAdminsTable.createdAt,
        updatedAt: adminFromAdminsTable.updatedAt,
      } as User;
    }

    // Fall back to users table for legacy support
    const admin = await userRepository.findById(adminUserId);
    if (!admin || admin.role !== 'admin') {
      return null;
    }
    return admin;
  }

  /**
   * Get global user counts for admin tiles
   */
  async getUserCounts(adminUserId: string): Promise<ServiceResult<AdminUserCounts>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId)
      if (!admin) {
        return serviceError('Admin access required', 'ADMIN_ACCESS_REQUIRED')
      }

      const [row] = await db
        .select({
          totalUsers: count(),
          locked: sql<number>`SUM(CASE WHEN ${users.isLocked} THEN 1 ELSE 0 END)`,
          banned: sql<number>`SUM(CASE WHEN ${users.isBanned} THEN 1 ELSE 0 END)`,
          paused: sql<number>`SUM(CASE WHEN ${users.isPaused} THEN 1 ELSE 0 END)`,
          pendingApprovalExperts: sql<number>`SUM(CASE WHEN ${users.role} = 'expert' AND NOT ${users.isApproved} THEN 1 ELSE 0 END)`,
          verified: sql<number>`SUM(CASE WHEN ${users.isEmailVerified} THEN 1 ELSE 0 END)`,
        })
        .from(users)
        .where(isNull(users.deletedAt))

      return serviceSuccess({
        totalUsers: Number(row?.totalUsers || 0),
        locked: Number((row as any)?.locked || 0),
        banned: Number((row as any)?.banned || 0),
        paused: Number((row as any)?.paused || 0),
        pendingApprovalExperts: Number((row as any)?.pendingApprovalExperts || 0),
        verified: Number((row as any)?.verified || 0),
      })
    } catch (error) {
      return this.handleError(error, 'AdminService.getUserCounts')
    }
  }

  /**
   * Create a new user (admin function)
   */
  async createUser(data: CreateUserData, adminUserId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser) {
        return serviceError('User with this email already exists.', AUTH_ERROR_CODES.EMAIL_EXISTS);
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await userRepository.create({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        role: data.role
      });

      this.audit({
        event: 'auth.signup.success',
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return serviceSuccess({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted || false,
        isApproved: user.isApproved || false,
        isBanned: user.isBanned || false,
        isPaused: user.isPaused || false,
        isLocked: user.isLocked || false,
        bannedAt: user.bannedAt,
        pausedAt: user.pausedAt,
        lockedAt: user.lockedAt,
        lockReason: user.lockReason,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.createUser');
    }
  }

  /**
   * Update user (admin function)
   */
  async updateUser(userId: string, data: UpdateUserData, adminUserId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Update user
      const updatedUser = await userRepository.update(userId, data);
      if (!updatedUser) {
        return serviceError('Failed to update user.', AUTH_ERROR_CODES.UNKNOWN);
      }

      this.audit({
        event: 'auth.login.success', // Using existing event for user updates
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
        isBanned: updatedUser.isBanned || false,
        isPaused: updatedUser.isPaused || false,
        isLocked: updatedUser.isLocked || false,
        bannedAt: updatedUser.bannedAt,
        pausedAt: updatedUser.pausedAt,
        lockedAt: updatedUser.lockedAt,
        lockReason: updatedUser.lockReason,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.updateUser');
    }
  }

  /**
   * Delete user (admin function) with email notification
   */
  async deleteUser(userId: string, adminUserId: string, reason?: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Prevent admin from deleting themselves
      if (userId === adminUserId) {
        return serviceError('Cannot delete your own account.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Store user data for email notification before deletion
      const userEmail = targetUser.email;
      const userFirstName = targetUser.firstName;
      const userLastName = targetUser.lastName;
      const deletionReason = reason || 'No specific reason provided by the administrator.';
      const deletedAt = new Date();

      // Archive user's incomplete service requests before deletion
      try {
        const archivedCount = await ArchiveService.archiveUserServiceRequests(userId);
        console.log(`Archived ${archivedCount} service requests for user ${userId}`);
      } catch (archiveError) {
        console.error('Failed to archive user service requests:', archiveError);
        // Don't fail deletion due to archive error, but log it
      }

      // Additional cleanup steps to handle any remaining references
      try {
        console.log(`Starting cleanup for user ${userId}`);
        // Clean up any remaining references that might not be handled by cascade deletes
        await this.cleanupUserReferences(userId);
        console.log(`Cleanup completed for user ${userId}`);
      } catch (cleanupError) {
        console.error('Failed to cleanup user references:', cleanupError);
        // Continue with deletion attempt
      }

      // Soft delete user
      console.log(`Attempting to soft delete user ${userId}`);
      const [deleted] = await db
        .update(users)
        .set({
          deletedAt: new Date(),
          deletedBy: adminUserId,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!deleted) {
        console.error(`User deletion returned false for user ${userId}`);
        return serviceError('Failed to delete user.', AUTH_ERROR_CODES.UNKNOWN);
      }
      console.log(`Successfully soft deleted user ${userId}`);

      // Send deletion notification email
      try {
        const emailResult = await emailService.sendUserDeletionEmail({
          to: userEmail,
          firstName: userFirstName,
          lastName: userLastName,
          reason: deletionReason,
          deletedAt: deletedAt
        });

        if (!emailResult.success) {
          // Log email error but don't fail the deletion
          console.error('Failed to send deletion notification email:', emailResult.error);
          // Continue with success response since user was deleted successfully
        }
      } catch (emailError) {
        // Log email error but don't fail the deletion
        console.error('Failed to send deletion notification email:', emailError);
        // Continue with success response since user was deleted successfully
      }

      this.audit({
        event: 'auth.logout', // Using existing event for user deletion
        userId: targetUser.id,
        email: targetUser.email,
        metadata: {
          action: 'deleted',
          reason: deletionReason,
          adminUserId,
          deletedAt: deletedAt.toISOString()
        }
      });

      return serviceSuccess({
        message: 'User deleted successfully.'
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.deleteUser');
    }
  }

  /**
   * Get user by ID (admin function)
   */
  async getUser(userId: string, adminUserId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

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
        isBanned: user.isBanned || false,
        isPaused: user.isPaused || false,
        isLocked: user.isLocked || false,
        bannedAt: user.bannedAt,
        pausedAt: user.pausedAt,
        lockedAt: user.lockedAt,
        lockReason: user.lockReason,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.getUser');
    }
  }

  /**
   * Invalidate all user sessions (admin function)
   */
  async invalidateUserSessions(userId: string, adminUserId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Delete all sessions for the user
      await sessionRepository.deleteByUserId(userId);

      this.audit({
        event: 'auth.logout',
        userId: targetUser.id,
        email: targetUser.email
      });

      return serviceSuccess({ message: 'All user sessions invalidated successfully.' });

    } catch (error) {
      return this.handleError(error, 'AdminService.invalidateUserSessions');
    }
  }

  /**
   * Force verify user email (admin function)
   */
  async verifyUserEmail(userId: string, adminUserId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (targetUser.isEmailVerified) {
        return serviceError('User email is already verified.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      // Verify email
      await userRepository.verifyEmail(userId);

      // Clean up any pending verification tokens
      await emailVerificationRepository.deleteByUserId(userId);

      this.audit({
        event: 'auth.email.verify.success',
        userId: targetUser.id,
        email: targetUser.email
      });

      return serviceSuccess({ message: 'User email verified successfully.' });

    } catch (error) {
      return this.handleError(error, 'AdminService.verifyUserEmail');
    }
  }

  /**
   * Get basic admin statistics
   */
  async getAdminStats(adminUserId: string): Promise<ServiceResult<AdminStats>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // This is a simplified version - in a real app, you'd have proper aggregation queries
      // For now, we'll return basic stats structure
      const stats: AdminStats = {
        totalUsers: 0,
        totalCustomers: 0,
        totalExperts: 0,
        totalAdmins: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0,
        activeSessions: 0
      };

      return serviceSuccess(stats);

    } catch (error) {
      return this.handleError(error, 'AdminService.getAdminStats');
    }
  }

  /**
   * Get sales statistics for admin dashboard
   */
  async getSalesStats(adminUserId: string): Promise<ServiceResult<{
    totalRevenue: number;
    monthlyRevenue: number;
    totalOrders: number;
    monthlyOrders: number;
    averageOrderValue: number;
    topServices: Array<{
      serviceType: string;
      count: number;
      revenue: number;
    }>;
    revenueByMonth: Array<{
      month: string;
      revenue: number;
      orders: number;
    }>;
  }>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Get service data statistics
      const [totalServiceRequests] = await db
        .select({ count: count() })
        .from(serviceData);

      const [completedServiceRequests] = await db
        .select({ count: count() })
        .from(serviceData)
        .where(eq(serviceData.status, 'completed'));

      // For now, return mock sales data since payment system isn't implemented yet
      // This should be replaced with actual payment/sales data when available
      const mockSalesStats = {
        totalRevenue: completedServiceRequests.count * 150, // Mock: $150 per completed service
        monthlyRevenue: Math.floor(completedServiceRequests.count * 150 * 0.3), // Mock: 30% of total
        totalOrders: completedServiceRequests.count,
        monthlyOrders: Math.floor(completedServiceRequests.count * 0.3),
        averageOrderValue: completedServiceRequests.count > 0 ? 150 : 0,
        topServices: [
          {
            serviceType: 'Consultation',
            count: Math.floor(completedServiceRequests.count * 0.4),
            revenue: Math.floor(completedServiceRequests.count * 0.4 * 150)
          },
          {
            serviceType: 'Analysis',
            count: Math.floor(completedServiceRequests.count * 0.3),
            revenue: Math.floor(completedServiceRequests.count * 0.3 * 150)
          },
          {
            serviceType: 'Training',
            count: Math.floor(completedServiceRequests.count * 0.3),
            revenue: Math.floor(completedServiceRequests.count * 0.3 * 150)
          }
        ],
        revenueByMonth: [
          {
            month: '2024-01',
            revenue: Math.floor(completedServiceRequests.count * 150 * 0.1),
            orders: Math.floor(completedServiceRequests.count * 0.1)
          },
          {
            month: '2024-02',
            revenue: Math.floor(completedServiceRequests.count * 150 * 0.15),
            orders: Math.floor(completedServiceRequests.count * 0.15)
          },
          {
            month: '2024-03',
            revenue: Math.floor(completedServiceRequests.count * 150 * 0.2),
            orders: Math.floor(completedServiceRequests.count * 0.2)
          }
        ]
      };

      return serviceSuccess(mockSalesStats);

    } catch (error) {
      return this.handleError(error, 'AdminService.getSalesStats');
    }
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(
    adminUserId: string,
    page: number = 1,
    limit: number = 20,
    options: GetUsersOptions = {}
  ): Promise<ServiceResult<{ users: UserListItem[], total: number, page: number, limit: number }>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Admin access required', 'ADMIN_ACCESS_REQUIRED');
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Build filter conditions
      const conditions: any[] = [];
      conditions.push(isNull(users.deletedAt));
      if (options.role) {
        conditions.push(eq(users.role, options.role));
      }
      if (typeof options.approved === 'boolean') {
        conditions.push(eq(users.isApproved, options.approved));
      }
      if (typeof options.verified === 'boolean') {
        conditions.push(eq(users.isEmailVerified, options.verified));
      }
      if (typeof options.locked === 'boolean') {
        conditions.push(eq(users.isLocked, options.locked));
      }
      if (typeof options.banned === 'boolean') {
        conditions.push(eq(users.isBanned, options.banned));
      }
      if (typeof options.paused === 'boolean') {
        conditions.push(eq(users.isPaused, options.paused));
      }
      if (options.search && options.search.trim()) {
        const term = `%${options.search.trim()}%`;
        conditions.push(
          sql`(${users.email} ILIKE ${term} OR ${users.firstName} ILIKE ${term} OR ${users.lastName} ILIKE ${term} OR ${users.role} ILIKE ${term})`
        );
      }
      if (options.createdFrom) {
        conditions.push(gte(users.createdAt, options.createdFrom));
      }
      if (options.createdTo) {
        conditions.push(lte(users.createdAt, options.createdTo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get users with pagination and filtering
      const userResults = await db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);

      const total = totalResult.count;

      const userList: UserListItem[] = userResults.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted || false,
        isApproved: user.isApproved || false,
        isBanned: user.isBanned || false,
        isPaused: user.isPaused || false,
        isLocked: user.isLocked || false,
        bannedAt: user.bannedAt || undefined,
        pausedAt: user.pausedAt || undefined,
        lockedAt: user.lockedAt || undefined,
        lockReason: user.lockReason || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      this.audit({
        event: 'auth.login.success', // Using existing event for admin actions
        adminUserId,
        success: true,
        metadata: { page, limit, total }
      });

      return serviceSuccess({
        users: userList,
        total,
        page,
        limit
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.getUsers');
    }
  }

  /**
   * Ban expert user (admin only)
   */
  async banExpert(userId: string, adminUserId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists and is an expert
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (targetUser.role !== 'expert') {
        return serviceError('Only experts can be banned.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      if (targetUser.isBanned) {
        return serviceError('Expert is already banned.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      // Ban the expert
      const updatedUser = await userRepository.update(userId, {
        isBanned: true,
        bannedAt: new Date()
      });

      if (!updatedUser) {
        return serviceError('Failed to ban expert.', AUTH_ERROR_CODES.UNKNOWN);
      }

      // Invalidate all sessions for the banned user
      await sessionRepository.deleteByUserId(userId);

      this.audit({
        event: 'auth.logout', // Using existing event for user ban
        userId: updatedUser.id,
        email: updatedUser.email,
        metadata: { action: 'banned', adminUserId }
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
        isBanned: updatedUser.isBanned || false,
        isPaused: updatedUser.isPaused || false,
        isLocked: updatedUser.isLocked || false,
        bannedAt: updatedUser.bannedAt,
        pausedAt: updatedUser.pausedAt,
        lockedAt: updatedUser.lockedAt,
        lockReason: updatedUser.lockReason,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.banExpert');
    }
  }

  /**
   * Unban expert user (admin only)
   */
  async unbanExpert(userId: string, adminUserId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists and is an expert
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (targetUser.role !== 'expert') {
        return serviceError('Only experts can be unbanned.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      if (!targetUser.isBanned) {
        return serviceError('Expert is not currently banned.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      // Unban the expert
      const updatedUser = await userRepository.update(userId, {
        isBanned: false,
        bannedAt: null
      });

      if (!updatedUser) {
        return serviceError('Failed to unban expert.', AUTH_ERROR_CODES.UNKNOWN);
      }

      this.audit({
        event: 'auth.login.success', // Using existing event for user unban
        userId: updatedUser.id,
        email: updatedUser.email,
        metadata: { action: 'unbanned', adminUserId }
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
        isBanned: updatedUser.isBanned || false,
        isPaused: updatedUser.isPaused || false,
        isLocked: updatedUser.isLocked || false,
        bannedAt: updatedUser.bannedAt,
        pausedAt: updatedUser.pausedAt,
        lockedAt: updatedUser.lockedAt,
        lockReason: updatedUser.lockReason,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.unbanExpert');
    }
  }

  /**
   * Pause customer user (admin only)
   */
  async pauseCustomer(userId: string, adminUserId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists and is a customer
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (targetUser.role !== 'customer') {
        return serviceError('Only customers can be paused.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      if (targetUser.isPaused) {
        return serviceError('Customer is already paused.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      // Pause the customer
      const updatedUser = await userRepository.update(userId, {
        isPaused: true,
        pausedAt: new Date()
      });

      if (!updatedUser) {
        return serviceError('Failed to pause customer.', AUTH_ERROR_CODES.UNKNOWN);
      }

      // Invalidate all sessions for the paused user
      await sessionRepository.deleteByUserId(userId);

      this.audit({
        event: 'auth.logout', // Using existing event for user pause
        userId: updatedUser.id,
        email: updatedUser.email,
        metadata: { action: 'paused', adminUserId }
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
        isBanned: updatedUser.isBanned || false,
        isPaused: updatedUser.isPaused || false,
        isLocked: updatedUser.isLocked || false,
        bannedAt: updatedUser.bannedAt,
        pausedAt: updatedUser.pausedAt,
        lockedAt: updatedUser.lockedAt,
        lockReason: updatedUser.lockReason,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.pauseCustomer');
    }
  }

  /**
   * Unpause customer user (admin only)
   */
  async unpauseCustomer(userId: string, adminUserId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Access denied. Admin privileges required.', AUTH_ERROR_CODES.ACCESS_DENIED);
      }

      // Verify target user exists and is a customer
      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return serviceError('User not found.', AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (targetUser.role !== 'customer') {
        return serviceError('Only customers can be unpaused.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      if (!targetUser.isPaused) {
        return serviceError('Customer is not currently paused.', AUTH_ERROR_CODES.VALIDATION_FAILED);
      }

      // Unpause the customer
      const updatedUser = await userRepository.update(userId, {
        isPaused: false,
        pausedAt: null
      });

      if (!updatedUser) {
        return serviceError('Failed to unpause customer.', AUTH_ERROR_CODES.UNKNOWN);
      }

      this.audit({
        event: 'auth.login.success', // Using existing event for user unpause
        userId: updatedUser.id,
        email: updatedUser.email,
        metadata: { action: 'unpaused', adminUserId }
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
        isBanned: updatedUser.isBanned || false,
        isPaused: updatedUser.isPaused || false,
        isLocked: updatedUser.isLocked || false,
        bannedAt: updatedUser.bannedAt,
        pausedAt: updatedUser.pausedAt,
        lockedAt: updatedUser.lockedAt,
        lockReason: updatedUser.lockReason,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.unpauseCustomer');
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<ServiceResult<{
    user: UserListItem;
    profile: any;
  }>> {
    try {
      // Get user details
      const user = await userRepository.findById(userId);
      if (!user) {
        return serviceError('User not found', 'USER_NOT_FOUND');
      }

      // Format user response (excluding sensitive data)
      const userResponse: UserListItem = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isProfileCompleted: user.isProfileCompleted || false,
        isApproved: user.isApproved || false,
        isBanned: user.isBanned,
        isPaused: user.isPaused,
        isLocked: user.isLocked || false,
        bannedAt: user.bannedAt,
        pausedAt: user.pausedAt,
        lockedAt: user.lockedAt,
        lockReason: user.lockReason,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      let profile = null;

      // Get profile based on user role
      if (user.role === 'expert') {
        const { db } = await import('../../database/connection');
        const { expertProfiles } = await import('../../database/schema');
        const { eq } = await import('drizzle-orm');

        const [expertProfile] = await db
          .select()
          .from(expertProfiles)
          .where(eq(expertProfiles.userId, userId))
          .limit(1);

        profile = expertProfile || null;
      } else if (user.role === 'customer') {
        const { db } = await import('../../database/connection');
        const { customerProfiles } = await import('../../database/schema');
        const { eq } = await import('drizzle-orm');

        const [customerProfile] = await db
          .select()
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, userId))
          .limit(1);

        profile = customerProfile || null;
      }

      return serviceSuccess({
        user: userResponse,
        profile: profile
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.getUserProfile');
    }
  }

  /**
   * Approve expert profile (admin only)
   */
  async approveExpert(userId: string, adminUserId: string): Promise<ServiceResult<any>> {
    try {
      // Import profile service
      const { profileService } = await import('../profile/profile.service');

      const result = await profileService.approveExpertProfile(userId, adminUserId);

      if (!result.success) {
        return serviceError(result.error || 'Failed to approve expert profile', 'APPROVAL_FAILED');
      }

      return serviceSuccess({
        message: 'Expert profile approved successfully',
        user: result.data
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.approveExpert');
    }
  }

  /**
   * Reject expert profile (admin only)
   */
  async rejectExpert(userId: string, adminUserId: string, reason?: string): Promise<ServiceResult<any>> {
    try {
      // Import profile service
      const { profileService } = await import('../profile/profile.service');

      const result = await profileService.rejectExpertProfile(userId, adminUserId, reason);

      if (!result.success) {
        return serviceError(result.error || 'Failed to reject expert profile', 'REJECTION_FAILED');
      }

      return serviceSuccess({
        message: 'Expert profile rejected successfully',
        user: result.data
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.rejectExpert');
    }
  }

  /**
   * Get all service requests with filtering and pagination (admin only)
   */
  async getServiceRequests(options: GetServiceRequestsOptions): Promise<ServiceResult<ServiceRequestsResponse>> {
    try {
      const { status, priority, page, limit } = options;
      const offset = (page - 1) * limit;

      // Build the query conditions
      const conditions = [];
      if (status) {
        conditions.push(eq(serviceData.status, status as any));
      }
      if (priority) {
        conditions.push(eq(serviceData.priority, priority as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(serviceData)
        .where(whereClause);

      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      // Get service requests with customer and expert info
      const requests = await db
        .select({
          id: serviceData.id,
          userId: serviceData.userId,
          customerFirstName: users.firstName,
          customerLastName: users.lastName,
          customerEmail: users.email,
          assignedExpertId: serviceData.assignedExpertId,
          serviceType: serviceData.serviceType,
          status: serviceData.status,
          priority: serviceData.priority,
          title: serviceData.title,
          description: serviceData.description,
          assignedAt: serviceData.assignedAt,
          completedAt: serviceData.completedAt,
          createdAt: serviceData.createdAt,
          updatedAt: serviceData.updatedAt,
        })
        .from(serviceData)
        .leftJoin(users, eq(serviceData.userId, users.id))
        .where(whereClause)
        .orderBy(desc(serviceData.createdAt))
        .limit(limit)
        .offset(offset);

      // Get expert names for assigned requests
      const requestsWithExpertInfo: ServiceRequestItem[] = [];

      for (const request of requests) {
        let expertName = undefined;
        let expertEmail = undefined;

        if (request.assignedExpertId) {
          const [expert] = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email
            })
            .from(users)
            .where(eq(users.id, request.assignedExpertId))
            .limit(1);

          if (expert) {
            expertName = `${expert.firstName} ${expert.lastName}`;
            expertEmail = expert.email;
          }
        }

        // Get the proper service name based on service type
        const properServiceName = getServiceNameByType(request.serviceType || 'general-consultation');

        requestsWithExpertInfo.push({
          id: request.id,
          userId: request.userId,
          customerName: `${request.customerFirstName || ''} ${request.customerLastName || ''}`.trim(),
          customerEmail: request.customerEmail || '',
          assignedExpertId: request.assignedExpertId || undefined,
          expertName,
          expertEmail,
          serviceType: request.serviceType || '',
          status: request.status,
          priority: request.priority || 'normal',
          title: request.title || properServiceName,
          description: request.description || undefined,
          assignedAt: request.assignedAt || undefined,
          completedAt: request.completedAt || undefined,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        });
      }

      return serviceSuccess({
        requests: requestsWithExpertInfo,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.getServiceRequests');
    }
  }

  /**
   * Assign expert to service request (admin only)
   */
  async assignExpertToServiceRequest(
    requestId: string,
    expertId: string,
    adminUserId: string
  ): Promise<ServiceResult<any>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Admin access required', 'ADMIN_ACCESS_REQUIRED');
      }

      // Verify expert exists and is approved
      const expert = await userRepository.findById(expertId);
      if (!expert || expert.role !== 'expert') {
        return serviceError('Expert not found', 'EXPERT_NOT_FOUND');
      }

      if (!expert.isApproved) {
        return serviceError('Expert is not approved', 'EXPERT_NOT_APPROVED');
      }

      if (expert.isBanned) {
        return serviceError('Expert is banned', 'EXPERT_BANNED');
      }

      // Verify service request exists
      const [serviceRequest] = await db
        .select()
        .from(serviceData)
        .where(eq(serviceData.id, requestId))
        .limit(1);

      if (!serviceRequest) {
        return serviceError('Service request not found', 'REQUEST_NOT_FOUND');
      }

      // Update service request
      const [updatedRequest] = await db
        .update(serviceData)
        .set({
          assignedExpertId: expertId,
          status: 'assigned',
          assignedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(serviceData.id, requestId))
        .returning();

      // Send notification to expert about new assignment
      try {
        // Get the proper service name for the notification
        const properServiceName = getServiceNameByType(serviceRequest.serviceType || 'general-consultation');

        await emailService.sendTaskAssignmentNotification({
          expertEmail: expert.email,
          expertName: `${expert.firstName} ${expert.lastName}`,
          taskTitle: serviceRequest.title || properServiceName,
          priority: serviceRequest.priority || 'normal',
          assignedAt: new Date()
        });
      } catch (emailError) {
        console.error('Failed to send expert assignment email:', emailError);
        // Continue even if email fails
      }

      return serviceSuccess({
        message: 'Expert assigned successfully and notified via email',
        request: updatedRequest
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.assignExpertToServiceRequest');
    }
  }



  /**
   * Delete service request (admin only) - only allowed for pending requests
   */
  async deleteServiceRequest(
    requestId: string,
    adminUserId: string
  ): Promise<ServiceResult<{ message: string }>> {
    try {
      console.log('DeleteServiceRequest: Starting with adminUserId:', adminUserId);

      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      console.log('DeleteServiceRequest: Admin verification result:', admin ? 'SUCCESS' : 'FAILED');

      if (!admin) {
        console.log('DeleteServiceRequest: Returning ADMIN_ACCESS_REQUIRED error');
        return serviceError('Admin access required', 'ADMIN_ACCESS_REQUIRED');
      }

      // Check if service request exists and get its status
      const [existingRequest] = await db
        .select()
        .from(serviceData)
        .where(eq(serviceData.id, requestId))
        .limit(1);

      if (!existingRequest) {
        return serviceError('Service request not found', 'NOT_FOUND');
      }

      // Only allow deletion of pending requests (not assigned to experts yet)
      if (existingRequest.status !== 'pending') {
        return serviceError(
          'Cannot delete service request that has been assigned or is in progress. Only pending requests can be deleted.',
          'INVALID_OPERATION'
        );
      }

      // Delete the service request
      await db
        .delete(serviceData)
        .where(eq(serviceData.id, requestId));

      return serviceSuccess({ message: 'Service request deleted successfully' });

    } catch (error) {
      console.log('DeleteServiceRequest: Caught error:', error);
      return serviceError('Internal server error', 'INTERNAL_ERROR');
    }
  }

  async updateServiceRequestTitle(requestId: string, title: string, adminUserId: string): Promise<ServiceResult<any>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminUserId);
      if (!admin) {
        return serviceError('Unauthorized: Admin access required', 'UNAUTHORIZED');
      }

      // Update service request title
      const [updatedRequest] = await db
        .update(serviceData)
        .set({
          title,
          updatedAt: new Date()
        })
        .where(eq(serviceData.id, requestId))
        .returning();

      return serviceSuccess({
        message: 'Service request title updated successfully',
        request: updatedRequest
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.updateServiceRequestTitle');
    }
  }

  async getExpertList(): Promise<ServiceResult<any>> {
    try {
      const experts = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          isVerified: users.isEmailVerified
        })
        .from(users)
        .where(eq(users.role, 'expert'));

      return serviceSuccess({
        experts
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.getExpertList');
    }
  }

  /**
   * Update service request status with notes
   */
  async updateServiceRequestStatus(requestId: string, newStatus: string, notes?: string, adminId?: string): Promise<ServiceResult<any>> {
    try {
      // Check if service request exists
      const existingRequest = await db
        .select()
        .from(serviceData)
        .where(eq(serviceData.id, requestId))
        .limit(1);

      if (existingRequest.length === 0) {
        return serviceError('Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
      }

      const currentRequest = existingRequest[0];

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        pending: ['assigned', 'cancelled'],
        assigned: ['accepted', 'cancelled'],
        accepted: ['in_progress', 'cancelled'],
        in_progress: ['completed', 'cancelled'],
        completed: ['pending_closure', 'closed'],
        pending_closure: ['closed', 'in_progress'],
        closed: [],
        cancelled: ['pending'],
      };

      const allowedStatuses = validTransitions[currentRequest.status] || [];
      if (newStatus !== currentRequest.status && !allowedStatuses.includes(newStatus)) {
        return serviceError(
          `Invalid status transition from ${currentRequest.status} to ${newStatus}`,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // Prepare update data
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // Set completion date if completing
      if (newStatus === 'completed' && currentRequest.status !== 'completed') {
        updateData.completedAt = new Date();
      }

      // Clear completion date if moving away from completed
      if (currentRequest.status === 'completed' && newStatus !== 'completed') {
        updateData.completedAt = null;
      }

      // Update the service request
      const [updatedRequest] = await db
        .update(serviceData)
        .set(updateData)
        .where(eq(serviceData.id, requestId))
        .returning();

      // Log the status change (you could create a separate audit log table)
      console.log(`Service request ${requestId} status changed from ${currentRequest.status} to ${newStatus}`, {
        adminId,
        notes,
        timestamp: new Date(),
      });

      return serviceSuccess({
        message: 'Service request status updated successfully',
        request: updatedRequest,
        previousStatus: currentRequest.status,
        newStatus,
        notes
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.updateServiceRequestStatus');
    }
  }

  /**
   * Get all quotes with filtering and pagination
   */
  async getQuotes(options: {
    page: number;
    limit: number;
    status?: string;
    customerId?: string;
    serviceRequestId?: string;
  }): Promise<ServiceResult<any>> {
    try {
      const { page, limit, status, customerId, serviceRequestId } = options;
      const offset = (page - 1) * limit;

      // Import quote schema
      const { serviceQuotes } = await import('../../database/schema/service-quotes');

      // Build where conditions
      let whereConditions = [];
      if (status && status !== 'all') {
        whereConditions.push(eq(serviceQuotes.status, status as any));
      }
      if (customerId) {
        whereConditions.push(eq(serviceQuotes.customerId, customerId));
      }
      if (serviceRequestId) {
        whereConditions.push(eq(serviceQuotes.serviceRequestId, serviceRequestId));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get quotes with customer and service request details
      const quotes = await db
        .select({
          id: serviceQuotes.id,
          serviceRequestId: serviceQuotes.serviceRequestId,
          customerId: serviceQuotes.customerId,
          adminId: serviceQuotes.adminId,
          quoteNumber: serviceQuotes.quoteNumber,
          quotedPrice: serviceQuotes.quotedPrice,
          currency: serviceQuotes.currency,
          status: serviceQuotes.status,
          description: serviceQuotes.description,
          validUntil: serviceQuotes.validUntil,
          acceptedAt: serviceQuotes.acceptedAt,
          rejectedAt: serviceQuotes.rejectedAt,
          rejectionReason: serviceQuotes.rejectionReason,
          createdAt: serviceQuotes.createdAt,
          updatedAt: serviceQuotes.updatedAt,
          customerName: users.firstName,
          customerLastName: users.lastName,
          customerEmail: users.email,
          serviceTitle: serviceData.title,
          serviceType: serviceData.serviceType,
        })
        .from(serviceQuotes)
        .leftJoin(users, eq(serviceQuotes.customerId, users.id))
        .leftJoin(serviceData, eq(serviceQuotes.serviceRequestId, serviceData.id))
        .where(whereClause)
        .orderBy(desc(serviceQuotes.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalResult = await db
        .select({ count: count() })
        .from(serviceQuotes)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      return serviceSuccess({
        quotes,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.getQuotes');
    }
  }

  /**
   * Create a new quote
   */
  async createQuote(data: {
    serviceRequestId: string;
    quotedPrice: number;
    description?: string;
    validUntil?: string;
    adminId: string;
  }): Promise<ServiceResult<any>> {
    try {
      const { serviceRequestId, quotedPrice, description, validUntil, adminId } = data;

      // Import quote schema
      const { serviceQuotes } = await import('../../database/schema/service-quotes');

      // Get service request details to get customer ID
      const serviceRequest = await db
        .select()
        .from(serviceData)
        .where(eq(serviceData.id, serviceRequestId))
        .limit(1);

      if (serviceRequest.length === 0) {
        return serviceError('Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
      }

      // Generate quote number
      const quoteCount = await db.select({ count: count() }).from(serviceQuotes);
      const quoteNumber = `Q${String((quoteCount[0]?.count || 0) + 1).padStart(6, '0')}`;

      // Create the quote
      const [quote] = await db
        .insert(serviceQuotes)
        .values({
          serviceRequestId,
          customerId: serviceRequest[0].userId,
          adminId,
          quoteNumber,
          quotedPrice: quotedPrice.toString(),
          description,
          validUntil: validUntil ? new Date(validUntil) : null,
          status: 'sent',
        })
        .returning();

      return serviceSuccess(quote);

    } catch (error) {
      return this.handleError(error, 'AdminService.createQuote');
    }
  }

  /**
   * Get quote by ID
   */
  async getQuoteById(quoteId: string): Promise<ServiceResult<any>> {
    try {
      // Import quote schema
      const { serviceQuotes } = await import('../../database/schema/service-quotes');

      // Get quote with customer and service request details
      const quote = await db
        .select({
          id: serviceQuotes.id,
          serviceRequestId: serviceQuotes.serviceRequestId,
          customerId: serviceQuotes.customerId,
          adminId: serviceQuotes.adminId,
          quoteNumber: serviceQuotes.quoteNumber,
          quotedPrice: serviceQuotes.quotedPrice,
          currency: serviceQuotes.currency,
          status: serviceQuotes.status,
          description: serviceQuotes.description,
          validUntil: serviceQuotes.validUntil,
          acceptedAt: serviceQuotes.acceptedAt,
          rejectedAt: serviceQuotes.rejectedAt,
          rejectionReason: serviceQuotes.rejectionReason,
          createdAt: serviceQuotes.createdAt,
          updatedAt: serviceQuotes.updatedAt,
          customerName: users.firstName,
          customerLastName: users.lastName,
          customerEmail: users.email,
          serviceTitle: serviceData.title,
          serviceType: serviceData.serviceType,
        })
        .from(serviceQuotes)
        .leftJoin(users, eq(serviceQuotes.customerId, users.id))
        .leftJoin(serviceData, eq(serviceQuotes.serviceRequestId, serviceData.id))
        .where(eq(serviceQuotes.id, quoteId))
        .limit(1);

      if (quote.length === 0) {
        return serviceError('Quote not found', 'QUOTE_NOT_FOUND');
      }

      return serviceSuccess(quote[0]);

    } catch (error) {
      return this.handleError(error, 'AdminService.getQuoteById');
    }
  }

  /**
   * Update/revise quote
   */
  async updateQuote(quoteId: string, data: {
    quotedPrice?: number;
    description?: string;
    validUntil?: string;
    adminId: string;
  }): Promise<ServiceResult<any>> {
    try {
      const { quotedPrice, description, validUntil, adminId } = data;

      // Import quote schema
      const { serviceQuotes } = await import('../../database/schema/service-quotes');

      // Check if quote exists and can be updated
      const existingQuote = await db
        .select()
        .from(serviceQuotes)
        .where(eq(serviceQuotes.id, quoteId))
        .limit(1);

      if (existingQuote.length === 0) {
        return serviceError('Quote not found', 'QUOTE_NOT_FOUND');
      }

      // Check if quote can be revised (only draft, sent, or pending quotes)
      const canRevise = ['draft', 'sent', 'pending'].includes(existingQuote[0].status);
      if (!canRevise) {
        return serviceError('Quote cannot be revised in its current status', 'QUOTE_CANNOT_BE_REVISED');
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (quotedPrice !== undefined) {
        updateData.quotedPrice = quotedPrice.toString();
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (validUntil !== undefined) {
        updateData.validUntil = validUntil ? new Date(validUntil) : null;
      }

      // Update the quote
      const [updatedQuote] = await db
        .update(serviceQuotes)
        .set(updateData)
        .where(eq(serviceQuotes.id, quoteId))
        .returning();

      return serviceSuccess(updatedQuote);

    } catch (error) {
      return this.handleError(error, 'AdminService.updateQuote');
    }
  }

  /**
   * Delete quote
   */
  async deleteQuote(quoteId: string, adminId: string): Promise<ServiceResult<any>> {
    try {
      // Import quote schema
      const { serviceQuotes } = await import('../../database/schema/service-quotes');

      // Check if quote exists
      const existingQuote = await db
        .select()
        .from(serviceQuotes)
        .where(eq(serviceQuotes.id, quoteId))
        .limit(1);

      if (existingQuote.length === 0) {
        return serviceError('Quote not found', 'QUOTE_NOT_FOUND');
      }

      // Check if quote can be deleted (only draft quotes or quotes that haven't been accepted)
      const canDelete = ['draft', 'sent', 'pending', 'rejected', 'expired'].includes(existingQuote[0].status);
      if (!canDelete) {
        return serviceError('Quote cannot be deleted in its current status', 'QUOTE_CANNOT_BE_DELETED');
      }

      // Delete the quote
      await db
        .delete(serviceQuotes)
        .where(eq(serviceQuotes.id, quoteId));

      return serviceSuccess({
        message: 'Quote deleted successfully',
        deletedQuoteId: quoteId
      });

    } catch (error) {
      return this.handleError(error, 'AdminService.deleteQuote');
    }
  }

  /**
   * Clean up user references that might prevent deletion
   * This method handles any remaining references that might not be properly handled by cascade deletes
   */
  private async cleanupUserReferences(userId: string): Promise<void> {
    try {
      // Import database connection and SQL helper
      const { db } = await import('../../database/connection');
      const { sql } = await import('drizzle-orm');

      console.log(`Starting detailed cleanup for user ${userId}`);

      // Clean up any remaining references that might be causing constraint violations
      // These should be handled by cascade deletes, but we'll do it manually as a fallback

      // Set created_by fields to null for records that reference this user
      const updateQueries = [
        { table: 'service_pricing', field: 'created_by' },
        { table: 'quiz_templates', field: 'created_by' },
        { table: 'quizzes', field: 'created_by' },
        { table: 'quizzes', field: 'archived_by' },
        { table: 'learning_modules', field: 'created_by' },
        { table: 'learning_modules', field: 'archived_by' },
        { table: 'service_quotes', field: 'admin_id' },
        { table: 'awareness_session_requests', field: 'assigned_expert_id' },
        { table: 'awareness_session_status_history', field: 'changed_by' }
      ];

      for (const query of updateQueries) {
        try {
          const result = await db.execute(sql.raw(`UPDATE ${query.table} SET ${query.field} = NULL WHERE ${query.field} = '${userId}'`));
          console.log(`Updated ${query.table}.${query.field}: ${result.length || 0} rows affected`);
        } catch (error) {
          console.error(`Failed to update ${query.table}.${query.field}:`, error);
        }
      }

      // Delete records that should cascade delete
      // Note: Order matters due to foreign key constraints
      const deleteQueries: Array<{ table: string; field: string; subquery?: string }> = [
        { table: 'quiz_attempts', field: 'user_id' },
        { table: 'learning_progress', field: 'user_id' },
        { table: 'quote_negotiations', field: 'sender_id' },
        // Delete awareness session status history first, then the requests
        { table: 'awareness_session_status_history', field: 'session_request_id', subquery: `(SELECT id FROM awareness_session_requests WHERE requester_id = '${userId}')` },
        { table: 'awareness_session_requests', field: 'requester_id' }
      ];

      for (const query of deleteQueries) {
        try {
          let deleteQuery: string;
          if (query.subquery) {
            deleteQuery = `DELETE FROM ${query.table} WHERE ${query.field} IN ${query.subquery}`;
          } else {
            deleteQuery = `DELETE FROM ${query.table} WHERE ${query.field} = '${userId}'`;
          }
          const result = await db.execute(sql.raw(deleteQuery));
          console.log(`Deleted from ${query.table}: ${result.length || 0} rows affected`);
        } catch (error) {
          console.error(`Failed to delete from ${query.table}:`, error);
        }
      }

      // Check for any remaining references that might cause constraint violations
      await this.checkRemainingReferences(userId);

      console.log(`Completed detailed cleanup for user ${userId}`);
    } catch (error) {
      console.error('Error during user reference cleanup:', error);
      throw error;
    }
  }

  /**
   * Check for any remaining references to the user that might cause constraint violations
   */
  private async checkRemainingReferences(userId: string): Promise<void> {
    try {
      const { db } = await import('../../database/connection');
      const { sql } = await import('drizzle-orm');

      // Check all tables that might still reference the user
      const checkQueries = [
        `SELECT COUNT(*) as count FROM service_pricing WHERE created_by = '${userId}'`,
        `SELECT COUNT(*) as count FROM quiz_templates WHERE created_by = '${userId}'`,
        `SELECT COUNT(*) as count FROM quizzes WHERE created_by = '${userId}' OR archived_by = '${userId}'`,
        `SELECT COUNT(*) as count FROM learning_modules WHERE created_by = '${userId}' OR archived_by = '${userId}'`,
        `SELECT COUNT(*) as count FROM service_quotes WHERE admin_id = '${userId}'`,
        `SELECT COUNT(*) as count FROM awareness_session_requests WHERE assigned_expert_id = '${userId}' OR requester_id = '${userId}'`,
        `SELECT COUNT(*) as count FROM awareness_session_status_history WHERE changed_by = '${userId}'`,
        `SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = '${userId}'`,
        `SELECT COUNT(*) as count FROM learning_progress WHERE user_id = '${userId}'`,
        `SELECT COUNT(*) as count FROM quote_negotiations WHERE sender_id = '${userId}'`
      ];

      for (const query of checkQueries) {
        try {
          const result = await db.execute(sql.raw(query));
          const count = Number(result[0]?.count) || 0;
          if (count > 0) {
            console.warn(`Found ${count} remaining references in query: ${query}`);
          }
        } catch (error) {
          console.error(`Failed to check references with query: ${query}`, error);
        }
      }
    } catch (error) {
      console.error('Error checking remaining references:', error);
    }
  }

  /**
   * Promote an expert to trainer (admin only)
   */
  async promoteToTrainer(expertId: string, adminId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminId);
      if (!admin) {
        return serviceError('Admin access required', 'ADMIN_ACCESS_REQUIRED');
      }

      // Verify the user is an approved expert
      const expert = await userRepository.findById(expertId);

      if (!expert) {
        return serviceError('Expert not found', 'EXPERT_NOT_FOUND');
      }

      if (expert.role !== 'expert') {
        return serviceError('User is not an expert', 'INVALID_ROLE');
      }

      if (!expert.isApproved) {
        return serviceError('Expert is not approved', 'EXPERT_NOT_APPROVED');
      }

      if (expert.isBanned) {
        return serviceError('Expert is banned', 'EXPERT_BANNED');
      }

      if (expert.isTrainer) {
        return serviceError('User is already a trainer', 'ALREADY_TRAINER');
      }

      // Promo expert to trainer
      const updatedUser = await userRepository.update(expertId, {
        role: 'trainer',
        isTrainer: true,
        promotedToTrainerAt: new Date(),
        promotedToTrainerBy: adminId,
      } as any);

      if (!updatedUser) {
        return serviceError('Failed to promote expert to trainer', 'PROMOTION_ERROR');
      }

      this.audit({
        event: 'auth.login.success', // Using existing event for trainer promotion
        userId: updatedUser.id,
        email: updatedUser.email,
        metadata: { action: 'promoted_to_trainer', adminId }
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
        isBanned: updatedUser.isBanned || false,
        isPaused: updatedUser.isPaused || false,
        isLocked: updatedUser.isLocked || false,
        bannedAt: updatedUser.bannedAt,
        pausedAt: updatedUser.pausedAt,
        lockedAt: updatedUser.lockedAt,
        lockReason: updatedUser.lockReason,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });
    } catch (error) {
      return this.handleError(error, 'AdminService.promoteToTrainer');
    }
  }

  /**
   * Demote a trainer back to expert (admin only)
   */
  async demoteFromTrainer(trainerId: string, adminId: string): Promise<ServiceResult<UserListItem>> {
    try {
      // Verify admin access
      const admin = await this.verifyAdminAccess(adminId);
      if (!admin) {
        return serviceError('Admin access required', 'ADMIN_ACCESS_REQUIRED');
      }

      const trainer = await userRepository.findById(trainerId);

      if (!trainer) {
        return serviceError('Trainer not found', 'TRAINER_NOT_FOUND');
      }

      if (trainer.role !== 'trainer') {
        return serviceError('User is not a trainer', 'INVALID_ROLE');
      }

      // Demote back to expert
      const updatedUser = await userRepository.update(trainerId, {
        role: 'expert',
        isTrainer: false,
      } as any);

      if (!updatedUser) {
        return serviceError('Failed to demote trainer', 'DEMOTION_ERROR');
      }

      this.audit({
        event: 'auth.login.success', // Using existing event for trainer demotion
        userId: updatedUser.id,
        email: updatedUser.email,
        metadata: { action: 'demoted_from_trainer', adminId }
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
        isBanned: updatedUser.isBanned || false,
        isPaused: updatedUser.isPaused || false,
        isLocked: updatedUser.isLocked || false,
        bannedAt: updatedUser.bannedAt,
        pausedAt: updatedUser.pausedAt,
        lockedAt: updatedUser.lockedAt,
        lockReason: updatedUser.lockReason,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });
    } catch (error) {
      return this.handleError(error, 'AdminService.demoteFromTrainer');
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
