import { eq } from 'drizzle-orm';
import { db } from '../connection';
import { expertProfiles, customerProfiles } from '../schema';
import type { Transaction } from '../transaction-service';
import type { ExpertProfileData, CustomerProfileData } from '../profile-transaction';

/**
 * Expert Profile Repository with transaction support
 */
export class ExpertProfileRepository {
  constructor(private readonly database: any = db) {}

  /**
   * Create expert profile (transaction-aware)
   */
  async create(userId: string, profileData: ExpertProfileData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
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

      return profile;
    } catch (error) {
      const pgCode = (error as any)?.code;
      if (pgCode === '23505' || (error instanceof Error && error.message.includes('unique constraint'))) {
        throw new Error('Expert profile already exists for this user');
      }
      throw new Error(`Failed to create expert profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find expert profile by user ID (transaction-aware)
   */
  async findByUserId(userId: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
        .select()
        .from(expertProfiles)
        .where(eq(expertProfiles.userId, userId))
        .limit(1);

      return profile || null;
    } catch (error) {
      throw new Error(`Failed to find expert profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update expert profile (transaction-aware)
   */
  async update(userId: string, profileData: Partial<ExpertProfileData>, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
        .update(expertProfiles)
        .set({
          ...profileData,
          updatedAt: new Date()
        })
        .where(eq(expertProfiles.userId, userId))
        .returning();

      return profile || null;
    } catch (error) {
      throw new Error(`Failed to update expert profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete expert profile (transaction-aware)
   */
  async delete(userId: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;
    
    try {
      const result = await dbInstance
        .delete(expertProfiles)
        .where(eq(expertProfiles.userId, userId));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete expert profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if expert profile exists (transaction-aware)
   */
  async exists(userId: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
        .select({ id: expertProfiles.id })
        .from(expertProfiles)
        .where(eq(expertProfiles.userId, userId))
        .limit(1);

      return !!profile;
    } catch (error) {
      throw new Error(`Failed to check expert profile existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Customer Profile Repository with transaction support
 */
export class CustomerProfileRepository {
  constructor(private readonly database: any = db) {}

  /**
   * Create customer profile (transaction-aware)
   */
  async create(userId: string, profileData: CustomerProfileData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
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

      return profile;
    } catch (error) {
      const pgCode = (error as any)?.code;
      if (pgCode === '23505' || (error instanceof Error && error.message.includes('unique constraint'))) {
        throw new Error('Customer profile already exists for this user');
      }
      throw new Error(`Failed to create customer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find customer profile by user ID (transaction-aware)
   */
  async findByUserId(userId: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, userId))
        .limit(1);

      return profile || null;
    } catch (error) {
      throw new Error(`Failed to find customer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update customer profile (transaction-aware)
   */
  async update(userId: string, profileData: Partial<CustomerProfileData>, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
        .update(customerProfiles)
        .set({
          ...profileData,
          updatedAt: new Date()
        })
        .where(eq(customerProfiles.userId, userId))
        .returning();

      return profile || null;
    } catch (error) {
      throw new Error(`Failed to update customer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete customer profile (transaction-aware)
   */
  async delete(userId: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;
    
    try {
      const result = await dbInstance
        .delete(customerProfiles)
        .where(eq(customerProfiles.userId, userId));

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete customer profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if customer profile exists (transaction-aware)
   */
  async exists(userId: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;
    
    try {
      const [profile] = await dbInstance
        .select({ id: customerProfiles.id })
        .from(customerProfiles)
        .where(eq(customerProfiles.userId, userId))
        .limit(1);

      return !!profile;
    } catch (error) {
      throw new Error(`Failed to check customer profile existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instances
export const expertProfileRepository = new ExpertProfileRepository();
export const customerProfileRepository = new CustomerProfileRepository();