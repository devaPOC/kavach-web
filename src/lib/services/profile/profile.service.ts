import { db } from '../../database/connection';
import { users, expertProfiles, customerProfiles } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { ProfileError } from './profile-errors';
import { auditLogger } from '../../utils/audit-logger';
import { sessionManager } from '../../auth/unified-session-manager';
import { transactionService, type TransactionResult } from '../../database/transaction-service';
import { ProfileTransaction, type ProfileCreationResult } from '../../database/profile-transaction';
import { ValidationService } from '../../validation/service';
import { withServiceErrorHandler } from '../../errors/error-handler';
import { logger } from '../../utils/logger';
import type {
  CreateExpertProfileData,
  CreateCustomerProfileData,
  ProfileData
} from './profile-types';
import type { ExpertProfileData, CustomerProfileData } from '../../validation/schemas';
import type { RequestContext } from '../../errors/correlation';

export class ProfileService {
  // Get user profile
  async getUserProfile(userId: string, context?: RequestContext): Promise<ProfileData | null> {
    return withServiceErrorHandler(async () => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        throw new ProfileError('User not found', 'USER_NOT_FOUND');
      }

      const userData = user[0];

      // Get profile based on role
      if (userData.role === 'expert') {
        const expertProfile = await db
          .select()
          .from(expertProfiles)
          .where(eq(expertProfiles.userId, userId))
          .limit(1);

        return {
          user: userData,
          profile: expertProfile[0] || null,
          type: 'expert'
        };
      } else {
        const customerProfile = await db
          .select()
          .from(customerProfiles)
          .where(eq(customerProfiles.userId, userId))
          .limit(1);

        return {
          user: userData,
          profile: customerProfile[0] || null,
          type: 'customer'
        };
      }
    }, context);
  }

  // Create expert profile with atomic transaction
  async createExpertProfile(
    userId: string,
    data: CreateExpertProfileData,
    context?: RequestContext
  ): Promise<TransactionResult<ProfileCreationResult>> {
    return withServiceErrorHandler(async () => {
      // Validate the profile data using unified validation
      const validation = ValidationService.validateExpertProfile(data, context);
      if (!validation.success) {
        const firstError = Object.values(validation.errors)[0];
        throw new ProfileError(firstError || 'Invalid profile data', 'VALIDATION_ERROR');
      }

      const validatedData = validation.data as ExpertProfileData;

      // Map validation data to database format
      const { mapExpertProfileToDb } = await import('../../controllers/profile/profile-data-mapper');
      const dbData = mapExpertProfileToDb(validatedData);

      // Execute profile creation in transaction
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          const profileResult = await ProfileTransaction.createExpertProfile(tx, userId, dbData);

          // Create audit log entry
          await ProfileTransaction.createAuditLog(tx, {
            userId,
            action: 'profile.expert.created',
            details: { profileId: profileResult.profile.id },
            timestamp: new Date(),
            requestId: context?.correlationId
          });

          return profileResult;
        },
        'create-expert-profile'
      );

      if (!result.success) {
        throw new ProfileError(result.error || 'Failed to create expert profile', 'PROFILE_CREATION_FAILED');
      }

      // Refresh user session with updated profile data
      try {
        const updatedSessionData = {
          userId: result.data!.user.id,
          email: result.data!.user.email,
          role: result.data!.user.role as 'expert',
          isEmailVerified: result.data!.user.isEmailVerified,
          isProfileCompleted: result.data!.user.isProfileCompleted,
          isApproved: result.data!.user.isApproved
        };

        await sessionManager.createSession(updatedSessionData);
        logger.info('Session refreshed after expert profile creation', { userId });
      } catch (sessionError) {
        logger.warn('Failed to refresh session after profile creation', {
          userId,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error'
        });
        // Don't fail the entire operation if session refresh fails
      }

      auditLogger.info('profile.expert.created', {
        userId,
        profileId: result.data!.profile.id,
        requestId: context?.correlationId
      });

      return result;
    }, context);
  }

  // Create customer profile with atomic transaction
  async createCustomerProfile(
    userId: string,
    data: CreateCustomerProfileData,
    context?: RequestContext
  ): Promise<TransactionResult<ProfileCreationResult>> {
    return withServiceErrorHandler(async () => {
      // Validate the profile data using unified validation
      const validation = ValidationService.validateCustomerProfile(data, context);
      if (!validation.success) {
        const firstError = Object.values(validation.errors)[0];
        throw new ProfileError(firstError || 'Invalid profile data', 'VALIDATION_ERROR');
      }

      const validatedData = validation.data as CustomerProfileData;

      // Map validation data to database format
      const { mapCustomerProfileToDb } = await import('../../controllers/profile/profile-data-mapper');
      const dbData = mapCustomerProfileToDb(validatedData);

      // Execute profile creation in transaction
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          const profileResult = await ProfileTransaction.createCustomerProfile(tx, userId, dbData);

          // Create audit log entry
          await ProfileTransaction.createAuditLog(tx, {
            userId,
            action: 'profile.customer.created',
            details: { profileId: profileResult.profile.id },
            timestamp: new Date(),
            requestId: context?.correlationId
          });

          return profileResult;
        },
        'create-customer-profile'
      );

      if (!result.success) {
        throw new ProfileError(result.error || 'Failed to create customer profile', 'PROFILE_CREATION_FAILED');
      }

      // Refresh user session with updated profile data
      try {
        const updatedSessionData = {
          userId: result.data!.user.id,
          email: result.data!.user.email,
          role: result.data!.user.role as 'customer',
          isEmailVerified: result.data!.user.isEmailVerified,
          isProfileCompleted: result.data!.user.isProfileCompleted,
          isApproved: result.data!.user.isApproved
        };

        await sessionManager.createSession(updatedSessionData);
        logger.info('Session refreshed after customer profile creation', { userId });
      } catch (sessionError) {
        logger.warn('Failed to refresh session after profile creation', {
          userId,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error'
        });
        // Don't fail the entire operation if session refresh fails
      }

      auditLogger.info('profile.customer.created', {
        userId,
        profileId: result.data!.profile.id,
        requestId: context?.correlationId
      });

      return result;
    }, context);
  }

  // Update expert profile with transaction
  async updateExpertProfile(
    userId: string,
    data: Partial<CreateExpertProfileData>,
    context?: RequestContext
  ): Promise<TransactionResult<any>> {
    return withServiceErrorHandler(async () => {
      // Validate the profile data if it contains fields that need validation
      if (Object.keys(data).length > 0) {
        const validation = ValidationService.validateExpertProfileUpdate(data, context);
        if (!validation.success) {
          const firstError = Object.values(validation.errors)[0];
          throw new ProfileError(firstError || 'Invalid profile data', 'VALIDATION_ERROR');
        }
      }

      // Map validation data to database format for fields that need mapping
      const { mapExpertProfileToDb } = await import('../../controllers/profile/profile-data-mapper');
      const dbData = data as any; // For partial updates, we'll handle mapping individually if needed

      // Execute profile update in transaction
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          const updatedProfile = await ProfileTransaction.updateExpertProfile(tx, userId, dbData);

          // Create audit log entry
          await ProfileTransaction.createAuditLog(tx, {
            userId,
            action: 'profile.expert.updated',
            details: { profileId: updatedProfile.id, updatedFields: Object.keys(data) },
            timestamp: new Date(),
            requestId: context?.correlationId
          });

          return updatedProfile;
        },
        'update-expert-profile'
      );

      if (!result.success) {
        throw new ProfileError(result.error || 'Failed to update expert profile', 'PROFILE_UPDATE_FAILED');
      }

      auditLogger.info('profile.expert.updated', {
        userId,
        profileId: result.data!.id,
        requestId: context?.correlationId
      });

      return result;
    }, context);
  }

  // Update customer profile with transaction
  async updateCustomerProfile(
    userId: string,
    data: Partial<CreateCustomerProfileData>,
    context?: RequestContext
  ): Promise<TransactionResult<any>> {
    return withServiceErrorHandler(async () => {
      // Validate the profile data if it contains fields that need validation
      if (Object.keys(data).length > 0) {
        const validation = ValidationService.validateCustomerProfileUpdate(data, context);
        if (!validation.success) {
          const firstError = Object.values(validation.errors)[0];
          throw new ProfileError(firstError || 'Invalid profile data', 'VALIDATION_ERROR');
        }
      }

      // Map validation data to database format for fields that need mapping
      const { mapCustomerProfileToDb } = await import('../../controllers/profile/profile-data-mapper');
      const dbData = data as any; // For partial updates, we'll handle mapping individually if needed

      // Execute profile update in transaction
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          const updatedProfile = await ProfileTransaction.updateCustomerProfile(tx, userId, dbData);

          // Create audit log entry
          await ProfileTransaction.createAuditLog(tx, {
            userId,
            action: 'profile.customer.updated',
            details: { profileId: updatedProfile.id, updatedFields: Object.keys(data) },
            timestamp: new Date(),
            requestId: context?.correlationId
          });

          return updatedProfile;
        },
        'update-customer-profile'
      );

      if (!result.success) {
        throw new ProfileError(result.error || 'Failed to update customer profile', 'PROFILE_UPDATE_FAILED');
      }

      auditLogger.info('profile.customer.updated', {
        userId,
        profileId: result.data!.id,
        requestId: context?.correlationId
      });

      return result;
    }, context);
  }

  // Approve expert profile (admin only) with transaction
  async approveExpertProfile(
    userId: string,
    adminUserId: string,
    context?: RequestContext
  ): Promise<TransactionResult<any>> {
    return withServiceErrorHandler(async () => {
      // Execute approval in transaction
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          const updatedUser = await ProfileTransaction.updateUserStatus(tx, userId, {
            isApproved: true,
            updatedAt: new Date()
          });

          // Create audit log entry
          await ProfileTransaction.createAuditLog(tx, {
            userId,
            action: 'profile.expert.approved',
            details: {
              adminUserId,
              approvedAt: updatedUser.updatedAt
            },
            timestamp: new Date(),
            requestId: context?.correlationId
          });

          return updatedUser;
        },
        'approve-expert-profile'
      );

      if (!result.success) {
        throw new ProfileError(result.error || 'Failed to approve expert profile', 'PROFILE_APPROVAL_FAILED');
      }

      // Invalidate existing sessions to force user to log in with updated approval status
      try {
        // Import session repository directly to ensure invalidation
        const { sessionRepository } = await import('../../database/repositories/session-repository');
        await sessionRepository.deleteByUserId(userId);
        
        logger.info('All sessions invalidated after expert profile approval - user must log in again', { userId });
      } catch (sessionError) {
        logger.warn('Failed to invalidate sessions after profile approval', {
          userId,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error'
        });

        // Don't fail the entire operation if session invalidation fails
      }

      auditLogger.info('profile.expert.approved', {
        userId,
        adminUserId,
        approvedAt: result.data!.updatedAt,
        requestId: context?.correlationId
      });

      return result;
    }, context);
  }

  // Reject expert profile (admin only) with transaction
  async rejectExpertProfile(
    userId: string,
    adminUserId: string,
    reason?: string,
    context?: RequestContext
  ): Promise<TransactionResult<any>> {
    return withServiceErrorHandler(async () => {
      // Execute rejection in transaction
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          const updatedUser = await ProfileTransaction.updateUserStatus(tx, userId, {
            isApproved: false,
            updatedAt: new Date()
          });

          // Create audit log entry
          await ProfileTransaction.createAuditLog(tx, {
            userId,
            action: 'profile.expert.rejected',
            details: {
              adminUserId,
              reason: reason || 'No reason provided',
              rejectedAt: updatedUser.updatedAt
            },
            timestamp: new Date(),
            requestId: context?.correlationId
          });

          return updatedUser;
        },
        'reject-expert-profile'
      );

      if (!result.success) {
        throw new ProfileError(result.error || 'Failed to reject expert profile', 'PROFILE_REJECTION_FAILED');
      }

      auditLogger.info('profile.expert.rejected', {
        userId,
        adminUserId,
        reason: reason || 'No reason provided',
        rejectedAt: result.data!.updatedAt,
        requestId: context?.correlationId
      });

      return result;
    }, context);
  }

  // Delete profile with transaction (new method)
  async deleteProfile(
    userId: string,
    profileType: 'expert' | 'customer',
    context?: RequestContext
  ): Promise<TransactionResult<any>> {
    return withServiceErrorHandler(async () => {
      // Execute profile deletion in transaction
      const result = await transactionService.executeInTransaction(
        async (tx) => {
          const updatedUser = await ProfileTransaction.deleteProfile(tx, userId, profileType);

          // Create audit log entry
          await ProfileTransaction.createAuditLog(tx, {
            userId,
            action: `profile.${profileType}.deleted`,
            details: { profileType },
            timestamp: new Date(),
            requestId: context?.correlationId
          });

          return updatedUser;
        },
        `delete-${profileType}-profile`
      );

      if (!result.success) {
        throw new ProfileError(result.error || `Failed to delete ${profileType} profile`, 'PROFILE_DELETION_FAILED');
      }

      // Refresh user session with updated status
      try {
        const updatedSessionData = {
          userId: result.data!.id,
          email: result.data!.email,
          role: result.data!.role as 'expert' | 'customer',
          isEmailVerified: result.data!.isEmailVerified,
          isProfileCompleted: result.data!.isProfileCompleted,
          isApproved: result.data!.isApproved
        };

        await sessionManager.createSession(updatedSessionData);
        logger.info(`Session refreshed after ${profileType} profile deletion`, { userId });
      } catch (sessionError) {
        logger.warn(`Failed to refresh session after ${profileType} profile deletion`, {
          userId,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error'
        });
        // Don't fail the entire operation if session refresh fails
      }

      auditLogger.info(`profile.${profileType}.deleted`, {
        userId,
        deletedAt: result.data!.updatedAt,
        requestId: context?.correlationId
      });

      return result;
    }, context);
  }
}

// Export singleton instance
export const profileService = new ProfileService();