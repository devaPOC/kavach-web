import { eq } from 'drizzle-orm';
import type { Transaction } from './transaction-service';
import { users, expertProfiles, customerProfiles } from './schema';
import type { User } from '../../types/user';
import { logger } from '../utils/logger';

/**
 * Profile data interfaces
 */
export interface BaseProfileData {
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  nationality?: string;
  countryOfResidence?: string;
  governorate?: string;
  wilayat?: string;
}

export interface ExpertProfileData extends BaseProfileData {
  areasOfSpecialization?: string;
  professionalExperience?: string;
  relevantCertifications?: string;
  currentEmploymentStatus?: 'employed' | 'self-employed' | 'unemployed' | 'student' | 'retired';
  currentEmployer?: string;
  availability?: 'full-time' | 'part-time' | 'contract-based' | 'weekends-only' | 'flexible-hours' | 'flexible';
  preferredWorkArrangement?: 'remote' | 'on-site' | 'hybrid';
  preferredPaymentMethods?: string;
}

export interface CustomerProfileData extends BaseProfileData {
  // Customer-specific fields can be added here
}

export interface ProfileCreationResult {
  user: User;
  profile: any; // Will be ExpertProfile or CustomerProfile
  profileType: 'expert' | 'customer';
}

export interface UserStatusUpdate {
  isProfileCompleted?: boolean;
  isApproved?: boolean;
  updatedAt: Date;
}

/**
 * Audit event for profile operations
 */
