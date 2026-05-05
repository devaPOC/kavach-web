#!/usr/bin/env bun
/**
 * Data Validation Script for Kavach Awareness Lab
 *
 * This script validates data integrity across the awareness lab system,
 * identifying orphaned records, inconsistencies, and referential integrity issues.
 *
 * Usage:
 *   bun run scripts/data-validation.ts [--fix] [--report-only]
 *
 * Options:
 *   --fix: Automatically fix issues where possible
 *   --report-only: Generate report without making changes
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
import { eq, isNull, sql, and, notExists } from 'drizzle-orm';

interface ValidationIssue {
  type: 'orphaned' | 'inconsistent' | 'missing_reference' | 'data_corruption';
  severity: 'critical' | 'high' | 'medium' | 'low';
  table: string;
  recordId: string;
  description: string;
  fixable: boolean;
  fixQuery?: string;
}

interface ValidationReport {
  totalIssues: number;
  criticalIssues: number;
  fixableIssues: number;
  issues: ValidationIssue[];
  summary: {
    orphanedRecords: number;
    inconsistentData: number;
    missingReferences: number;
    dataCorruption: number;
  };
}

/**
 * Validate quiz data integrity
 */
async function validateQuizData(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  try {
    // Check for orphaned quiz questions (quiz doesn't exist)
    const orphanedQuestions = await db
      .select({ id: quizQuestions.id, quizId: quizQuestions.quizId })
      .from(quizQuestions)
      .leftJoin(quizzes, eq(quizQuestions.quizId, quizzes.id))
      .where(isNull(quizzes.id));

    orphanedQuestions.forEach(question => {
      issues.push({
        type: 'orphaned',
        severity: 'high',
        table: 'quiz_questions',
        recordId: question.id,
        description: `Quiz question references non-existent quiz: ${question.quizId}`,
        fixable: true,
        fixQuery: `DELETE FROM quiz_questions WHERE id = '${question.id}'`
      });
    });

    // Check for orphaned quiz attempts (quiz doesn't exist)
    const orphanedAttempts = await db
      .select({ id: quizAttempts.id, quizId: quizAttempts.quizId })
      .from(quizAttempts)
      .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(isNull(quizzes.id));

    orphanedAttempts.forEach(attempt => {
      issues.push({
        type: 'orphaned',
        severity: 'high',
        table: 'quiz_attempts',
        recordId: attempt.id,
        description: `Quiz attempt references non-existent quiz: ${attempt.quizId}`,
        fixable: true,
        fixQuery: `DELETE FROM quiz_attempts WHERE id = '${attempt.id}'`
      });
    });

    // Check for orphaned quiz attempts (user doesn't exist)
    const orphanedUserAttempts = await db
      .select({ id: quizAttempts.id, userId: quizAttempts.userId })
      .from(quizAttempts)
      .leftJoin(users, eq(quizAttempts.userId, users.id))
      .where(isNull(users.id));

    orphanedUserAttempts.forEach(attempt => {
      issues.push({
        type: 'orphaned',
        severity: 'critical',
        table: 'quiz_attempts',
        recordId: attempt.id,
        description: `Quiz attempt references non-existent user: ${attempt.userId}`,
        fixable: true,
        fixQuery: `DELETE FROM quiz_attempts WHERE id = '${attempt.id}'`
      });
    });

    // Check for quizzes with no questions
    const quizzesWithoutQuestions = await db
      .select({ id: quizzes.id, title: quizzes.title })
      .from(quizzes)
      .where(
        and(
          eq(quizzes.isPublished, true),
          notExists(
            db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizzes.id))
          )
        )
      );

    quizzesWithoutQuestions.forEach(quiz => {
      issues.push({
        type: 'inconsistent',
        severity: 'critical',
        table: 'quizzes',
        recordId: quiz.id,
        description: `Published quiz has no questions: ${quiz.title}`,
        fixable: true,
        fixQuery: `UPDATE quizzes SET is_published = false WHERE id = '${quiz.id}'`
      });
    });

    // Check for incomplete quiz attempts (started but not completed after 24 hours)
    const incompleteAttempts = await db
      .select({ id: quizAttempts.id, startedAt: quizAttempts.startedAt })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.isCompleted, false),
          sql`${quizAttempts.startedAt} < NOW() - INTERVAL '24 hours'`
        )
      );

    incompleteAttempts.forEach(attempt => {
      issues.push({
        type: 'inconsistent',
        severity: 'medium',
        table: 'quiz_attempts',
        recordId: attempt.id,
        description: `Quiz attempt started but not completed after 24 hours`,
        fixable: true,
        fixQuery: `DELETE FROM quiz_attempts WHERE id = '${attempt.id}'`
      });
    });

    // Check for unused quiz templates
    const unusedTemplates = await db
      .select({ id: quizTemplates.id, name: quizTemplates.name })
      .from(quizTemplates)
      .where(
        notExists(
          db.select().from(quizzes).where(eq(quizzes.templateId, quizTemplates.id))
        )
      );

    unusedTemplates.forEach(template => {
      issues.push({
        type: 'orphaned',
        severity: 'low',
        table: 'quiz_templates',
        recordId: template.id,
        description: `Unused quiz template: ${template.name}`,
        fixable: true,
        fixQuery: `DELETE FROM quiz_templates WHERE id = '${template.id}'`
      });
    });

  } catch (error) {
    logger.error('Error validating quiz data', { error });
    issues.push({
      type: 'data_corruption',
      severity: 'critical',
      table: 'quizzes',
      recordId: 'unknown',
      description: `Error during quiz validation: ${error}`,
      fixable: false
    });
  }

  return issues;
}

