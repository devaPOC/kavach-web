import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../connection';
import { quizTemplates } from '../schema';
import type { Transaction } from '../transaction-service';

export interface CreateTemplateData {
  name: string;
  description?: string;
  templateConfig: {
    timeLimitMinutes: number;
    maxAttempts: number;
    language: 'en' | 'ar';
    questionTypes: string[];
    defaultQuestionCount: number;
  };
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  templateConfig?: {
    timeLimitMinutes?: number;
    maxAttempts?: number;
    language?: 'en' | 'ar';
    questionTypes?: string[];
    defaultQuestionCount?: number;
  };
}

export interface TemplateFilters {
  createdBy?: string;
  language?: 'en' | 'ar';
  nameSearch?: string;
}

export interface TemplateWithUsage {
  id: string;
  createdBy: string;
  name: string;
  description: string | null;
  templateConfig: {
    timeLimitMinutes: number;
    maxAttempts: number;
    language: 'en' | 'ar';
    questionTypes: string[];
    defaultQuestionCount: number;
  };
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  recentUsage?: {
    lastUsed: Date | null;
    usedThisMonth: number;
    usedThisWeek: number;
  };
}

/**
 * Repository for managing quiz templates
 */
export class TemplateRepository {
  constructor(private readonly database: any = db) {}

