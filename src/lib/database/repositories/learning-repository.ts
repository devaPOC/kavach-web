import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../connection';
import { learningModules, moduleMaterials, learningProgress, users } from '../schema';
import type { Transaction } from '../transaction-service';

export interface CreateModuleData {
  title: string;
  description?: string;
  category: string;
  orderIndex: number;
  isPublished?: boolean;
}

export interface UpdateModuleData {
  title?: string;
  description?: string;
  category?: string;
  orderIndex?: number;
  isPublished?: boolean;
}

export interface CreateMaterialData {
  materialType: 'link' | 'video' | 'document';
  title: string;
  description?: string;
  materialData: {
    url?: string;
    embedCode?: string;
    fileUrl?: string;
    duration?: number;
  };
  orderIndex: number;
}

export interface UpdateMaterialData {
  materialType?: 'link' | 'video' | 'document';
  title?: string;
  description?: string;
  materialData?: {
    url?: string;
    embedCode?: string;
    fileUrl?: string;
    duration?: number;
  };
  orderIndex?: number;
}

export interface ModuleWithMaterials {
  id: string;
  createdBy: string;
  title: string;
  description: string | null;
  category: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  materials: Array<{
    id: string;
    moduleId: string;
    materialType: 'link' | 'video' | 'document';
    title: string;
    description: string | null;
    materialData: {
      url?: string;
      embedCode?: string;
      fileUrl?: string;
      duration?: number;
    };
    orderIndex: number;
    createdAt: Date;
  }>;
}

export interface ModuleFilters {
  category?: string;
  isPublished?: boolean;
  createdBy?: string;
  search?: string;
}

export interface ProgressFilters {
  userId?: string;
  moduleId?: string;
  materialId?: string;
  isCompleted?: boolean;
}

export interface UserModuleProgress {
  userId: string;
  moduleId: string;
  totalMaterials: number;
  completedMaterials: number;
  completionPercentage: number;
  lastAccessed: Date | null;
  isModuleCompleted: boolean;
}

/**
 * Repository for managing learning modules, materials, and user progress
 */
export class LearningRepository {
  constructor(private readonly database: any = db) { }

  // ===== MODULE MANAGEMENT =====