/**
 * Validate learning materials data integrity
 */
async function validateLearningData(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  try {
    // Check for orphaned module materials (module doesn't exist)
    const orphanedMaterials = await db
      .select({ id: moduleMaterials.id, moduleId: moduleMaterials.moduleId })
      .from(moduleMaterials)
      .leftJoin(learningModules, eq(moduleMaterials.moduleId, learningModules.id))
      .where(isNull(learningModules.id));

    orphanedMaterials.forEach(material => {
      issues.push({
        type: 'orphaned',
        severity: 'high',
        table: 'module_materials',
        recordId: material.id,
        description: `Module material references non-existent module: ${material.moduleId}`,
        fixable: true,
        fixQuery: `DELETE FROM module_materials WHERE id = '${material.id}'`
      });
    });

    // Check for orphaned learning progress (module doesn't exist)
    const orphanedModuleProgress = await db
      .select({ id: learningProgress.id, moduleId: learningProgress.moduleId })
      .from(learningProgress)
      .leftJoin(learningModules, eq(learningProgress.moduleId, learningModules.id))
      .where(isNull(learningModules.id));

    orphanedModuleProgress.forEach(progress => {
      issues.push({
        type: 'orphaned',
        severity: 'high',
        table: 'learning_progress',
        recordId: progress.id,
        description: `Learning progress references non-existent module: ${progress.moduleId}`,
        fixable: true,
        fixQuery: `DELETE FROM learning_progress WHERE id = '${progress.id}'`
      });
    });

    // Check for orphaned learning progress (material doesn't exist)
    const orphanedMaterialProgress = await db
      .select({ id: learningProgress.id, materialId: learningProgress.materialId })
      .from(learningProgress)
      .leftJoin(moduleMaterials, eq(learningProgress.materialId, moduleMaterials.id))
      .where(
        and(
          sql`${learningProgress.materialId} IS NOT NULL`,
          isNull(moduleMaterials.id)
        )
      );

    orphanedMaterialProgress.forEach(progress => {
      issues.push({
        type: 'orphaned',
        severity: 'medium',
        table: 'learning_progress',
        recordId: progress.id,
        description: `Learning progress references non-existent material: ${progress.materialId}`,
        fixable: true,
        fixQuery: `UPDATE learning_progress SET material_id = NULL WHERE id = '${progress.id}'`
      });
    });

    // Check for orphaned learning progress (user doesn't exist)
    const orphanedUserProgress = await db
      .select({ id: learningProgress.id, userId: learningProgress.userId })
      .from(learningProgress)
      .leftJoin(users, eq(learningProgress.userId, users.id))
      .where(isNull(users.id));

    orphanedUserProgress.forEach(progress => {
      issues.push({
        type: 'orphaned',
        severity: 'critical',
        table: 'learning_progress',
        recordId: progress.id,
        description: `Learning progress references non-existent user: ${progress.userId}`,
        fixable: true,
        fixQuery: `DELETE FROM learning_progress WHERE id = '${progress.id}'`
      });
    });

    // Check for published modules with no materials
    const modulesWithoutMaterials = await db
      .select({ id: learningModules.id, title: learningModules.title })
      .from(learningModules)
      .where(
        and(
          eq(learningModules.isPublished, true),
          notExists(
            db.select().from(moduleMaterials).where(eq(moduleMaterials.moduleId, learningModules.id))
          )
        )
      );

    modulesWithoutMaterials.forEach(module => {
      issues.push({
        type: 'inconsistent',
        severity: 'critical',
        table: 'learning_modules',
        recordId: module.id,
        description: `Published module has no materials: ${module.title}`,
        fixable: true,
        fixQuery: `UPDATE learning_modules SET is_published = false WHERE id = '${module.id}'`
      });
    });

    // Check for progress records marked as completed but without completion date
    const incompleteCompletionData = await db
      .select({ id: learningProgress.id })
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.isCompleted, true),
          isNull(learningProgress.completedAt)
        )
      );

    incompleteCompletionData.forEach(progress => {
      issues.push({
        type: 'inconsistent',
        severity: 'medium',
        table: 'learning_progress',
        recordId: progress.id,
        description: `Progress marked as completed but missing completion date`,
        fixable: true,
        fixQuery: `UPDATE learning_progress SET completed_at = last_accessed WHERE id = '${progress.id}'`
      });
    });

  } catch (error) {
    logger.error('Error validating learning data', { error });
    issues.push({
      type: 'data_corruption',
      severity: 'critical',
      table: 'learning_modules',
      recordId: 'unknown',
      description: `Error during learning data validation: ${error}`,
      fixable: false
    });
  }

  return issues;
}