  /**
   * Create a new quiz template (transaction-aware)
   */
  async create(createdBy: string, templateData: CreateTemplateData, tx?: Transaction): Promise<any> {
    const dbInstance = tx || this.database;
    
    try {
      const [template] = await dbInstance
        .insert(quizTemplates)
        .values({
          createdBy,
          ...templateData,
          usageCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!template) {
        throw new Error('Failed to create quiz template');
      }

      return template;
    } catch (error) {
      throw new Error(`Failed to create quiz template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find template by ID (transaction-aware)
   */
  async findById(id: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      const [template] = await dbInstance
        .select()
        .from(quizTemplates)
        .where(eq(quizTemplates.id, id))
        .limit(1);

      return template || null;
    } catch (error) {
      throw new Error(`Failed to find template by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find template with usage statistics (transaction-aware)
   */
  async findByIdWithUsage(id: string, tx?: Transaction): Promise<TemplateWithUsage | null> {
    const dbInstance = tx || this.database;
    
    try {
      const template = await this.findById(id, tx);
      if (!template) return null;

      // Get recent usage statistics
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Note: This would require joining with quizzes table to get actual usage stats
      // For now, we'll return the basic template with placeholder usage data
      const recentUsage = {
        lastUsed: null,
        usedThisMonth: 0,
        usedThisWeek: 0
      };

      return {
        ...template,
        recentUsage
      };
    } catch (error) {
      throw new Error(`Failed to find template with usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find multiple templates with filters and pagination (transaction-aware)
   */
  async findMany(
    filters: TemplateFilters = {},
    limit: number = 20,
    offset: number = 0,
    tx?: Transaction
  ): Promise<any[]> {
    const dbInstance = tx || this.database;
    
    try {
      let query = dbInstance.select().from(quizTemplates);

      // Apply filters
      const conditions = [];
      if (filters.createdBy) {
        conditions.push(eq(quizTemplates.createdBy, filters.createdBy));
      }
      if (filters.language) {
        conditions.push(sql`${quizTemplates.templateConfig}->>'language' = ${filters.language}`);
      }
      if (filters.nameSearch) {
        conditions.push(sql`${quizTemplates.name} ILIKE ${'%' + filters.nameSearch + '%'}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const templates = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(quizTemplates.usageCount), desc(quizTemplates.createdAt));

      return templates;
    } catch (error) {
      throw new Error(`Failed to find templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find templates by creator (transaction-aware)
   */
  async findByCreator(createdBy: string, limit: number = 20, offset: number = 0, tx?: Transaction): Promise<any[]> {
    const filters: TemplateFilters = { createdBy };
    return this.findMany(filters, limit, offset, tx);
  }

  /**
   * Find popular templates (most used) (transaction-aware)
   */
  async findPopular(limit: number = 10, tx?: Transaction): Promise<any[]> {
    const dbInstance = tx || this.database;
    
    try {
      const templates = await dbInstance
        .select()
        .from(quizTemplates)
        .where(sql`${quizTemplates.usageCount} > 0`)
        .orderBy(desc(quizTemplates.usageCount), desc(quizTemplates.updatedAt))
        .limit(limit);

      return templates;
    } catch (error) {
      throw new Error(`Failed to find popular templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update template by ID (transaction-aware)
   */
  async update(id: string, updateData: UpdateTemplateData, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      // If templateConfig is being updated, merge with existing config
      let finalUpdateData = { ...updateData };
      
      if (updateData.templateConfig) {
        const existingTemplate = await this.findById(id, tx);
        if (existingTemplate) {
          finalUpdateData.templateConfig = {
            ...existingTemplate.templateConfig,
            ...updateData.templateConfig
          };
        }
      }

      const [template] = await dbInstance
        .update(quizTemplates)
        .set({
          ...finalUpdateData,
          updatedAt: new Date()
        })
        .where(eq(quizTemplates.id, id))
        .returning();

      return template || null;
    } catch (error) {
      throw new Error(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete template by ID (transaction-aware)
   */
  async delete(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;
    
    try {
      const result = await dbInstance
        .delete(quizTemplates)
        .where(eq(quizTemplates.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Increment template usage count (transaction-aware)
   */
  async incrementUsage(id: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      const [template] = await dbInstance
        .update(quizTemplates)
        .set({
          usageCount: sql`${quizTemplates.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(quizTemplates.id, id))
        .returning();

      return template || null;
    } catch (error) {
      throw new Error(`Failed to increment template usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Duplicate template (create copy) (transaction-aware)
   */
  async duplicate(id: string, createdBy: string, newName?: string, tx?: Transaction): Promise<any | null> {
    const dbInstance = tx || this.database;
    
    try {
      const originalTemplate = await this.findById(id, tx);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      const duplicateData: CreateTemplateData = {
        name: newName || `${originalTemplate.name} (Copy)`,
        description: originalTemplate.description,
        templateConfig: originalTemplate.templateConfig
      };

      return this.create(createdBy, duplicateData, tx);
    } catch (error) {
      throw new Error(`Failed to duplicate template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count total templates with filters (transaction-aware)
   */
  async count(filters: TemplateFilters = {}, tx?: Transaction): Promise<number> {
    const dbInstance = tx || this.database;
    
    try {
      let query = dbInstance.select({ count: sql`count(*)` }).from(quizTemplates);

      // Apply filters
      const conditions = [];
      if (filters.createdBy) {
        conditions.push(eq(quizTemplates.createdBy, filters.createdBy));
      }
      if (filters.language) {
        conditions.push(sql`${quizTemplates.templateConfig}->>'language' = ${filters.language}`);
      }
      if (filters.nameSearch) {
        conditions.push(sql`${quizTemplates.name} ILIKE ${'%' + filters.nameSearch + '%'}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query;
      return parseInt(result[0]?.count || '0');
    } catch (error) {
      throw new Error(`Failed to count templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template usage statistics (transaction-aware)
   */
  async getUsageStatistics(id: string, tx?: Transaction): Promise<{
    totalUsage: number;
    recentUsage: {
      lastMonth: number;
      lastWeek: number;
      lastDay: number;
    };
    averageUsagePerMonth: number;
  }> {
    const dbInstance = tx || this.database;
    
    try {
      const template = await this.findById(id, tx);
      if (!template) {
        throw new Error('Template not found');
      }

      // Calculate average usage per month since creation
      const monthsSinceCreation = Math.max(1, 
        Math.floor((Date.now() - template.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
      );
      
      const averageUsagePerMonth = template.usageCount / monthsSinceCreation;

      // Note: For detailed recent usage statistics, we would need to track
      // individual quiz creation events with timestamps. For now, return
      // basic statistics based on the usage count.
      
      return {
        totalUsage: template.usageCount,
        recentUsage: {
          lastMonth: 0, // Would need quiz creation tracking
          lastWeek: 0,  // Would need quiz creation tracking
          lastDay: 0    // Would need quiz creation tracking
        },
        averageUsagePerMonth
      };
    } catch (error) {
      throw new Error(`Failed to get usage statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search templates by name or description (transaction-aware)
   */
  async search(searchTerm: string, limit: number = 20, offset: number = 0, tx?: Transaction): Promise<any[]> {
    const dbInstance = tx || this.database;
    
    try {
      const templates = await dbInstance
        .select()
        .from(quizTemplates)
        .where(
          sql`${quizTemplates.name} ILIKE ${'%' + searchTerm + '%'} OR ${quizTemplates.description} ILIKE ${'%' + searchTerm + '%'}`
        )
        .limit(limit)
        .offset(offset)
        .orderBy(desc(quizTemplates.usageCount), desc(quizTemplates.createdAt));

      return templates;
    } catch (error) {
      throw new Error(`Failed to search templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get templates by language (transaction-aware)
   */
  async findByLanguage(language: 'en' | 'ar', limit: number = 20, offset: number = 0, tx?: Transaction): Promise<any[]> {
    const filters: TemplateFilters = { language };
    return this.findMany(filters, limit, offset, tx);
  }

  /**
   * Check if template exists (transaction-aware)
   */
  async exists(id: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;
    
    try {
      const [template] = await dbInstance
        .select({ id: quizTemplates.id })
        .from(quizTemplates)
        .where(eq(quizTemplates.id, id))
        .limit(1);

      return !!template;
    } catch (error) {
      throw new Error(`Failed to check template existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user owns template (transaction-aware)
   */
  async isOwner(id: string, userId: string, tx?: Transaction): Promise<boolean> {
    const dbInstance = tx || this.database;
    
    try {
      const [template] = await dbInstance
        .select({ id: quizTemplates.id })
        .from(quizTemplates)
        .where(and(
          eq(quizTemplates.id, id),
          eq(quizTemplates.createdBy, userId)
        ))
        .limit(1);

      return !!template;
    } catch (error) {
      throw new Error(`Failed to check template ownership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template configuration for quiz creation (transaction-aware)
   */
  async getConfigForQuiz(id: string, tx?: Transaction): Promise<{
    timeLimitMinutes: number;
    maxAttempts: number;
    language: 'en' | 'ar';
    questionTypes: string[];
    defaultQuestionCount: number;
  } | null> {
    const dbInstance = tx || this.database;
    
    try {
      const template = await this.findById(id, tx);
      if (!template) return null;

      // Increment usage count when template is used for quiz creation
      await this.incrementUsage(id, tx);

      return template.templateConfig;
    } catch (error) {
      throw new Error(`Failed to get template config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const templateRepository = new TemplateRepository();