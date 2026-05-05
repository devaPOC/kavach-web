#!/usr/bin/env bun
/**
 * Enhanced Data Cleanup Script for Kavach Awareness Lab
 *
 * This script provides comprehensive cleanup utilities for removing orphaned data,
 * unused templates, archived content, and optimizing database performance.
 *
 * Usage:
 *   bun run scripts/data-cleanup.ts [options]
 *
 * Options:
 *   --dry-run: Preview what would be cleaned without making changes
 *   --orphaned: Clean orphaned records only
 *   --templates: Clean unused templates only
 *   --archived: Clean old archived content only
 *   --optimize: Run database optimization only
 *   --all: Run all cleanup operations (default)
 *   --force: Skip confirmation prompts
 *
 * Environment Variables:
 *   - NODE_ENV: Environment (development, production)
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { db } from '../src/lib/database/connection';
import { 
  quizzes, 
  quizQuestions, 
  quizAttempts, 
  quizTemplates,
  learningModules,
  moduleMaterials,
  learningProgress,
  users
} from '../src/lib/database/schema';
import { logger } from '../src/lib/utils/logger';
import { eq, isNull, sql, and, notExists, lt } from 'drizzle-orm';

interface CleanupOperation {
  name: string;
  description: string;
  query: string;
  estimatedRecords: number;
  severity: 'low' | 'medium' | 'high';
  reversible: boolean;
}

interface CleanupStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  recordsDeleted: number;
  recordsUpdated: number;
  errors: string[];
  operations: {
    name: string;
    recordsAffected: number;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Identify orphaned quiz data for cleanup
 */
async function identifyOrphanedQuizData(dryRun: boolean = false): Promise<CleanupOperation[]> {
  const operations: CleanupOperation[] = [];

  try {
    // Count orphaned quiz questions
    const orphanedQuestionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizQuestions)
      .leftJoin(quizzes, eq(quizQuestions.quizId, quizzes.id))
      .where(isNull(quizzes.id));

    if (orphanedQuestionsCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_orphaned_quiz_questions',
        description: `Remove ${orphanedQuestionsCount[0].count} orphaned quiz questions`,
        query: `DELETE FROM quiz_questions WHERE quiz_id NOT IN (SELECT id FROM quizzes)`,
        estimatedRecords: orphanedQuestionsCount[0].count,
        severity: 'medium',
        reversible: false
      });
    }

    // Count orphaned quiz attempts
    const orphanedAttemptsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizAttempts)
      .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(isNull(quizzes.id));

    if (orphanedAttemptsCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_orphaned_quiz_attempts',
        description: `Remove ${orphanedAttemptsCount[0].count} orphaned quiz attempts`,
        query: `DELETE FROM quiz_attempts WHERE quiz_id NOT IN (SELECT id FROM quizzes)`,
        estimatedRecords: orphanedAttemptsCount[0].count,
        severity: 'high',
        reversible: false
      });
    }

    // Count orphaned user attempts
    const orphanedUserAttemptsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizAttempts)
      .leftJoin(users, eq(quizAttempts.userId, users.id))
      .where(isNull(users.id));

    if (orphanedUserAttemptsCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_orphaned_user_attempts',
        description: `Remove ${orphanedUserAttemptsCount[0].count} quiz attempts from deleted users`,
        query: `DELETE FROM quiz_attempts WHERE user_id NOT IN (SELECT id FROM users)`,
        estimatedRecords: orphanedUserAttemptsCount[0].count,
        severity: 'high',
        reversible: false
      });
    }

    // Count incomplete attempts older than 7 days
    const staleAttemptsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.isCompleted, false),
          sql`${quizAttempts.startedAt} < NOW() - INTERVAL '7 days'`
        )
      );

    if (staleAttemptsCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_stale_attempts',
        description: `Remove ${staleAttemptsCount[0].count} incomplete attempts older than 7 days`,
        query: `DELETE FROM quiz_attempts WHERE is_completed = false AND started_at < NOW() - INTERVAL '7 days'`,
        estimatedRecords: staleAttemptsCount[0].count,
        severity: 'low',
        reversible: false
      });
    }

  } catch (error) {
    logger.error('Error identifying orphaned quiz data', { error });
  }

  return operations;
}

/**
 * Identify orphaned learning materials data for cleanup
 */
