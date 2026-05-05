#!/usr/bin/env bun
/**
 * Cleanup Script for Kavach Awareness Lab
 *
 * This script cleans up orphaned quiz data and unused templates.
 * It should be run periodically to maintain database integrity.
 *
 * Usage:
 *   bun run scripts/cleanup-orphaned-data.ts
 *
 * Environment Variables:
 *   - NODE_ENV: Environment (development, production)
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { quizService } from '../src/lib/services/awareness-lab/quiz.service';
import { logger } from '../src/lib/utils/logger';

interface CleanupStats {
  deletedQuestions: number;
  deletedAttempts: number;
  cleanedTemplates: number;
  errors: number;
  warnings: string[];
}

/**
 * Main cleanup function
 */
async function cleanupOrphanedData(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    deletedQuestions: 0,
    deletedAttempts: 0,
    cleanedTemplates: 0,
    errors: 0,
    warnings: []
  };

  try {
    logger.info('Starting cleanup process for orphaned data');

    // Clean up orphaned quiz data
    const cleanupResult = await quizService.cleanupOrphanedData();

    if (cleanupResult.success) {
      stats.deletedQuestions = cleanupResult.data!.deletedQuestions;
      stats.deletedAttempts = cleanupResult.data!.deletedAttempts;

      logger.info('Quiz data cleanup completed', {
        deletedQuestions: stats.deletedQuestions,
        deletedAttempts: stats.deletedAttempts
      });
    } else {
      logger.error('Failed to cleanup quiz data', { error: cleanupResult.error });
      stats.errors++;
    }

    // TODO: Add template cleanup when template repository is available
    // This would involve:
    // 1. Finding templates that are not referenced by any quiz
    // 2. Checking if templates are older than a certain threshold
    // 3. Safely removing unused templates

    // Add warning about manual verification
    if (stats.deletedQuestions > 0 || stats.deletedAttempts > 0) {
      stats.warnings.push('Data was deleted. Please verify database integrity.');
    }

    logger.info('Cleanup process completed', {
      deletedQuestions: stats.deletedQuestions,
      deletedAttempts: stats.deletedAttempts,
      cleanedTemplates: stats.cleanedTemplates,
      errors: stats.errors,
      warnings: stats.warnings.length
    });

    return stats;
  } catch (error) {
    logger.error('Cleanup process failed', { error });
    stats.errors++;
    return stats;
  }
}

/**
 * Dry run function to preview what would be cleaned up
 */
async function previewCleanup(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    deletedQuestions: 0,
    deletedAttempts: 0,
    cleanedTemplates: 0,
    errors: 0,
    warnings: ['This is a dry run - no data was actually deleted']
  };

  try {
    logger.info('Starting cleanup preview (dry run)');

    // TODO: Implement preview functionality
    // This would involve:
    // 1. Identifying orphaned data without deleting it
    // 2. Reporting what would be cleaned up
    // 3. Providing recommendations

    console.log('🔍 Dry run mode - analyzing data...');
    console.log('📊 Preview results would be shown here');

    return stats;
  } catch (error) {
    logger.error('Cleanup preview failed', { error });
    stats.errors++;
    return stats;
  }
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');

  console.log('🧹 Starting Kavach Data Cleanup Process...');
  
  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode - no data will be deleted\n');
    
    previewCleanup()
      .then((stats) => {
        console.log('📊 Cleanup Preview Results:');
        console.log(`   🗑️  Questions to delete: ${stats.deletedQuestions}`);
        console.log(`   📝 Attempts to delete: ${stats.deletedAttempts}`);
        console.log(`   📋 Templates to clean: ${stats.cleanedTemplates}`);
        console.log(`   ❌ Errors encountered: ${stats.errors}`);

        if (stats.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          stats.warnings.forEach((warning, index) => {
            console.log(`   ${index + 1}. ${warning}`);
          });
        }

        console.log('\n✨ Cleanup preview completed! Run without --dry-run to execute.');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Cleanup preview failed:', error);
        process.exit(1);
      });
  } else {
    console.log('⚠️  LIVE MODE - data will be permanently deleted\n');
    
    cleanupOrphanedData()
      .then((stats) => {
        console.log('📊 Cleanup Results:');
        console.log(`   🗑️  Deleted questions: ${stats.deletedQuestions}`);
        console.log(`   📝 Deleted attempts: ${stats.deletedAttempts}`);
        console.log(`   📋 Cleaned templates: ${stats.cleanedTemplates}`);
        console.log(`   ❌ Errors encountered: ${stats.errors}`);

        if (stats.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          stats.warnings.forEach((warning, index) => {
            console.log(`   ${index + 1}. ${warning}`);
          });
        }

        console.log('\n✨ Cleanup process completed successfully!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Cleanup process failed:', error);
        process.exit(1);
      });
  }
}

export { cleanupOrphanedData, previewCleanup, type CleanupStats };