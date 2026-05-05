import { db } from '../../database/connection';
import { users, expertProfiles, customerProfiles } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { ProfileError } from './profile-errors';
import { auditLogger } from '../../utils/audit-logger';
import type {
  CreateExpertProfileData,
  CreateCustomerProfileData,
  ProfileData
} from './profile-types';

export class ProfileService {
  // Get user profile
  async getUserProfile(userId: string): Promise<ProfileData | null> {
    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditLogger.error('profile.get.error', { userId, error: errorMessage });
      throw error;
    }
  }

  // Create expert profile
  async createExpertProfile(userId: string, data: CreateExpertProfileData) {
    try {
      // Check if profile already exists
      const existing = await db
        .select()
        .from(expertProfiles)
        .where(eq(expertProfiles.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        throw new ProfileError('Expert profile already exists', 'PROFILE_EXISTS');
      }

      // Create expert profile
      const newProfile = await db
        .insert(expertProfiles)
        .values({
          userId,
          ...data,
          updatedAt: new Date()
        })
        .returning();

      // Mark user profile as completed
      await db
        .update(users)
        .set({
          isProfileCompleted: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      auditLogger.info('profile.expert.created', { userId, profileId: newProfile[0].id });
      return newProfile[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditLogger.error('profile.expert.create.error', { userId, error: errorMessage });
      throw error;
    }
  }

  // Create customer profile
  async createCustomerProfile(userId: string, data: CreateCustomerProfileData) {
    try {
      // Check if profile already exists
      const existing = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        throw new ProfileError('Customer profile already exists', 'PROFILE_EXISTS');
      }

      // Create customer profile
      const newProfile = await db
        .insert(customerProfiles)
        .values({
          userId,
          ...data,
          updatedAt: new Date()
        })
        .returning();

      // Mark user profile as completed and approved
      await db
        .update(users)
        .set({
          isProfileCompleted: true,
          isApproved: true,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      auditLogger.info('profile.customer.created', { userId, profileId: newProfile[0].id });
      return newProfile[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditLogger.error('profile.customer.create.error', { userId, error: errorMessage });
      throw error;
    }
  }

  // Update expert profile
  async updateExpertProfile(userId: string, data: Partial<CreateExpertProfileData>) {
    try {
      const updated = await db
        .update(expertProfiles)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(expertProfiles.userId, userId))
        .returning();

      if (!updated.length) {
        throw new ProfileError('Expert profile not found', 'PROFILE_NOT_FOUND');
      }

      auditLogger.info('profile.expert.updated', { userId, profileId: updated[0].id });
      return updated[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditLogger.error('profile.expert.update.error', { userId, error: errorMessage });
      throw error;
    }
  }

  // Update customer profile
  async updateCustomerProfile(userId: string, data: Partial<CreateCustomerProfileData>) {
    try {
      const updated = await db
        .update(customerProfiles)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(customerProfiles.userId, userId))
        .returning();

      if (!updated.length) {
        throw new ProfileError('Customer profile not found', 'PROFILE_NOT_FOUND');
      }

      auditLogger.info('profile.customer.updated', { userId, profileId: updated[0].id });
      return updated[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditLogger.error('profile.customer.update.error', { userId, error: errorMessage });
      throw error;
    }
  }

  // Approve expert profile (admin only)
  async approveExpertProfile(userId: string, adminUserId: string) {
    try {
      const updated = await db
        .update(users)
        .set({
          isApproved: true,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updated.length) {
        throw new ProfileError('User not found', 'USER_NOT_FOUND');
      }

      auditLogger.info('profile.expert.approved', {
        userId,
        adminUserId,
        approvedAt: updated[0].approvedAt
      });

      return updated[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditLogger.error('profile.expert.approve.error', {
        userId,
        adminUserId,
        error: errorMessage
      });
      throw error;
    }
  }

  // Reject expert profile (admin only)
  async rejectExpertProfile(userId: string, adminUserId: string) {
    try {
      const updated = await db
        .update(users)
        .set({
          isApproved: false,
          approvedAt: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updated.length) {
        throw new ProfileError('User not found', 'USER_NOT_FOUND');
      }

      auditLogger.info('profile.expert.rejected', {
        userId,
        adminUserId
      });

      return updated[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      auditLogger.error('profile.expert.reject.error', {
        userId,
        adminUserId,
        error: errorMessage
      });
      throw error;
    }
  }
}