async function identifyOrphanedLearningData(dryRun: boolean = false): Promise<CleanupOperation[]> {
  const operations: CleanupOperation[] = [];

  try {
    // Count orphaned module materials
    const orphanedMaterialsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(moduleMaterials)
      .leftJoin(learningModules, eq(moduleMaterials.moduleId, learningModules.id))
      .where(isNull(learningModules.id));

    if (orphanedMaterialsCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_orphaned_materials',
        description: `Remove ${orphanedMaterialsCount[0].count} orphaned module materials`,
        query: `DELETE FROM module_materials WHERE module_id NOT IN (SELECT id FROM learning_modules)`,
        estimatedRecords: orphanedMaterialsCount[0].count,
        severity: 'medium',
        reversible: false
      });
    }

    // Count orphaned learning progress (module)
    const orphanedModuleProgressCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningProgress)
      .leftJoin(learningModules, eq(learningProgress.moduleId, learningModules.id))
      .where(isNull(learningModules.id));

    if (orphanedModuleProgressCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_orphaned_module_progress',
        description: `Remove ${orphanedModuleProgressCount[0].count} progress records for deleted modules`,
        query: `DELETE FROM learning_progress WHERE module_id NOT IN (SELECT id FROM learning_modules)`,
        estimatedRecords: orphanedModuleProgressCount[0].count,
        severity: 'medium',
        reversible: false
      });
    }

    // Count orphaned learning progress (material)
    const orphanedMaterialProgressCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningProgress)
      .leftJoin(moduleMaterials, eq(learningProgress.materialId, moduleMaterials.id))
      .where(
        and(
          sql`${learningProgress.materialId} IS NOT NULL`,
          isNull(moduleMaterials.id)
        )
      );

    if (orphanedMaterialProgressCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_orphaned_material_progress',
        description: `Fix ${orphanedMaterialProgressCount[0].count} progress records with invalid material references`,
        query: `UPDATE learning_progress SET material_id = NULL WHERE material_id IS NOT NULL AND material_id NOT IN (SELECT id FROM module_materials)`,
        estimatedRecords: orphanedMaterialProgressCount[0].count,
        severity: 'low',
        reversible: true
      });
    }

    // Count orphaned learning progress (user)
    const orphanedUserProgressCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningProgress)
      .leftJoin(users, eq(learningProgress.userId, users.id))
      .where(isNull(users.id));

    if (orphanedUserProgressCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_orphaned_user_progress',
        description: `Remove ${orphanedUserProgressCount[0].count} progress records from deleted users`,
        query: `DELETE FROM learning_progress WHERE user_id NOT IN (SELECT id FROM users)`,
        estimatedRecords: orphanedUserProgressCount[0].count,
        severity: 'high',
        reversible: false
      });
    }

  } catch (error) {
    logger.error('Error identifying orphaned learning data', { error });
  }

  return operations;
}

/**
 * Identify unused templates for cleanup
 */
async function identifyUnusedTemplates(dryRun: boolean = false): Promise<CleanupOperation[]> {
  const operations: CleanupOperation[] = [];

  try {
    // Count unused quiz templates (not referenced by any quiz)
    const unusedTemplatesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizTemplates)
      .where(
        notExists(
          db.select().from(quizzes).where(eq(quizzes.templateId, quizTemplates.id))
        )
      );

    if (unusedTemplatesCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_unused_templates',
        description: `Remove ${unusedTemplatesCount[0].count} unused quiz templates`,
        query: `DELETE FROM quiz_templates WHERE id NOT IN (SELECT DISTINCT template_id FROM quizzes WHERE template_id IS NOT NULL)`,
        estimatedRecords: unusedTemplatesCount[0].count,
        severity: 'low',
        reversible: false
      });
    }

    // Count templates with zero usage count but are actually used
    const inconsistentTemplateUsageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizTemplates)
      .where(
        and(
          eq(quizTemplates.usageCount, 0),
          sql`EXISTS (SELECT 1 FROM quizzes WHERE template_id = quiz_templates.id)`
        )
      );

    if (inconsistentTemplateUsageCount[0]?.count > 0) {
      operations.push({
        name: 'fix_template_usage_count',
        description: `Fix usage count for ${inconsistentTemplateUsageCount[0].count} templates`,
        query: `UPDATE quiz_templates SET usage_count = (SELECT COUNT(*) FROM quizzes WHERE template_id = quiz_templates.id) WHERE usage_count = 0 AND EXISTS (SELECT 1 FROM quizzes WHERE template_id = quiz_templates.id)`,
        estimatedRecords: inconsistentTemplateUsageCount[0].count,
        severity: 'low',
        reversible: true
      });
    }

  } catch (error) {
    logger.error('Error identifying unused templates', { error });
  }

  return operations;
}

