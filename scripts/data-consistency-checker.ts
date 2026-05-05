#!/usr/bin/env bun
/**
 * Data Consistency Checker for Kavach Awareness Lab
 *
 * This script performs comprehensive data consistency checks and automated repairs
 * for referential integrity issues across the awareness lab system.
 *
 * Usage:
 *   bun run scripts/data-consistency-checker.ts [options]
 *
 * Options:
 *   --check-only: Only check for issues, don't repair
 *   --auto-repair: Automatically repair issues where safe
 *   --report: Generate detailed report
 *   --verbose: Show detailed progress information
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
import { eq, isNull, sql, and, or, count, desc } from 'drizzle-orm';

interface ConsistencyIssue {
  id: string;
  type: 'referential_integrity' | 'data_integrity' | 'business_logic' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  table: string;
  field?: string;
  recordId: string;
  description: string;
  currentValue?: any;
  expectedValue?: any;
  repairQuery?: string;
  autoRepairable: boolean;
  impact: string;
}

interface ConsistencyReport {
  timestamp: Date;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issuesByType: Record<string, number>;
  issuesByTable: Record<string, number>;
  issues: ConsistencyIssue[];
  repairableIssues: number;
  recommendations: string[];
}

/**
 * Check referential integrity for quiz system
 */
async function checkQuizReferentialIntegrity(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];

  try {
    // Check quiz -> user (created_by) references
    const quizzesWithInvalidCreator = await db
      .select({ 
        id: quizzes.id, 
        createdBy: quizzes.createdBy,
        title: quizzes.title 
      })
      .from(quizzes)
      .leftJoin(users, eq(quizzes.createdBy, users.id))
      .where(isNull(users.id));

    quizzesWithInvalidCreator.forEach(quiz => {
      issues.push({
        id: `quiz_invalid_creator_${quiz.id}`,
        type: 'referential_integrity',
        severity: 'critical',
        table: 'quizzes',
        field: 'created_by',
        recordId: quiz.id,
        description: `Quiz "${quiz.title}" references non-existent creator`,
        currentValue: quiz.createdBy,
        expectedValue: 'valid user ID',
        autoRepairable: false,
        impact: 'Quiz cannot be properly attributed to creator, may cause display issues'
      });
    });

    // Check quiz -> template references
    const quizzesWithInvalidTemplate = await db
      .select({ 
        id: quizzes.id, 
        templateId: quizzes.templateId,
        title: quizzes.title 
      })
      .from(quizzes)
      .leftJoin(quizTemplates, eq(quizzes.templateId, quizTemplates.id))
      .where(
        and(
          sql`${quizzes.templateId} IS NOT NULL`,
          isNull(quizTemplates.id)
        )
      );

    quizzesWithInvalidTemplate.forEach(quiz => {
      issues.push({
        id: `quiz_invalid_template_${quiz.id}`,
        type: 'referential_integrity',
        severity: 'medium',
        table: 'quizzes',
        field: 'template_id',
        recordId: quiz.id,
        description: `Quiz "${quiz.title}" references non-existent template`,
        currentValue: quiz.templateId,
        expectedValue: 'valid template ID or NULL',
        repairQuery: `UPDATE quizzes SET template_id = NULL WHERE id = '${quiz.id}'`,
        autoRepairable: true,
        impact: 'Template inheritance features will not work for this quiz'
      });
    });

    // Check quiz_questions -> quiz references
    const questionsWithInvalidQuiz = await db
      .select({ 
        id: quizQuestions.id, 
        quizId: quizQuestions.quizId 
      })
      .from(quizQuestions)
      .leftJoin(quizzes, eq(quizQuestions.quizId, quizzes.id))
      .where(isNull(quizzes.id));

    questionsWithInvalidQuiz.forEach(question => {
      issues.push({
        id: `question_invalid_quiz_${question.id}`,
        type: 'referential_integrity',
        severity: 'high',
        table: 'quiz_questions',
        field: 'quiz_id',
        recordId: question.id,
        description: 'Quiz question references non-existent quiz',
        currentValue: question.quizId,
        expectedValue: 'valid quiz ID',
        repairQuery: `DELETE FROM quiz_questions WHERE id = '${question.id}'`,
        autoRepairable: true,
        impact: 'Orphaned question data consuming storage space'
      });
    });

    // Check quiz_attempts -> quiz references
    const attemptsWithInvalidQuiz = await db
      .select({ 
        id: quizAttempts.id, 
        quizId: quizAttempts.quizId 
      })
      .from(quizAttempts)
      .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(isNull(quizzes.id));

    attemptsWithInvalidQuiz.forEach(attempt => {
      issues.push({
        id: `attempt_invalid_quiz_${attempt.id}`,
        type: 'referential_integrity',
        severity: 'high',
        table: 'quiz_attempts',
        field: 'quiz_id',
        recordId: attempt.id,
        description: 'Quiz attempt references non-existent quiz',
        currentValue: attempt.quizId,
        expectedValue: 'valid quiz ID',
        repairQuery: `DELETE FROM quiz_attempts WHERE id = '${attempt.id}'`,
        autoRepairable: true,
        impact: 'Orphaned attempt data affecting analytics and user progress'
      });
    });

    // Check quiz_attempts -> user references
    const attemptsWithInvalidUser = await db
      .select({ 
        id: quizAttempts.id, 
        userId: quizAttempts.userId 
      })
      .from(quizAttempts)
      .leftJoin(users, eq(quizAttempts.userId, users.id))
      .where(isNull(users.id));

    attemptsWithInvalidUser.forEach(attempt => {
      issues.push({
        id: `attempt_invalid_user_${attempt.id}`,
        type: 'referential_integrity',
        severity: 'critical',
        table: 'quiz_attempts',
        field: 'user_id',
        recordId: attempt.id,
        description: 'Quiz attempt references non-existent user',
        currentValue: attempt.userId,
        expectedValue: 'valid user ID',
        repairQuery: `DELETE FROM quiz_attempts WHERE id = '${attempt.id}'`,
        autoRepairable: true,
        impact: 'Orphaned attempt data from deleted users affecting system integrity'
      });
    });

  } catch (error) {
    logger.error('Error checking quiz referential integrity', { error });
  }

  return issues;
}