/**
 * Validate referential integrity across all awareness lab tables
 */
async function validateReferentialIntegrity(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  try {
    // Check for quizzes referencing non-existent users (created_by)
    const quizzesWithInvalidCreator = await db
      .select({ id: quizzes.id, createdBy: quizzes.createdBy })
      .from(quizzes)
      .leftJoin(users, eq(quizzes.createdBy, users.id))
      .where(isNull(users.id));

    quizzesWithInvalidCreator.forEach(quiz => {
      issues.push({
        type: 'missing_reference',
        severity: 'critical',
        table: 'quizzes',
        recordId: quiz.id,
        description: `Quiz references non-existent creator: ${quiz.createdBy}`,
        fixable: false // Cannot fix without knowing correct user
      });
    });

    // Check for learning modules referencing non-existent users (created_by)
    const modulesWithInvalidCreator = await db
      .select({ id: learningModules.id, createdBy: learningModules.createdBy })
      .from(learningModules)
      .leftJoin(users, eq(learningModules.createdBy, users.id))
      .where(isNull(users.id));

    modulesWithInvalidCreator.forEach(module => {
      issues.push({
        type: 'missing_reference',
        severity: 'critical',
        table: 'learning_modules',
        recordId: module.id,
        description: `Learning module references non-existent creator: ${module.createdBy}`,
        fixable: false // Cannot fix without knowing correct user
      });
    });

    // Check for quizzes referencing non-existent templates
    const quizzesWithInvalidTemplate = await db
      .select({ id: quizzes.id, templateId: quizzes.templateId })
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
        type: 'missing_reference',
        severity: 'medium',
        table: 'quizzes',
        recordId: quiz.id,
        description: `Quiz references non-existent template: ${quiz.templateId}`,
        fixable: true,
        fixQuery: `UPDATE quizzes SET template_id = NULL WHERE id = '${quiz.id}'`
      });
    });

  } catch (error) {
    logger.error('Error validating referential integrity', { error });
    issues.push({
      type: 'data_corruption',
      severity: 'critical',
      table: 'system',
      recordId: 'unknown',
      description: `Error during referential integrity validation: ${error}`,
      fixable: false
    });
  }

  return issues;
}

/**
 * Fix identified issues automatically
 */