  /**
   * Create a new learning module (transaction-aware)
   */
  async createModule(createdBy: string, moduleData: CreateModuleData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      const [module] = await dbInstance
        .insert(learningModules)
        .values({
          createdBy,
          ...moduleData,
          isPublished: moduleData.isPublished ?? false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!module) {
        throw new Error('Failed to create learning module');
      }

      return module;
    } catch (error) {
      throw new Error(`Failed to create learning module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find module by ID (transaction-aware)
   */
  async findModuleById(id: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [module] = await dbInstance
        .select()
        .from(learningModules)
        .where(eq(learningModules.id, id))
        .limit(1);

      return module || null;
    } catch (error) {
      throw new Error(`Failed to find learning module by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find module with materials by ID (transaction-aware)
   */
  async findModuleByIdWithMaterials(id: string, tx?: Transaction): Promise<ModuleWithMaterials | null> {
    const dbInstance = tx || this.database;

    try {
      const module = await this.findModuleById(id, tx);
      if (!module) return null;

      const materials = await dbInstance
        .select()
        .from(moduleMaterials)
        .where(eq(moduleMaterials.moduleId, id))
        .orderBy(asc(moduleMaterials.orderIndex));

      return {
        ...module,
        materials
      };
    } catch (error) {
      throw new Error(`Failed to find module with materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find multiple modules with filters and pagination (transaction-aware)
   */
  async findModules(
    filters: ModuleFilters = {},
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select().from(learningModules);

      // Apply filters
      const conditions = [];
      if (filters.category) {
        conditions.push(eq(learningModules.category, filters.category));
      }
      if (filters.isPublished !== undefined) {
        conditions.push(eq(learningModules.isPublished, filters.isPublished));
      }
      if (filters.createdBy) {
        conditions.push(eq(learningModules.createdBy, filters.createdBy));
      }
      if (filters.search) {
        conditions.push(
          sql`(${learningModules.title} ILIKE ${`%${filters.search}%`} OR ${learningModules.description} ILIKE ${`%${filters.search}%`} OR ${learningModules.category} ILIKE ${`%${filters.search}%`})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const modules = await query
        .limit(limit)
        .offset(offset)
        .orderBy(asc(learningModules.orderIndex), desc(learningModules.createdAt));

      return modules;
    } catch (error) {
      throw new Error(`Failed to find learning modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find published modules for customers (transaction-aware)
   */
  async findPublishedModules(category?: string, limit: number = 20, offset: number = 0, tx?: Transaction): Promise<any[]> {
    const filters: ModuleFilters = { isPublished: true };
    if (category) {
      filters.category = category;
    }

    return this.findModulesWithMaterials(filters, limit, offset, tx);
  }

  /**
   * Find modules with their materials (transaction-aware)
   */
  async findModulesWithMaterials(
    filters: ModuleFilters = {},
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<ModuleWithMaterials[]> {
    const dbInstance = tx || this.database;

    try {
      // First get the modules
      const modules = await this.findModules(filters, limit, offset, tx);

      // Then get materials for each module
      const modulesWithMaterials = await Promise.all(
        modules.map(async (module) => {
          const materials = await dbInstance
            .select()
            .from(moduleMaterials)
            .where(eq(moduleMaterials.moduleId, module.id))
            .orderBy(asc(moduleMaterials.orderIndex));

          return {
            ...module,
            materials
          };
        })
      );

      return modulesWithMaterials;
    } catch (error) {
      throw new Error(`Failed to find modules with materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update module by ID (transaction-aware)
   */
  async updateModule(id: string, updateData: UpdateModuleData, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [module] = await dbInstance
        .update(learningModules)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(learningModules.id, id))
        .returning();

      return module || null;
    } catch (error) {
      throw new Error(`Failed to update learning module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete module by ID (transaction-aware)
   */
  async deleteModule(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      // Materials and progress will be deleted automatically due to cascade delete
      const result = await dbInstance
        .delete(learningModules)
        .where(eq(learningModules.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete learning module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total modules with filters (transaction-aware)
   */
  async countModules(filters: ModuleFilters = {}, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select({ count: sql`count(*)` }).from(learningModules);

      // Apply filters
      const conditions = [];
      if (filters.category) {
        conditions.push(eq(learningModules.category, filters.category));
      }
      if (filters.isPublished !== undefined) {
        conditions.push(eq(learningModules.isPublished, filters.isPublished));
      }
      if (filters.createdBy) {
        conditions.push(eq(learningModules.createdBy, filters.createdBy));
      }
      if (filters.search) {
        conditions.push(
          sql`(${learningModules.title} ILIKE ${`%${filters.search}%`} OR ${learningModules.description} ILIKE ${`%${filters.search}%`} OR ${learningModules.category} ILIKE ${`%${filters.search}%`})`
        );
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query;
      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count learning modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get unique categories (transaction-aware)
   */
  async getCategories(tx?: Transaction): Promise<string[]> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .selectDistinct({ category: learningModules.category })
        .from(learningModules)
        .where(eq(learningModules.isPublished, true))
        .orderBy(asc(learningModules.category));

      return result.map((r: any) => r.category);
    } catch (error) {
      throw new Error(`Failed to get categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== MATERIAL MANAGEMENT =====

  /**
   * Add material to module (transaction-aware)
   */
  async addMaterial(moduleId: string, materialData: CreateMaterialData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      const [material] = await dbInstance
        .insert(moduleMaterials)
        .values({
          moduleId,
          ...materialData,
          createdAt: new Date()
        })
        .returning();

      if (!material) {
        throw new Error('Failed to create material');
      }

      return material;
    } catch (error) {
      throw new Error(`Failed to add material: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find material by ID (transaction-aware)
   */
  async findMaterialById(id: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [material] = await dbInstance
        .select()
        .from(moduleMaterials)
        .where(eq(moduleMaterials.id, id))
        .limit(1);

      return material || null;
    } catch (error) {
      throw new Error(`Failed to find material by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update material by ID (transaction-aware)
   */
  async updateMaterial(id: string, updateData: UpdateMaterialData, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;

    try {
      const [material] = await dbInstance
        .update(moduleMaterials)
        .set(updateData)
        .where(eq(moduleMaterials.id, id))
        .returning();

      return material || null;
    } catch (error) {
      throw new Error(`Failed to update material: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete material by ID (transaction-aware)
   */
  async deleteMaterial(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const result = await dbInstance
        .delete(moduleMaterials)
        .where(eq(moduleMaterials.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete material: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get materials for a module (transaction-aware)
   */
  async getModuleMaterials(moduleId: string, tx?: Transaction): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      const materials = await dbInstance
        .select()
        .from(moduleMaterials)
        .where(eq(moduleMaterials.moduleId, moduleId))
        .orderBy(asc(moduleMaterials.orderIndex));

      return materials;
    } catch (error) {
      throw new Error(`Failed to get module materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reorder materials for a module (transaction-aware)
   */
  async reorderMaterials(materialIds: string[], tx?: Transaction): Promise<void> {
    const dbInstance = tx || this.database;

    try {
      for (let i = 0; i < materialIds.length; i++) {
        await dbInstance
          .update(moduleMaterials)
          .set({ orderIndex: i + 1 })
          .where(eq(moduleMaterials.id, materialIds[i]));
      }
    } catch (error) {
      throw new Error(`Failed to reorder materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== PROGRESS MANAGEMENT =====

  /**
   * Mark material as completed for user (transaction-aware)
   */
  async markMaterialCompleted(userId: string, moduleId: string, materialId: string, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      // Check if progress record exists
      const [existingProgress] = await dbInstance
        .select()
        .from(learningProgress)
        .where(and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.moduleId, moduleId),
          eq(learningProgress.materialId, materialId)
        ))
        .limit(1);

      if (existingProgress) {
        // Update existing record
        const [progress] = await dbInstance
          .update(learningProgress)
          .set({
            isCompleted: true,
            completedAt: new Date(),
            lastAccessed: new Date()
          })
          .where(eq(learningProgress.id, existingProgress.id))
          .returning();

        return progress;
      } else {
        // Create new progress record
        const [progress] = await dbInstance
          .insert(learningProgress)
          .values({
            userId,
            moduleId,
            materialId,
            isCompleted: true,
            completedAt: new Date(),
            lastAccessed: new Date()
          })
          .returning();

        return progress;
      }
    } catch (error) {
      throw new Error(`Failed to mark material completed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track material access for user (transaction-aware)
   */
  async trackMaterialAccess(userId: string, moduleId: string, materialId: string, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;

    try {
      // Check if progress record exists
      const [existingProgress] = await dbInstance
        .select()
        .from(learningProgress)
        .where(and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.moduleId, moduleId),
          eq(learningProgress.materialId, materialId)
        ))
        .limit(1);

      if (existingProgress) {
        // Update last accessed time
        const [progress] = await dbInstance
          .update(learningProgress)
          .set({
            lastAccessed: new Date()
          })
          .where(eq(learningProgress.id, existingProgress.id))
          .returning();

        return progress;
      } else {
        // Create new progress record
        const [progress] = await dbInstance
          .insert(learningProgress)
          .values({
            userId,
            moduleId,
            materialId,
            isCompleted: false,
            lastAccessed: new Date()
          })
          .returning();

        return progress;
      }
    } catch (error) {
      throw new Error(`Failed to track material access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's progress for a module (transaction-aware)
   */
  async getUserModuleProgress(userId: string, moduleId: string, tx?: Transaction): Promise<UserModuleProgress> {
    const dbInstance = tx || this.database;

    try {
      // Get total materials count
      const totalMaterialsResult = await dbInstance
        .select({ count: sql`count(*)` })
        .from(moduleMaterials)
        .where(eq(moduleMaterials.moduleId, moduleId));

      const totalMaterials = parseInt(totalMaterialsResult[0]?.count || '0');

      // Get completed materials count
      const completedMaterialsResult = await dbInstance
        .select({ count: sql`count(*)` })
        .from(learningProgress)
        .where(and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.moduleId, moduleId),
          eq(learningProgress.isCompleted, true)
        ));

      const completedMaterials = parseInt(completedMaterialsResult[0]?.count || '0');

      // Get last accessed time
      const lastAccessedResult = await dbInstance
        .select({ lastAccessed: learningProgress.lastAccessed })
        .from(learningProgress)
        .where(and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.moduleId, moduleId)
        ))
        .orderBy(desc(learningProgress.lastAccessed))
        .limit(1);

      const completionPercentage = totalMaterials > 0 ? (completedMaterials / totalMaterials) * 100 : 0;

      return {
        userId,
        moduleId,
        totalMaterials,
        completedMaterials,
        completionPercentage,
        lastAccessed: lastAccessedResult[0]?.lastAccessed || null,
        isModuleCompleted: completionPercentage === 100
      };
    } catch (error) {
      throw new Error(`Failed to get user module progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's progress for all modules (transaction-aware)
   */
  async getUserAllModulesProgress(userId: string, tx?: Transaction): Promise<UserModuleProgress[]> {
    const dbInstance = tx || this.database;

    try {
      // Get all published modules
      const modules = await this.findPublishedModules(undefined, 1000, 0, tx);

      const progressPromises = modules.map(module =>
        this.getUserModuleProgress(userId, module.id, tx)
      );

      return Promise.all(progressPromises);
    } catch (error) {
      throw new Error(`Failed to get user all modules progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find progress records with filters (transaction-aware)
   */
  async findProgress(
    filters: ProgressFilters = {},
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<any[]> {
    const dbInstance = tx || this.database;

    try {
      let query = dbInstance.select().from(learningProgress);

      // Apply filters
      const conditions = [];
      if (filters.userId) {
        conditions.push(eq(learningProgress.userId, filters.userId));
      }
      if (filters.moduleId) {
        conditions.push(eq(learningProgress.moduleId, filters.moduleId));
      }
      if (filters.materialId) {
        conditions.push(eq(learningProgress.materialId, filters.materialId));
      }
      if (filters.isCompleted !== undefined) {
        conditions.push(eq(learningProgress.isCompleted, filters.isCompleted));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const progress = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(learningProgress.lastAccessed));

      return progress;
    } catch (error) {
      throw new Error(`Failed to find progress records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if module exists (transaction-aware)
   */
  async moduleExists(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [module] = await dbInstance
        .select({ id: learningModules.id })
        .from(learningModules)
        .where(eq(learningModules.id, id))
        .limit(1);

      return !!module;
    } catch (error) {
      throw new Error(`Failed to check module existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if material exists (transaction-aware)
   */
  async materialExists(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [material] = await dbInstance
        .select({ id: moduleMaterials.id })
        .from(moduleMaterials)
        .where(eq(moduleMaterials.id, id))
        .limit(1);

      return !!material;
    } catch (error) {
      throw new Error(`Failed to check material existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archive a learning module (soft delete)
   */
  async archiveModule(id: string, archivedBy: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [updatedModule] = await dbInstance
        .update(learningModules)
        .set({
          isArchived: true,
          archivedAt: new Date(),
          archivedBy,
          updatedAt: new Date()
        })
        .where(eq(learningModules.id, id))
        .returning({ id: learningModules.id });

      return !!updatedModule;
    } catch (error) {
      throw new Error(`Failed to archive learning module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unarchive a learning module
   */
  async unarchiveModule(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      const [updatedModule] = await dbInstance
        .update(learningModules)
        .set({
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          updatedAt: new Date()
        })
        .where(eq(learningModules.id, id))
        .returning({ id: learningModules.id });

      return !!updatedModule;
    } catch (error) {
      throw new Error(`Failed to unarchive learning module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if learning module can be deleted (no progress records)
   */
  async canModuleBeDeleted(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;

    try {
      // Check if module has any progress records
      const [progress] = await dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(learningProgress)
        .where(eq(learningProgress.moduleId, id))
        .limit(1);

      const hasProgress = progress && progress.count > 0;

      // Also check if module is published - if so, be safe and don't allow deletion
      const [module] = await dbInstance
        .select({
          isPublished: learningModules.isPublished,
          createdAt: learningModules.createdAt
        })
        .from(learningModules)
        .where(eq(learningModules.id, id))
        .limit(1);

      if (!module) return false;

      // If module has progress or is published, it can't be deleted
      if (hasProgress || module.isPublished) return false;

      // If module is older than 1 day, be safe and don't allow deletion
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      return new Date(module.createdAt) > oneDayAgo;
    } catch (error) {
      throw new Error(`Failed to check if learning module can be deleted: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get users who have progress in a specific module
   */
  async getUsersWithModuleProgress(moduleId: string, tx?: Transaction): Promise<Array<{ userId: string }>> {
    const dbInstance = tx || this.database;

    try {
      const users = await dbInstance
        .selectDistinct({ userId: learningProgress.userId })
        .from(learningProgress)
        .where(eq(learningProgress.moduleId, moduleId));

      return users;
    } catch (error) {
      throw new Error(`Failed to get users with module progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get count of progress records for a specific material
   */
  async getMaterialProgressCount(materialId: string, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      const [result] = await dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(learningProgress)
        .where(eq(learningProgress.materialId, materialId));

      return result?.count || 0;
    } catch (error) {
      throw new Error(`Failed to get material progress count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get count of progress records for a specific module
   */
  async getModuleProgressCount(moduleId: string, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;

    try {
      const [result] = await dbInstance
        .select({ count: sql<number>`count(*)` })
        .from(learningProgress)
        .where(eq(learningProgress.moduleId, moduleId));

      return result?.count || 0;
    } catch (error) {
      throw new Error(`Failed to get module progress count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const learningRepository = new LearningRepository();