/**
 * Check referential integrity for learning system
 */
async function checkLearningReferentialIntegrity(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];

  try {
    // Check learning_modules -> user (created_by) references
    const modulesWithInvalidCreator = await db
      .select({ 
        id: learningModules.id, 
        createdBy: learningModules.createdBy,
        title: learningModules.title 
      })
      .from(learningModules)
      .leftJoin(users, eq(learningModules.createdBy, users.id))
      .where(isNull(users.id));

    modulesWithInvalidCreator.forEach(module => {
      issues.push({
        id: `module_invalid_creator_${module.id}`,
        type: 'referential_integrity',
        severity: 'critical',
        table: 'learning_modules',
        field: 'created_by',
        recordId: module.id,
        description: `Learning module "${module.title}" references non-existent creator`,
        currentValue: module.createdBy,
        expectedValue: 'valid user ID',
        autoRepairable: false,
        impact: 'Module cannot be properly attributed to creator'
      });
    });

    // Check module_materials -> learning_modules references
    const materialsWithInvalidModule = await db
      .select({ 
        id: moduleMaterials.id, 
        moduleId: moduleMaterials.moduleId,
        title: moduleMaterials.title 
      })
      .from(moduleMaterials)
      .leftJoin(learningModules, eq(moduleMaterials.moduleId, learningModules.id))
      .where(isNull(learningModules.id));

    materialsWithInvalidModule.forEach(material => {
      issues.push({
        id: `material_invalid_module_${material.id}`,
        type: 'referential_integrity',
        severity: 'high',
        table: 'module_materials',
        field: 'module_id',
        recordId: material.id,
        description: `Material "${material.title}" references non-existent module`,
        currentValue: material.moduleId,
        expectedValue: 'valid module ID',
        repairQuery: `DELETE FROM module_materials WHERE id = '${material.id}'`,
        autoRepairable: true,
        impact: 'Orphaned material data consuming storage space'
      });
    });

    // Check learning_progress -> learning_modules references
    const progressWithInvalidModule = await db
      .select({ 
        id: learningProgress.id, 
        moduleId: learningProgress.moduleId 
      })
      .from(learningProgress)
      .leftJoin(learningModules, eq(learningProgress.moduleId, learningModules.id))
      .where(isNull(learningModules.id));

    progressWithInvalidModule.forEach(progress => {
      issues.push({
        id: `progress_invalid_module_${progress.id}`,
        type: 'referential_integrity',
        severity: 'high',
        table: 'learning_progress',
        field: 'module_id',
        recordId: progress.id,
        description: 'Learning progress references non-existent module',
        currentValue: progress.moduleId,
        expectedValue: 'valid module ID',
        repairQuery: `DELETE FROM learning_progress WHERE id = '${progress.id}'`,
        autoRepairable: true,
        impact: 'Orphaned progress data affecting user learning analytics'
      });
    });

    // Check learning_progress -> module_materials references (where material_id is not null)
    const progressWithInvalidMaterial = await db
      .select({ 
        id: learningProgress.id, 
        materialId: learningProgress.materialId 
      })
      .from(learningProgress)
      .leftJoin(moduleMaterials, eq(learningProgress.materialId, moduleMaterials.id))
      .where(
        and(
          sql`${learningProgress.materialId} IS NOT NULL`,
          isNull(moduleMaterials.id)
        )
      );

    progressWithInvalidMaterial.forEach(progress => {
      issues.push({
        id: `progress_invalid_material_${progress.id}`,
        type: 'referential_integrity',
        severity: 'medium',
        table: 'learning_progress',
        field: 'material_id',
        recordId: progress.id,
        description: 'Learning progress references non-existent material',
        currentValue: progress.materialId,
        expectedValue: 'valid material ID or NULL',
        repairQuery: `UPDATE learning_progress SET material_id = NULL WHERE id = '${progress.id}'`,
        autoRepairable: true,
        impact: 'Material-specific progress tracking will not work correctly'
      });
    });

    // Check learning_progress -> users references
    const progressWithInvalidUser = await db
      .select({ 
        id: learningProgress.id, 
        userId: learningProgress.userId 
      })
      .from(learningProgress)
      .leftJoin(users, eq(learningProgress.userId, users.id))
      .where(isNull(users.id));

    progressWithInvalidUser.forEach(progress => {
      issues.push({
        id: `progress_invalid_user_${progress.id}`,
        type: 'referential_integrity',
        severity: 'critical',
        table: 'learning_progress',
        field: 'user_id',
        recordId: progress.id,
        description: 'Learning progress references non-existent user',
        currentValue: progress.userId,
        expectedValue: 'valid user ID',
        repairQuery: `DELETE FROM learning_progress WHERE id = '${progress.id}'`,
        autoRepairable: true,
        impact: 'Orphaned progress data from deleted users'
      });
    });

  } catch (error) {
    logger.error('Error checking learning referential integrity', { error });
  }

  return issues;
}