/**
 * Identify old archived content for cleanup
 */
async function identifyArchivedContent(dryRun: boolean = false): Promise<CleanupOperation[]> {
  const operations: CleanupOperation[] = [];

  try {
    // Count old archived quizzes (archived more than 1 year ago)
    const oldArchivedQuizzesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizzes)
      .where(
        and(
          eq(quizzes.isArchived, true),
          sql`${quizzes.archivedAt} < NOW() - INTERVAL '1 year'`
        )
      );

    if (oldArchivedQuizzesCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_old_archived_quizzes',
        description: `Remove ${oldArchivedQuizzesCount[0].count} quizzes archived over 1 year ago`,
        query: `DELETE FROM quizzes WHERE is_archived = true AND archived_at < NOW() - INTERVAL '1 year'`,
        estimatedRecords: oldArchivedQuizzesCount[0].count,
        severity: 'medium',
        reversible: false
      });
    }

    // Count old archived learning modules
    const oldArchivedModulesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(learningModules)
      .where(
        and(
          eq(learningModules.isArchived, true),
          sql`${learningModules.archivedAt} < NOW() - INTERVAL '1 year'`
        )
      );

    if (oldArchivedModulesCount[0]?.count > 0) {
      operations.push({
        name: 'cleanup_old_archived_modules',
        description: `Remove ${oldArchivedModulesCount[0].count} learning modules archived over 1 year ago`,
        query: `DELETE FROM learning_modules WHERE is_archived = true AND archived_at < NOW() - INTERVAL '1 year'`,
        estimatedRecords: oldArchivedModulesCount[0].count,
        severity: 'medium',
        reversible: false
      });
    }

    // Count quizzes that should be auto-archived (end date passed by more than 30 days)
    const shouldBeArchivedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quizzes)
      .where(
        and(
          eq(quizzes.isArchived, false),
          sql`${quizzes.endDate} < NOW() - INTERVAL '30 days'`
        )
      );

    if (shouldBeArchivedCount[0]?.count > 0) {
      operations.push({
        name: 'auto_archive_expired_quizzes',
        description: `Archive ${shouldBeArchivedCount[0].count} quizzes that expired over 30 days ago`,
        query: `UPDATE quizzes SET is_archived = true, archived_at = NOW() WHERE is_archived = false AND end_date < NOW() - INTERVAL '30 days'`,
        estimatedRecords: shouldBeArchivedCount[0].count,
        severity: 'low',
        reversible: true
      });
    }

  } catch (error) {
    logger.error('Error identifying archived content', { error });
  }

  return operations;
}

/**
 * Generate database optimization operations
 */
async function identifyOptimizationOperations(dryRun: boolean = false): Promise<CleanupOperation[]> {
  const operations: CleanupOperation[] = [];

  // Database optimization operations
  operations.push({
    name: 'vacuum_analyze_quizzes',
    description: 'Optimize quizzes table (VACUUM ANALYZE)',
    query: 'VACUUM ANALYZE quizzes',
    estimatedRecords: 0,
    severity: 'low',
    reversible: true
  });

  operations.push({
    name: 'vacuum_analyze_quiz_attempts',
    description: 'Optimize quiz_attempts table (VACUUM ANALYZE)',
    query: 'VACUUM ANALYZE quiz_attempts',
    estimatedRecords: 0,
    severity: 'low',
    reversible: true
  });

  operations.push({
    name: 'vacuum_analyze_learning_progress',
    description: 'Optimize learning_progress table (VACUUM ANALYZE)',
    query: 'VACUUM ANALYZE learning_progress',
    estimatedRecords: 0,
    severity: 'low',
    reversible: true
  });

  operations.push({
    name: 'reindex_awareness_lab_tables',
    description: 'Rebuild indexes for awareness lab tables',
    query: 'REINDEX SCHEMA public',
    estimatedRecords: 0,
    severity: 'low',
    reversible: true
  });

  return operations;
}

/**
 * Execute cleanup operations
 */