export interface AuditEvent {
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

/**
 * Class for handling profile-related database transactions
 * Ensures atomic operations for profile creation and updates
 */
export class ProfileTransaction {
  /**
   * Create an expert profile with atomic user status update
   */
  static async createExpertProfile(
    tx: Transaction,
    userId: string,
    profileData: ExpertProfileData
  ): Promise<ProfileCreationResult> {
    try {
      logger.info(`Creating expert profile for user: ${userId}`);

      // First, verify the user exists and has the correct role
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (user.role !== 'expert') {
        throw new Error(`User ${userId} is not an expert (role: ${user.role})`);
      }

      // Check if profile already exists
      const [existingProfile] = await tx
        .select()
        .from(expertProfiles)
        .where(eq(expertProfiles.userId, userId))
        .limit(1);

      if (existingProfile) {
        throw new Error(`Expert profile already exists for user: ${userId}`);
      }

      // Create the expert profile
      const [profile] = await tx
        .insert(expertProfiles)
        .values({
          userId,
          ...profileData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!profile) {
        throw new Error('Failed to create expert profile');
      }

      // Update user status to indicate profile is completed but not approved
      const [updatedUser] = await tx
        .update(users)
        .set({
          isProfileCompleted: true,
          isApproved: false, // Experts require manual approval
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error('Failed to update user profile completion status');
      }

      logger.info(`Expert profile created successfully for user: ${userId}`);

      return {
        user: {
          ...updatedUser,
          bannedAt: updatedUser.bannedAt || undefined,
          pausedAt: updatedUser.pausedAt || undefined,
          approvedAt: updatedUser.approvedAt || undefined,
          lockedAt: updatedUser.lockedAt || undefined,
          lockReason: updatedUser.lockReason || undefined,
          promotedToTrainerAt: updatedUser.promotedToTrainerAt || undefined,
          promotedToTrainerBy: updatedUser.promotedToTrainerBy || undefined
        },
        profile,
        profileType: 'expert'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to create expert profile for user ${userId}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Create a customer profile with atomic user status update
   */
  static async createCustomerProfile(
    tx: Transaction,
    userId: string,
    profileData: CustomerProfileData
  ): Promise<ProfileCreationResult> {
    try {
      logger.info(`Creating customer profile for user: ${userId}`);

      // First, verify the user exists and has the correct role
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (user.role !== 'customer') {
        throw new Error(`User ${userId} is not a customer (role: ${user.role})`);
      }

      // Check if profile already exists
      const [existingProfile] = await tx
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, userId))
        .limit(1);

      if (existingProfile) {
        throw new Error(`Customer profile already exists for user: ${userId}`);
      }

      // Create the customer profile
      const [profile] = await tx
        .insert(customerProfiles)
        .values({
          userId,
          ...profileData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!profile) {
        throw new Error('Failed to create customer profile');
      }

      // Update user status to indicate profile is completed and approved (customers are auto-approved)
      const [updatedUser] = await tx
        .update(users)
        .set({
          isProfileCompleted: true,
          isApproved: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error('Failed to update user profile completion status');
      }

      logger.info(`Customer profile created successfully for user: ${userId}`);

      return {
        user: {
          ...updatedUser,
          bannedAt: updatedUser.bannedAt || undefined,
          pausedAt: updatedUser.pausedAt || undefined,
          approvedAt: updatedUser.approvedAt || undefined,
          lockedAt: updatedUser.lockedAt || undefined,
          lockReason: updatedUser.lockReason || undefined,
          promotedToTrainerAt: updatedUser.promotedToTrainerAt || undefined,
          promotedToTrainerBy: updatedUser.promotedToTrainerBy || undefined
        },
        profile,
        profileType: 'customer'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to create customer profile for user ${userId}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Update user status atomically
   */
  static async updateUserStatus(
    tx: Transaction,
    userId: string,
    statusUpdate: UserStatusUpdate
  ): Promise<User> {
    try {
      logger.info(`Updating user status for user: ${userId}`, statusUpdate);

      const [updatedUser] = await tx
        .update(users)
        .set({
          ...statusUpdate,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error(`Failed to update user status for user: ${userId}`);
      }

      logger.info(`User status updated successfully for user: ${userId}`);
      return {
        ...updatedUser,
        bannedAt: updatedUser.bannedAt || undefined,
        pausedAt: updatedUser.pausedAt || undefined,
        approvedAt: updatedUser.approvedAt || undefined,
        lockedAt: updatedUser.lockedAt || undefined,
        lockReason: updatedUser.lockReason || undefined,
        promotedToTrainerAt: updatedUser.promotedToTrainerAt || undefined,
        promotedToTrainerBy: updatedUser.promotedToTrainerBy || undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to update user status for user ${userId}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Update expert profile atomically
   */
  static async updateExpertProfile(
    tx: Transaction,
    userId: string,
    profileData: Partial<ExpertProfileData>
  ): Promise<any> {
    try {
      logger.info(`Updating expert profile for user: ${userId}`);

      const [updatedProfile] = await tx
        .update(expertProfiles)
        .set({
          ...profileData,
          updatedAt: new Date()
        })
        .where(eq(expertProfiles.userId, userId))
        .returning();

      if (!updatedProfile) {
        throw new Error(`Expert profile not found for user: ${userId}`);
      }

      logger.info(`Expert profile updated successfully for user: ${userId}`);
      return updatedProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to update expert profile for user ${userId}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Update customer profile atomically
   */
  static async updateCustomerProfile(
    tx: Transaction,
    userId: string,
    profileData: Partial<CustomerProfileData>
  ): Promise<any> {
    try {
      logger.info(`Updating customer profile for user: ${userId}`);

      const [updatedProfile] = await tx
        .update(customerProfiles)
        .set({
          ...profileData,
          updatedAt: new Date()
        })
        .where(eq(customerProfiles.userId, userId))
        .returning();

      if (!updatedProfile) {
        throw new Error(`Customer profile not found for user: ${userId}`);
      }

      logger.info(`Customer profile updated successfully for user: ${userId}`);
      return updatedProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to update customer profile for user ${userId}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Delete profile and update user status atomically
   */
  static async deleteProfile(
    tx: Transaction,
    userId: string,
    profileType: 'expert' | 'customer'
  ): Promise<User> {
    try {
      logger.info(`Deleting ${profileType} profile for user: ${userId}`);

      // Delete the appropriate profile
      if (profileType === 'expert') {
        await tx
          .delete(expertProfiles)
          .where(eq(expertProfiles.userId, userId));
      } else {
        await tx
          .delete(customerProfiles)
          .where(eq(customerProfiles.userId, userId));
      }

      // Update user status to indicate profile is no longer completed
      const [updatedUser] = await tx
        .update(users)
        .set({
          isProfileCompleted: false,
          isApproved: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error(`Failed to update user status after profile deletion for user: ${userId}`);
      }

      logger.info(`${profileType} profile deleted successfully for user: ${userId}`);
      return {
        ...updatedUser,
        bannedAt: updatedUser.bannedAt || undefined,
        pausedAt: updatedUser.pausedAt || undefined,
        approvedAt: updatedUser.approvedAt || undefined,
        promotedToTrainerAt: updatedUser.promotedToTrainerAt || undefined,
        promotedToTrainerBy: updatedUser.promotedToTrainerBy || undefined,
        lockedAt: updatedUser.lockedAt || undefined,
        lockReason: updatedUser.lockReason || undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to delete ${profileType} profile for user ${userId}`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Create audit log entry (placeholder for future audit table)
   * Currently just logs the event
   */
  static async createAuditLog(
    tx: Transaction,
    event: AuditEvent
  ): Promise<void> {
    try {
      // For now, just log the audit event
      // In the future, this could insert into an audit_logs table
      logger.info('Audit event', {
        userId: event.userId,
        action: event.action,
        details: event.details,
        timestamp: event.timestamp,
        requestId: event.requestId
      });

      // TODO: Implement actual audit table insertion when audit schema is created
      // await tx.insert(auditLogs).values(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create audit log', { error: errorMessage, event });
      // Don't throw here as audit logging shouldn't fail the main transaction
    }
  }
}