/**
 * Check data integrity issues
 */
async function checkDataIntegrity(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];

  try {
    // Check for published quizzes without questions
    const publishedQuizzesWithoutQuestions = await db
      .select({ 
        id: quizzes.id, 
        title: quizzes.title 
      })
      .from(quizzes)
      .leftJoin(quizQuestions, eq(quizzes.id, quizQuestions.quizId))
      .where(
        and(
          eq(quizzes.isPublished, true),
          isNull(quizQuestions.id)
        )
      )
      .groupBy(quizzes.id, quizzes.title);

    publishedQuizzesWithoutQuestions.forEach(quiz => {
      issues.push({
        id: `quiz_no_questions_${quiz.id}`,
        type: 'business_logic',
        severity: 'critical',
        table: 'quizzes',
        recordId: quiz.id,
        description: `Published quiz "${quiz.title}" has no questions`,
        currentValue: 'published with 0 questions',
        expectedValue: 'published with at least 1 question',
        repairQuery: `UPDATE quizzes SET is_published = false WHERE id = '${quiz.id}'`,
        autoRepairable: true,
        impact: 'Users cannot take quiz, causing errors in the application'
      });
    });

    // Check for published learning modules without materials
    const publishedModulesWithoutMaterials = await db
      .select({ 
        id: learningModules.id, 
        title: learningModules.title 
      })
      .from(learningModules)
      .leftJoin(moduleMaterials, eq(learningModules.id, moduleMaterials.moduleId))
      .where(
        and(
          eq(learningModules.isPublished, true),
          isNull(moduleMaterials.id)
        )
      )
      .groupBy(learningModules.id, learningModules.title);

    publishedModulesWithoutMaterials.forEach(module => {
      issues.push({
        id: `module_no_materials_${module.id}`,
        type: 'business_logic',
        severity: 'critical',
        table: 'learning_modules',
        recordId: module.id,
        description: `Published learning module "${module.title}" has no materials`,
        currentValue: 'published with 0 materials',
        expectedValue: 'published with at least 1 material',
        repairQuery: `UPDATE learning_modules SET is_published = false WHERE id = '${module.id}'`,
        autoRepairable: true,
        impact: 'Users cannot access learning content, causing empty module displays'
      });
    });

    // Check for completed progress without completion date
    const completedProgressWithoutDate = await db
      .select({ id: learningProgress.id })
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.isCompleted, true),
          isNull(learningProgress.completedAt)
        )
      );

    completedProgressWithoutDate.forEach(progress => {
      issues.push({
        id: `progress_no_completion_date_${progress.id}`,
        type: 'data_integrity',
        severity: 'medium',
        table: 'learning_progress',
        field: 'completed_at',
        recordId: progress.id,
        description: 'Progress marked as completed but missing completion date',
        currentValue: 'NULL',
        expectedValue: 'valid timestamp',
        repairQuery: `UPDATE learning_progress SET completed_at = last_accessed WHERE id = '${progress.id}'`,
        autoRepairable: true,
        impact: 'Completion analytics and reporting will be inaccurate'
      });
    });

    // Check for quiz attempts with invalid scores
    const attemptsWithInvalidScores = await db
      .select({ 
        id: quizAttempts.id, 
        score: quizAttempts.score 
      })
      .from(quizAttempts)
      .where(
        or(
          sql`${quizAttempts.score} < 0`,
          sql`${quizAttempts.score} > 100`
        )
      );

    attemptsWithInvalidScores.forEach(attempt => {
      issues.push({
        id: `attempt_invalid_score_${attempt.id}`,
        type: 'data_integrity',
        severity: 'high',
        table: 'quiz_attempts',
        field: 'score',
        recordId: attempt.id,
        description: 'Quiz attempt has invalid score (outside 0-100 range)',
        currentValue: attempt.score,
        expectedValue: 'score between 0 and 100',
        autoRepairable: false,
        impact: 'Score analytics and user progress tracking will be incorrect'
      });
    });

    // Check for incomplete quiz attempts older than 24 hours
    const staleIncompleteAttempts = await db
      .select({ 
        id: quizAttempts.id,
        startedAt: quizAttempts.startedAt 
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.isCompleted, false),
          sql`${quizAttempts.startedAt} < NOW() - INTERVAL '24 hours'`
        )
      );

    staleIncompleteAttempts.forEach(attempt => {
      issues.push({
        id: `attempt_stale_incomplete_${attempt.id}`,
        type: 'data_integrity',
        severity: 'low',
        table: 'quiz_attempts',
        recordId: attempt.id,
        description: 'Quiz attempt started but not completed after 24 hours',
        currentValue: `started ${attempt.startedAt}`,
        expectedValue: 'completed or removed',
        repairQuery: `DELETE FROM quiz_attempts WHERE id = '${attempt.id}'`,
        autoRepairable: true,
        impact: 'Stale data consuming storage and affecting attempt count limits'
      });
    });

  } catch (error) {
    logger.error('Error checking data integrity', { error });
  }

  return issues;
}

