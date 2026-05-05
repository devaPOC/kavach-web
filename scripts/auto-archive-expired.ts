#!/usr/bin/env bun
/**
 * Auto-Archive Script for Kavach Awareness Lab
 *
 * This script automatically archives quizzes that are 2 days past their end date.
 * It's designed to be run as a cron job or scheduled task.
 *
 * Usage:
 *   bun run scripts/auto-archive-expired.ts
 *
 * Environment Variables:
 *   - NODE_ENV: Environment (development, production)
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { quizService } from '../src/lib/services/awareness-lab/quiz.service';
import { logger } from '../src/lib/utils/logger';

interface ArchiveStats {
  totalChecked: number;
  successfullyArchived: number;
  errors: number;
  archivedQuizzes: Array<{
    id: string;
    title: string;
    endDate: Date;
  }>;
}

/**
 * Main auto-archive function
 */
async function autoArchiveExpiredContent(): Promise<ArchiveStats> {
  const stats: ArchiveStats = {
    totalChecked: 0,
    successfullyArchived: 0,
    errors: 0,
    archivedQuizzes: []
  };

  try {
    logger.info('Starting auto-archive process for expired content');

    // Archive expired quizzes
    const quizResult = await quizService.autoArchiveExpiredQuizzes();

    if (quizResult.success) {
      stats.successfullyArchived += quizResult.data!.archivedCount;
      stats.totalChecked += quizResult.data!.archivedCount;

      // Get details about archived quizzes for logging
      // Note: This would require extending the service to return quiz details
      logger.info('Quiz auto-archiving completed', {
        archivedCount: quizResult.data!.archivedCount,
        archivedQuizIds: quizResult.data!.archivedQuizzes
      });
    } else {
      logger.error('Failed to auto-archive quizzes', { error: quizResult.error });
      stats.errors++;
    }

    // TODO: Add learning modules auto-archiving when they have end dates
    // Currently learning modules don't have end dates, but this can be extended

    logger.info('Auto-archive process completed', {
      totalChecked: stats.totalChecked,
      successfullyArchived: stats.successfullyArchived,
      errors: stats.errors
    });

    return stats;
  } catch (error) {
    logger.error('Auto-archive process failed', { error });
    stats.errors++;
    return stats;
  }
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  console.log('🗃️  Starting Kavach Auto-Archive Process...');
  console.log('📅  Archiving content that expired 2+ days ago\n');

  autoArchiveExpiredContent()
    .then((stats) => {
      console.log('📊 Archive Results:');
      console.log(`   ✅ Successfully archived: ${stats.successfullyArchived} items`);
      console.log(`   ❌ Errors encountered: ${stats.errors}`);
      console.log(`   📝 Total checked: ${stats.totalChecked}`);

      if (stats.archivedQuizzes.length > 0) {
        console.log('\n📋 Archived Quizzes:');
        stats.archivedQuizzes.forEach((quiz, index) => {
          console.log(`   ${index + 1}. ${quiz.title} (ended: ${quiz.endDate.toLocaleDateString()})`);
        });
      }

      console.log('\n✨ Auto-archive process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Auto-archive process failed:', error);
      process.exit(1);
    });
}

export { autoArchiveExpiredContent, type ArchiveStats };