async function executeCleanupOperations(operations: CleanupOperation[], dryRun: boolean = false): Promise<CleanupStats> {
  const stats: CleanupStats = {
    totalOperations: operations.length,
    successfulOperations: 0,
    failedOperations: 0,
    recordsDeleted: 0,
    recordsUpdated: 0,
    errors: [],
    operations: []
  };

  for (const operation of operations) {
    try {
      logger.info(`${dryRun ? 'Would execute' : 'Executing'}: ${operation.description}`);
      
      if (!dryRun) {
        const result = await db.execute(sql.raw(operation.query));
        const recordsAffected = result.rowCount || 0;
        
        if (operation.query.toLowerCase().includes('delete')) {
          stats.recordsDeleted += recordsAffected;
        } else if (operation.query.toLowerCase().includes('update')) {
          stats.recordsUpdated += recordsAffected;
        }

        stats.operations.push({
          name: operation.name,
          recordsAffected,
          success: true
        });

        stats.successfulOperations++;
        logger.info(`Completed: ${operation.description} (${recordsAffected} records affected)`);
      } else {
        stats.operations.push({
          name: operation.name,
          recordsAffected: operation.estimatedRecords,
          success: true
        });
        stats.successfulOperations++;
      }
    } catch (error) {
      const errorMessage = `Failed to execute ${operation.name}: ${error}`;
      logger.error(errorMessage, { error });
      stats.errors.push(errorMessage);
      stats.failedOperations++;
      
      stats.operations.push({
        name: operation.name,
        recordsAffected: 0,
        success: false,
        error: errorMessage
      });
    }
  }

  return stats;
}

/**
 * Main cleanup function
 */
async function performDataCleanup(options: {
  dryRun?: boolean;
  orphaned?: boolean;
  templates?: boolean;
  archived?: boolean;
  optimize?: boolean;
  all?: boolean;
}): Promise<CleanupStats> {
  const { dryRun = false, orphaned = false, templates = false, archived = false, optimize = false, all = true } = options;
  
  logger.info('Starting data cleanup process', { options });

  const allOperations: CleanupOperation[] = [];

  // Collect operations based on options
  if (all || orphaned) {
    const quizOrphanedOps = await identifyOrphanedQuizData(dryRun);
    const learningOrphanedOps = await identifyOrphanedLearningData(dryRun);
    allOperations.push(...quizOrphanedOps, ...learningOrphanedOps);
  }

  if (all || templates) {
    const templateOps = await identifyUnusedTemplates(dryRun);
    allOperations.push(...templateOps);
  }

  if (all || archived) {
    const archivedOps = await identifyArchivedContent(dryRun);
    allOperations.push(...archivedOps);
  }

  if (all || optimize) {
    const optimizationOps = await identifyOptimizationOperations(dryRun);
    allOperations.push(...optimizationOps);
  }

  // Execute operations
  const stats = await executeCleanupOperations(allOperations, dryRun);

  logger.info('Data cleanup process completed', {
    totalOperations: stats.totalOperations,
    successfulOperations: stats.successfulOperations,
    failedOperations: stats.failedOperations,
    recordsDeleted: stats.recordsDeleted,
    recordsUpdated: stats.recordsUpdated
  });

  return stats;
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const orphaned = args.includes('--orphaned');
  const templates = args.includes('--templates');
  const archived = args.includes('--archived');
  const optimize = args.includes('--optimize');
  const all = args.includes('--all') || (!orphaned && !templates && !archived && !optimize);
  const force = args.includes('--force');

  console.log('🧹 Starting Kavach Enhanced Data Cleanup Process...');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  } else {
    console.log('⚠️  LIVE MODE - data will be permanently modified\n');
  }

  const options = { dryRun, orphaned, templates, archived, optimize, all };

  performDataCleanup(options)
    .then((stats) => {
      console.log('📊 Cleanup Results:');
      console.log(`   🔧 Total operations: ${stats.totalOperations}`);
      console.log(`   ✅ Successful: ${stats.successfulOperations}`);
      console.log(`   ❌ Failed: ${stats.failedOperations}`);
      console.log(`   🗑️  Records deleted: ${stats.recordsDeleted}`);
      console.log(`   📝 Records updated: ${stats.recordsUpdated}`);

      if (stats.operations.length > 0) {
        console.log('\n📋 Operation Details:');
        stats.operations.forEach((op, index) => {
          const status = op.success ? '✅' : '❌';
          console.log(`   ${index + 1}. ${status} ${op.name}: ${op.recordsAffected} records`);
          if (op.error) {
            console.log(`      Error: ${op.error}`);
          }
        });
      }

      if (stats.errors.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        stats.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      console.log('\n✨ Data cleanup process completed!');
      process.exit(stats.failedOperations > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Data cleanup process failed:', error);
      process.exit(1);
    });
}

export { 
  performDataCleanup, 
  identifyOrphanedQuizData, 
  identifyOrphanedLearningData,
  identifyUnusedTemplates,
  identifyArchivedContent,
  identifyOptimizationOperations,
  executeCleanupOperations,
  type CleanupOperation, 
  type CleanupStats 
};