/**
 * Check for performance-related issues
 */
async function checkPerformanceIssues(): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];

  try {
    // Check for tables that might need optimization (large number of deleted records)
    // This is a simplified check - in production, you'd want more sophisticated analysis

    // Check for users with excessive quiz attempts (potential performance issue)
    const usersWithExcessiveAttempts = await db
      .select({ 
        userId: quizAttempts.userId,
        attemptCount: count(quizAttempts.id).as('attemptCount')
      })
      .from(quizAttempts)
      .groupBy(quizAttempts.userId)
      .having(sql`count(${quizAttempts.id}) > 1000`);

    usersWithExcessiveAttempts.forEach(user => {
      issues.push({
        id: `user_excessive_attempts_${user.userId}`,
        type: 'performance',
        severity: 'medium',
        table: 'quiz_attempts',
        recordId: user.userId,
        description: `User has excessive quiz attempts (${user.attemptCount})`,
        currentValue: user.attemptCount,
        expectedValue: 'reasonable number of attempts',
        autoRepairable: false,
        impact: 'May cause performance issues when loading user progress'
      });
    });

    // Check for quizzes with excessive questions (potential performance issue)
    const quizzesWithExcessiveQuestions = await db
      .select({ 
        quizId: quizQuestions.quizId,
        questionCount: count(quizQuestions.id).as('questionCount')
      })
      .from(quizQuestions)
      .groupBy(quizQuestions.quizId)
      .having(sql`count(${quizQuestions.id}) > 100`);

    quizzesWithExcessiveQuestions.forEach(quiz => {
      issues.push({
        id: `quiz_excessive_questions_${quiz.quizId}`,
        type: 'performance',
        severity: 'low',
        table: 'quiz_questions',
        recordId: quiz.quizId,
        description: `Quiz has excessive questions (${quiz.questionCount})`,
        currentValue: quiz.questionCount,
        expectedValue: 'reasonable number of questions',
        autoRepairable: false,
        impact: 'May cause slow quiz loading and poor user experience'
      });
    });

  } catch (error) {
    logger.error('Error checking performance issues', { error });
  }

  return issues;
}