async function fixIssues(issues: ValidationIssue[]): Promise<{ fixed: number; errors: number }> {
  let fixed = 0;
  let errors = 0;

  const fixableIssues = issues.filter(issue => issue.fixable && issue.fixQuery);

  for (const issue of fixableIssues) {
    try {
      logger.info(`Fixing issue: ${issue.description}`);
      await db.execute(sql.raw(issue.fixQuery!));
      fixed++;
      logger.info(`Fixed: ${issue.description}`);
    } catch (error) {
      logger.error(`Failed to fix issue: ${issue.description}`, { error });
      errors++;
    }
  }

  return { fixed, errors };
}

/**
 * Generate comprehensive validation report
 */
async function generateValidationReport(reportOnly: boolean = false): Promise<ValidationReport> {
  logger.info('Starting data validation process');

  const allIssues: ValidationIssue[] = [];

  // Validate quiz data
  const quizIssues = await validateQuizData();
  allIssues.push(...quizIssues);

  // Validate learning materials data
  const learningIssues = await validateLearningData();
  allIssues.push(...learningIssues);

  // Validate referential integrity
  const integrityIssues = await validateReferentialIntegrity();
  allIssues.push(...integrityIssues);

  const report: ValidationReport = {
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter(issue => issue.severity === 'critical').length,
    fixableIssues: allIssues.filter(issue => issue.fixable).length,
    issues: allIssues,
    summary: {
      orphanedRecords: allIssues.filter(issue => issue.type === 'orphaned').length,
      inconsistentData: allIssues.filter(issue => issue.type === 'inconsistent').length,
      missingReferences: allIssues.filter(issue => issue.type === 'missing_reference').length,
      dataCorruption: allIssues.filter(issue => issue.type === 'data_corruption').length,
    }
  };

  logger.info('Data validation completed', {
    totalIssues: report.totalIssues,
    criticalIssues: report.criticalIssues,
    fixableIssues: report.fixableIssues
  });

  return report;
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const reportOnly = args.includes('--report-only');

  console.log('🔍 Starting Kavach Data Validation Process...');
  
  if (reportOnly) {
    console.log('📊 Report-only mode - no changes will be made\n');
  } else if (shouldFix) {
    console.log('🔧 Fix mode - issues will be automatically resolved where possible\n');
  } else {
    console.log('👀 Analysis mode - issues will be identified but not fixed\n');
  }

  generateValidationReport(reportOnly)
    .then(async (report) => {
      console.log('📊 Validation Report:');
      console.log(`   🔍 Total issues found: ${report.totalIssues}`);
      console.log(`   🚨 Critical issues: ${report.criticalIssues}`);
      console.log(`   🔧 Fixable issues: ${report.fixableIssues}`);
      console.log(`   🗑️  Orphaned records: ${report.summary.orphanedRecords}`);
      console.log(`   ⚠️  Inconsistent data: ${report.summary.inconsistentData}`);
      console.log(`   🔗 Missing references: ${report.summary.missingReferences}`);
      console.log(`   💥 Data corruption: ${report.summary.dataCorruption}`);

      if (report.issues.length > 0) {
        console.log('\n📋 Detailed Issues:');
        report.issues.forEach((issue, index) => {
          const severityIcon = {
            critical: '🚨',
            high: '⚠️',
            medium: '🟡',
            low: '🔵'
          }[issue.severity];
          
          console.log(`   ${index + 1}. ${severityIcon} [${issue.severity.toUpperCase()}] ${issue.description}`);
          console.log(`      Table: ${issue.table} | ID: ${issue.recordId} | Fixable: ${issue.fixable ? '✅' : '❌'}`);
        });
      }

      if (shouldFix && !reportOnly && report.fixableIssues > 0) {
        console.log('\n🔧 Fixing issues...');
        const fixResult = await fixIssues(report.issues);
        console.log(`   ✅ Fixed: ${fixResult.fixed} issues`);
        console.log(`   ❌ Errors: ${fixResult.errors} issues`);
      }

      console.log('\n✨ Data validation completed!');
      
      if (report.criticalIssues > 0) {
        console.log('⚠️  Critical issues found - immediate attention required!');
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Data validation failed:', error);
      process.exit(1);
    });
}

export { 
  generateValidationReport, 
  validateQuizData, 
  validateLearningData, 
  validateReferentialIntegrity,
  fixIssues,
  type ValidationReport, 
  type ValidationIssue 
};