/**
 * Repair issues automatically where safe
 */
async function repairIssues(issues: ConsistencyIssue[], autoRepair: boolean = false): Promise<{ repaired: number; errors: string[] }> {
  let repaired = 0;
  const errors: string[] = [];

  const repairableIssues = issues.filter(issue => issue.autoRepairable && issue.repairQuery);

  if (!autoRepair) {
    logger.info(`Found ${repairableIssues.length} auto-repairable issues, but auto-repair is disabled`);
    return { repaired: 0, errors: [] };
  }

  for (const issue of repairableIssues) {
    try {
      logger.info(`Repairing issue: ${issue.description}`);
      await db.execute(sql.raw(issue.repairQuery!));
      repaired++;
      logger.info(`Successfully repaired: ${issue.id}`);
    } catch (error) {
      const errorMessage = `Failed to repair ${issue.id}: ${error}`;
      logger.error(errorMessage, { error });
      errors.push(errorMessage);
    }
  }

  return { repaired, errors };
}

/**
 * Generate comprehensive consistency report
 */
async function generateConsistencyReport(options: {
  checkOnly?: boolean;
  autoRepair?: boolean;
  verbose?: boolean;
}): Promise<ConsistencyReport> {
  const { checkOnly = false, autoRepair = false, verbose = false } = options;

  logger.info('Starting data consistency check', { options });

  const allIssues: ConsistencyIssue[] = [];

  // Perform all consistency checks
  if (verbose) console.log('🔍 Checking quiz referential integrity...');
  const quizIntegrityIssues = await checkQuizReferentialIntegrity();
  allIssues.push(...quizIntegrityIssues);

  if (verbose) console.log('🔍 Checking learning referential integrity...');
  const learningIntegrityIssues = await checkLearningReferentialIntegrity();
  allIssues.push(...learningIntegrityIssues);

  if (verbose) console.log('🔍 Checking data integrity...');
  const dataIntegrityIssues = await checkDataIntegrity();
  allIssues.push(...dataIntegrityIssues);

  if (verbose) console.log('🔍 Checking performance issues...');
  const performanceIssues = await checkPerformanceIssues();
  allIssues.push(...performanceIssues);

  // Generate report
  const report: ConsistencyReport = {
    timestamp: new Date(),
    totalIssues: allIssues.length,
    issuesBySeverity: {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      high: allIssues.filter(i => i.severity === 'high').length,
      medium: allIssues.filter(i => i.severity === 'medium').length,
      low: allIssues.filter(i => i.severity === 'low').length,
    },
    issuesByType: {
      referential_integrity: allIssues.filter(i => i.type === 'referential_integrity').length,
      data_integrity: allIssues.filter(i => i.type === 'data_integrity').length,
      business_logic: allIssues.filter(i => i.type === 'business_logic').length,
      performance: allIssues.filter(i => i.type === 'performance').length,
    },
    issuesByTable: allIssues.reduce((acc, issue) => {
      acc[issue.table] = (acc[issue.table] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    issues: allIssues,
    repairableIssues: allIssues.filter(i => i.autoRepairable).length,
    recommendations: []
  };

  // Generate recommendations
  if (report.issuesBySeverity.critical > 0) {
    report.recommendations.push('🚨 Critical issues found - immediate attention required');
  }
  if (report.issuesBySeverity.high > 0) {
    report.recommendations.push('⚠️ High severity issues should be addressed soon');
  }
  if (report.repairableIssues > 0) {
    report.recommendations.push(`🔧 ${report.repairableIssues} issues can be auto-repaired`);
  }
  if (report.issuesByType.performance > 0) {
    report.recommendations.push('🚀 Performance issues may affect user experience');
  }

  // Perform repairs if requested
  if (autoRepair && !checkOnly) {
    if (verbose) console.log('🔧 Performing automatic repairs...');
    const repairResult = await repairIssues(allIssues, true);
    report.recommendations.push(`✅ Auto-repaired ${repairResult.repaired} issues`);
    if (repairResult.errors.length > 0) {
      report.recommendations.push(`❌ ${repairResult.errors.length} repair attempts failed`);
    }
  }

  logger.info('Data consistency check completed', {
    totalIssues: report.totalIssues,
    criticalIssues: report.issuesBySeverity.critical,
    repairableIssues: report.repairableIssues
  });

  return report;
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const autoRepair = args.includes('--auto-repair');
  const generateReport = args.includes('--report');
  const verbose = args.includes('--verbose');

  console.log('🔍 Starting Kavach Data Consistency Checker...');
  
  if (checkOnly) {
    console.log('👀 Check-only mode - no repairs will be performed\n');
  } else if (autoRepair) {
    console.log('🔧 Auto-repair mode - issues will be fixed automatically where safe\n');
  } else {
    console.log('📊 Analysis mode - issues will be identified but not repaired\n');
  }

  const options = { checkOnly, autoRepair, verbose };

  generateConsistencyReport(options)
    .then((report) => {
      console.log('📊 Consistency Report:');
      console.log(`   🕐 Generated: ${report.timestamp.toISOString()}`);
      console.log(`   🔍 Total issues: ${report.totalIssues}`);
      console.log(`   🚨 Critical: ${report.issuesBySeverity.critical}`);
      console.log(`   ⚠️  High: ${report.issuesBySeverity.high}`);
      console.log(`   🟡 Medium: ${report.issuesBySeverity.medium}`);
      console.log(`   🔵 Low: ${report.issuesBySeverity.low}`);
      console.log(`   🔧 Auto-repairable: ${report.repairableIssues}`);

      if (Object.keys(report.issuesByType).length > 0) {
        console.log('\n📋 Issues by Type:');
        Object.entries(report.issuesByType).forEach(([type, count]) => {
          if (count > 0) {
            console.log(`   ${type}: ${count}`);
          }
        });
      }

      if (Object.keys(report.issuesByTable).length > 0) {
        console.log('\n🗃️  Issues by Table:');
        Object.entries(report.issuesByTable).forEach(([table, count]) => {
          console.log(`   ${table}: ${count}`);
        });
      }

      if (report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }

      if (generateReport && report.issues.length > 0) {
        console.log('\n📋 Detailed Issues:');
        report.issues.forEach((issue, index) => {
          const severityIcon = {
            critical: '🚨',
            high: '⚠️',
            medium: '🟡',
            low: '🔵'
          }[issue.severity];
          
          console.log(`\n   ${index + 1}. ${severityIcon} [${issue.severity.toUpperCase()}] ${issue.description}`);
          console.log(`      ID: ${issue.id}`);
          console.log(`      Table: ${issue.table}${issue.field ? ` (${issue.field})` : ''}`);
          console.log(`      Record: ${issue.recordId}`);
          console.log(`      Auto-repairable: ${issue.autoRepairable ? '✅' : '❌'}`);
          console.log(`      Impact: ${issue.impact}`);
          if (issue.currentValue !== undefined) {
            console.log(`      Current: ${issue.currentValue}`);
          }
          if (issue.expectedValue !== undefined) {
            console.log(`      Expected: ${issue.expectedValue}`);
          }
        });
      }

      console.log('\n✨ Data consistency check completed!');
      
      if (report.issuesBySeverity.critical > 0) {
        console.log('⚠️  Critical issues found - immediate attention required!');
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Data consistency check failed:', error);
      process.exit(1);
    });
}

export { 
  generateConsistencyReport, 
  checkQuizReferentialIntegrity,
  checkLearningReferentialIntegrity,
  checkDataIntegrity,
  checkPerformanceIssues,
  repairIssues,
  type ConsistencyReport, 
  type ConsistencyIssue 
};