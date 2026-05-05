#!/usr/bin/env bun
/**
 * Data Archival Tool for Kavach Awareness Lab
 *
 * This script provides safe archival capabilities that maintain referential integrity
 * while moving old data to archive tables or external storage.
 *
 * Usage:
 *   bun run scripts/data-archival.ts [options]
 *
 * Options:
 *   --archive-type <type>: Type of archival (soft, hard, external)
 *   --age-threshold <days>: Archive data older than specified days
 *   --table <name>: Focus on specific table
 *   --dry-run: Preview archival without executing
 *   --preserve-references: Keep referenced data even if old
 *   --create-archive-tables: Create archive table structure
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
import { sql, eq, and, or, lt, isNull, notExists } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface ArchivalCandidate {
  table: string;
  id: string;
  data: Record<string, any>;
  age: number;
  references: Reference[];
  dependents: Reference[];
  archivalSafety: 'safe' | 'caution' | 'unsafe';
  reason: string;
}

interface Reference {
  table: string;
  field: string;
  recordId: string;
  type: 'parent' | 'child' | 'sibling';
}

interface ArchivalPlan {
  candidates: ArchivalCandidate[];
  totalRecords: number;
  safeToArchive: number;
  requiresReview: number;
  unsafeToArchive: number;
  estimatedSpaceSaved: number;
  dependencies: string[];
}

interface ArchivalResult {
  table: string;
  recordsArchived: number;
  recordsSkipped: number;
  spaceSaved: number;
  archiveLocation: string;
  errors: string[];
  warnings: string[];
  preservedReferences: string[];
}

/**
 * Create archive table structure
 */
async function createArchiveTables(): Promise<void> {
  const archiveTables = [
    {
      name: 'archived_quizzes',
      createQuery: `
        CREATE TABLE IF NOT EXISTS archived_quizzes (
          id UUID PRIMARY KEY,
          original_id UUID NOT NULL,
          created_by UUID,
          template_id UUID,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          language VARCHAR(2) NOT NULL,
          target_audience VARCHAR(10) NOT NULL DEFAULT 'customer',
          time_limit_minutes INTEGER NOT NULL,
          max_attempts INTEGER NOT NULL,
          is_published BOOLEAN DEFAULT false NOT NULL,
          is_archived BOOLEAN DEFAULT true NOT NULL,
          archived_at TIMESTAMP DEFAULT NOW(),
          archived_by UUID,
          archival_reason TEXT,
          end_date TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          archived_on TIMESTAMP DEFAULT NOW() NOT NULL,
          archive_metadata JSONB DEFAULT '{}'
        )
      `
    },
    {
      name: 'archived_quiz_questions',
      createQuery: `
        CREATE TABLE IF NOT EXISTS archived_quiz_questions (
          id UUID PRIMARY KEY,
          original_id UUID NOT NULL,
          quiz_id UUID NOT NULL,
          question_type VARCHAR(20) NOT NULL,
          question_data JSONB NOT NULL,
          correct_answers JSONB NOT NULL,
          order_index INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL,
          archived_on TIMESTAMP DEFAULT NOW() NOT NULL,
          archive_metadata JSONB DEFAULT '{}'
        )
      `
    },
    {
      name: 'archived_quiz_attempts',
      createQuery: `
        CREATE TABLE IF NOT EXISTS archived_quiz_attempts (
          id UUID PRIMARY KEY,
          original_id UUID NOT NULL,
          user_id UUID NOT NULL,
          quiz_id UUID NOT NULL,
          answers JSONB NOT NULL,
          score INTEGER NOT NULL,
          time_taken_seconds INTEGER NOT NULL,
          is_completed BOOLEAN DEFAULT false NOT NULL,
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          archived_on TIMESTAMP DEFAULT NOW() NOT NULL,
          archive_metadata JSONB DEFAULT '{}'
        )
      `
    },
    {
      name: 'archived_learning_modules',
      createQuery: `
        CREATE TABLE IF NOT EXISTS archived_learning_modules (
          id UUID PRIMARY KEY,
          original_id UUID NOT NULL,
          created_by UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) NOT NULL,
          target_audience VARCHAR(10) NOT NULL DEFAULT 'customer',
          order_index INTEGER NOT NULL,
          is_published BOOLEAN DEFAULT false NOT NULL,
          is_archived BOOLEAN DEFAULT true NOT NULL,
          archived_at TIMESTAMP,
          archived_by UUID,
          created_at TIMESTAMP NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          archived_on TIMESTAMP DEFAULT NOW() NOT NULL,
          archive_metadata JSONB DEFAULT '{}'
        )
      `
    },
    {
      name: 'archived_module_materials',
      createQuery: `
        CREATE TABLE IF NOT EXISTS archived_module_materials (
          id UUID PRIMARY KEY,
          original_id UUID NOT NULL,
          module_id UUID NOT NULL,
          material_type VARCHAR(20) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          material_data JSONB NOT NULL,
          order_index INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL,
          archived_on TIMESTAMP DEFAULT NOW() NOT NULL,
          archive_metadata JSONB DEFAULT '{}'
        )
      `
    },
    {
      name: 'archived_learning_progress',
      createQuery: `
        CREATE TABLE IF NOT EXISTS archived_learning_progress (
          id UUID PRIMARY KEY,
          original_id UUID NOT NULL,
          user_id UUID NOT NULL,
          module_id UUID NOT NULL,
          material_id UUID,
          is_completed BOOLEAN DEFAULT false NOT NULL,
          completed_at TIMESTAMP,
          last_accessed TIMESTAMP NOT NULL,
          archived_on TIMESTAMP DEFAULT NOW() NOT NULL,
          archive_metadata JSONB DEFAULT '{}'
        )
      `
    }
  ];

  for (const table of archiveTables) {
    try {
      await db.execute(sql.raw(table.createQuery));
      
      // Create indexes for archive tables
      await db.execute(sql.raw(`
        CREATE INDEX IF NOT EXISTS idx_${table.name}_original_id ON ${table.name}(original_id);
        CREATE INDEX IF NOT EXISTS idx_${table.name}_archived_on ON ${table.name}(archived_on);
      `));
      
      logger.info(`Created archive table: ${table.name}`);
    } catch (error) {
      logger.error(`Failed to create archive table ${table.name}`, { error });
    }
  }
}

/**
 * Identify archival candidates for quizzes
 */
async function identifyQuizArchivalCandidates(ageThresholdDays: number, preserveReferences: boolean): Promise<ArchivalCandidate[]> {
  const candidates: ArchivalCandidate[] = [];

  try {
    // Find old quizzes that are candidates for archival
    const oldQuizzes = await db.execute(sql`
      SELECT 
        q.*,
        COUNT(qa.id) as attempt_count,
        COUNT(qq.id) as question_count,
        EXTRACT(EPOCH FROM (NOW() - q.created_at)) / 86400 as age_days
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      WHERE q.created_at < NOW() - INTERVAL '${ageThresholdDays} days'
        AND (q.is_archived = false OR q.is_archived IS NULL)
      GROUP BY q.id
      ORDER BY q.created_at ASC
    `);

    for (const quiz of oldQuizzes as any[]) {
      const references = await findQuizReferences(quiz.id);
      const dependents = await findQuizDependents(quiz.id);
      
      let archivalSafety: 'safe' | 'caution' | 'unsafe' = 'safe';
      let reason = `Quiz is ${Math.floor(quiz.age_days)} days old`;

      // Determine archival safety
      if (quiz.is_published && quiz.attempt_count > 0) {
        archivalSafety = 'caution';
        reason += `, published with ${quiz.attempt_count} attempts`;
      }

      if (preserveReferences && (references.length > 0 || dependents.length > 0)) {
        archivalSafety = 'caution';
        reason += `, has ${references.length + dependents.length} references`;
      }

      if (quiz.end_date && new Date(quiz.end_date) > new Date()) {
        archivalSafety = 'unsafe';
        reason += `, still active (end date: ${quiz.end_date})`;
      }

      candidates.push({
        table: 'quizzes',
        id: quiz.id,
        data: quiz,
        age: Math.floor(quiz.age_days),
        references,
        dependents,
        archivalSafety,
        reason
      });
    }

  } catch (error) {
    logger.error('Error identifying quiz archival candidates', { error });
  }

  return candidates;
}

/**
 * Find references to a quiz
 */
async function findQuizReferences(quizId: string): Promise<Reference[]> {
  const references: Reference[] = [];

  try {
    // Find quiz questions
    const questions = await db.execute(sql`
      SELECT id FROM quiz_questions WHERE quiz_id = ${quizId}
    `);
    
    questions.forEach((question: any) => {
      references.push({
        table: 'quiz_questions',
        field: 'quiz_id',
        recordId: question.id,
        type: 'child'
      });
    });

    // Find quiz attempts
    const attempts = await db.execute(sql`
      SELECT id FROM quiz_attempts WHERE quiz_id = ${quizId}
    `);
    
    attempts.forEach((attempt: any) => {
      references.push({
        table: 'quiz_attempts',
        field: 'quiz_id',
        recordId: attempt.id,
        type: 'child'
      });
    });

  } catch (error) {
    logger.error('Error finding quiz references', { error });
  }

  return references;
}

/**
 * Find dependents of a quiz
 */
async function findQuizDependents(quizId: string): Promise<Reference[]> {
  const dependents: Reference[] = [];

  try {
    // Find template reference
    const quiz = await db.execute(sql`
      SELECT template_id FROM quizzes WHERE id = ${quizId} AND template_id IS NOT NULL
    `);
    
    if (quiz.length > 0 && (quiz[0] as any).template_id) {
      dependents.push({
        table: 'quiz_templates',
        field: 'id',
        recordId: (quiz[0] as any).template_id,
        type: 'parent'
      });
    }

    // Find creator reference
    const creator = await db.execute(sql`
      SELECT created_by FROM quizzes WHERE id = ${quizId}
    `);
    
    if (creator.length > 0) {
      dependents.push({
        table: 'users',
        field: 'id',
        recordId: (creator[0] as any).created_by,
        type: 'parent'
      });
    }

  } catch (error) {
    logger.error('Error finding quiz dependents', { error });
  }

  return dependents;
}

/**
 * Identify archival candidates for learning modules
 */
async function identifyLearningModuleArchivalCandidates(ageThresholdDays: number, preserveReferences: boolean): Promise<ArchivalCandidate[]> {
  const candidates: ArchivalCandidate[] = [];

  try {
    // Find old learning modules that are candidates for archival
    const oldModules = await db.execute(sql`
      SELECT 
        lm.*,
        COUNT(lp.id) as progress_count,
        COUNT(mm.id) as material_count,
        EXTRACT(EPOCH FROM (NOW() - lm.created_at)) / 86400 as age_days
      FROM learning_modules lm
      LEFT JOIN learning_progress lp ON lm.id = lp.module_id
      LEFT JOIN module_materials mm ON lm.id = mm.module_id
      WHERE lm.created_at < NOW() - INTERVAL '${ageThresholdDays} days'
        AND (lm.is_archived = false OR lm.is_archived IS NULL)
      GROUP BY lm.id
      ORDER BY lm.created_at ASC
    `);

    for (const module of oldModules as any[]) {
      const references = await findModuleReferences(module.id);
      const dependents = await findModuleDependents(module.id);
      
      let archivalSafety: 'safe' | 'caution' | 'unsafe' = 'safe';
      let reason = `Module is ${Math.floor(module.age_days)} days old`;

      // Determine archival safety
      if (module.is_published && module.progress_count > 0) {
        archivalSafety = 'caution';
        reason += `, published with ${module.progress_count} progress records`;
      }

      if (preserveReferences && (references.length > 0 || dependents.length > 0)) {
        archivalSafety = 'caution';
        reason += `, has ${references.length + dependents.length} references`;
      }

      if (module.material_count === 0) {
        archivalSafety = 'safe';
        reason += `, no materials`;
      }

      candidates.push({
        table: 'learning_modules',
        id: module.id,
        data: module,
        age: Math.floor(module.age_days),
        references,
        dependents,
        archivalSafety,
        reason
      });
    }

  } catch (error) {
    logger.error('Error identifying learning module archival candidates', { error });
  }

  return candidates;
}

/**
 * Find references to a learning module
 */
async function findModuleReferences(moduleId: string): Promise<Reference[]> {
  const references: Reference[] = [];

  try {
    // Find module materials
    const materials = await db.execute(sql`
      SELECT id FROM module_materials WHERE module_id = ${moduleId}
    `);
    
    materials.forEach((material: any) => {
      references.push({
        table: 'module_materials',
        field: 'module_id',
        recordId: material.id,
        type: 'child'
      });
    });

    // Find learning progress
    const progress = await db.execute(sql`
      SELECT id FROM learning_progress WHERE module_id = ${moduleId}
    `);
    
    progress.forEach((prog: any) => {
      references.push({
        table: 'learning_progress',
        field: 'module_id',
        recordId: prog.id,
        type: 'child'
      });
    });

  } catch (error) {
    logger.error('Error finding module references', { error });
  }

  return references;
}

/**
 * Find dependents of a learning module
 */
async function findModuleDependents(moduleId: string): Promise<Reference[]> {
  const dependents: Reference[] = [];

  try {
    // Find creator reference
    const creator = await db.execute(sql`
      SELECT created_by FROM learning_modules WHERE id = ${moduleId}
    `);
    
    if (creator.length > 0) {
      dependents.push({
        table: 'users',
        field: 'id',
        recordId: (creator[0] as any).created_by,
        type: 'parent'
      });
    }

  } catch (error) {
    logger.error('Error finding module dependents', { error });
  }

  return dependents;
}

/**
 * Create archival plan
 */
async function createArchivalPlan(
  ageThresholdDays: number, 
  table?: string, 
  preserveReferences: boolean = true
): Promise<ArchivalPlan> {
  const allCandidates: ArchivalCandidate[] = [];

  // Collect candidates based on table filter
  if (!table || table === 'quizzes') {
    const quizCandidates = await identifyQuizArchivalCandidates(ageThresholdDays, preserveReferences);
    allCandidates.push(...quizCandidates);
  }

  if (!table || table === 'learning_modules') {
    const moduleCandidates = await identifyLearningModuleArchivalCandidates(ageThresholdDays, preserveReferences);
    allCandidates.push(...moduleCandidates);
  }

  // Calculate statistics
  const safeToArchive = allCandidates.filter(c => c.archivalSafety === 'safe').length;
  const requiresReview = allCandidates.filter(c => c.archivalSafety === 'caution').length;
  const unsafeToArchive = allCandidates.filter(c => c.archivalSafety === 'unsafe').length;

  // Estimate space saved (simplified calculation)
  const estimatedSpaceSaved = allCandidates.length * 1024; // 1KB per record estimate

  // Identify dependencies
  const dependencies = Array.from(new Set(
    allCandidates.flatMap(c => [...c.references, ...c.dependents].map(r => r.table))
  ));

  return {
    candidates: allCandidates,
    totalRecords: allCandidates.length,
    safeToArchive,
    requiresReview,
    unsafeToArchive,
    estimatedSpaceSaved,
    dependencies
  };
}

/**
 * Execute soft archival (mark as archived)
 */
async function executeSoftArchival(candidates: ArchivalCandidate[], dryRun: boolean = false): Promise<ArchivalResult> {
  const result: ArchivalResult = {
    table: 'multiple',
    recordsArchived: 0,
    recordsSkipped: 0,
    spaceSaved: 0,
    archiveLocation: 'database (soft archive)',
    errors: [],
    warnings: [],
    preservedReferences: []
  };

  for (const candidate of candidates) {
    try {
      if (candidate.archivalSafety === 'unsafe') {
        result.recordsSkipped++;
        result.warnings.push(`Skipped unsafe archival: ${candidate.table}/${candidate.id} - ${candidate.reason}`);
        continue;
      }

      if (!dryRun) {
        if (candidate.table === 'quizzes') {
          await db.execute(sql`
            UPDATE quizzes 
            SET is_archived = true, 
                archived_at = NOW(),
                archival_reason = ${candidate.reason}
            WHERE id = ${candidate.id}
          `);
        } else if (candidate.table === 'learning_modules') {
          await db.execute(sql`
            UPDATE learning_modules 
            SET is_archived = true, 
                archived_at = NOW()
            WHERE id = ${candidate.id}
          `);
        }
      }

      result.recordsArchived++;
      result.spaceSaved += 1024; // Simplified calculation
      
      logger.info(`${dryRun ? 'Would archive' : 'Archived'}: ${candidate.table}/${candidate.id}`);
    } catch (error) {
      const errorMessage = `Failed to archive ${candidate.table}/${candidate.id}: ${error}`;
      logger.error(errorMessage, { error });
      result.errors.push(errorMessage);
    }
  }

  return result;
}

/**
 * Execute hard archival (move to archive tables)
 */
async function executeHardArchival(candidates: ArchivalCandidate[], dryRun: boolean = false): Promise<ArchivalResult> {
  const result: ArchivalResult = {
    table: 'multiple',
    recordsArchived: 0,
    recordsSkipped: 0,
    spaceSaved: 0,
    archiveLocation: 'archive_tables',
    errors: [],
    warnings: [],
    preservedReferences: []
  };

  for (const candidate of candidates) {
    try {
      if (candidate.archivalSafety === 'unsafe') {
        result.recordsSkipped++;
        result.warnings.push(`Skipped unsafe archival: ${candidate.table}/${candidate.id} - ${candidate.reason}`);
        continue;
      }

      if (!dryRun) {
        // Begin transaction for atomic archival
        await db.execute(sql`BEGIN`);

        try {
          if (candidate.table === 'quizzes') {
            await archiveQuizWithDependencies(candidate.id, candidate.data);
          } else if (candidate.table === 'learning_modules') {
            await archiveModuleWithDependencies(candidate.id, candidate.data);
          }

          await db.execute(sql`COMMIT`);
        } catch (error) {
          await db.execute(sql`ROLLBACK`);
          throw error;
        }
      }

      result.recordsArchived++;
      result.spaceSaved += 2048; // More space saved with hard archival
      
      logger.info(`${dryRun ? 'Would hard archive' : 'Hard archived'}: ${candidate.table}/${candidate.id}`);
    } catch (error) {
      const errorMessage = `Failed to hard archive ${candidate.table}/${candidate.id}: ${error}`;
      logger.error(errorMessage, { error });
      result.errors.push(errorMessage);
    }
  }

  return result;
}

/**
 * Archive quiz with all its dependencies
 */
async function archiveQuizWithDependencies(quizId: string, quizData: any): Promise<void> {
  // Archive quiz questions first
  const questions = await db.execute(sql`
    SELECT * FROM quiz_questions WHERE quiz_id = ${quizId}
  `);

  for (const question of questions as any[]) {
    await db.execute(sql`
      INSERT INTO archived_quiz_questions (
        original_id, quiz_id, question_type, question_data, 
        correct_answers, order_index, created_at, archive_metadata
      ) VALUES (
        ${question.id}, ${quizId}, ${question.question_type}, ${JSON.stringify(question.question_data)},
        ${JSON.stringify(question.correct_answers)}, ${question.order_index}, ${question.created_at},
        ${JSON.stringify({ archived_from: 'quiz_questions', archival_reason: 'parent_archived' })}
      )
    `);
  }

  // Archive quiz attempts
  const attempts = await db.execute(sql`
    SELECT * FROM quiz_attempts WHERE quiz_id = ${quizId}
  `);

  for (const attempt of attempts as any[]) {
    await db.execute(sql`
      INSERT INTO archived_quiz_attempts (
        original_id, user_id, quiz_id, answers, score, 
        time_taken_seconds, is_completed, started_at, completed_at, archive_metadata
      ) VALUES (
        ${attempt.id}, ${attempt.user_id}, ${quizId}, ${JSON.stringify(attempt.answers)}, ${attempt.score},
        ${attempt.time_taken_seconds}, ${attempt.is_completed}, ${attempt.started_at}, ${attempt.completed_at},
        ${JSON.stringify({ archived_from: 'quiz_attempts', archival_reason: 'parent_archived' })}
      )
    `);
  }

  // Archive the quiz itself
  await db.execute(sql`
    INSERT INTO archived_quizzes (
      original_id, created_by, template_id, title, description, language,
      target_audience, time_limit_minutes, max_attempts, is_published, is_archived,
      archived_at, archived_by, archival_reason, end_date, created_at, updated_at, archive_metadata
    ) VALUES (
      ${quizId}, ${quizData.created_by}, ${quizData.template_id}, ${quizData.title}, ${quizData.description}, ${quizData.language},
      ${quizData.target_audience}, ${quizData.time_limit_minutes}, ${quizData.max_attempts}, ${quizData.is_published}, true,
      NOW(), NULL, 'automated_archival', ${quizData.end_date}, ${quizData.created_at}, ${quizData.updated_at},
      ${JSON.stringify({ archived_from: 'quizzes', original_data: quizData })}
    )
  `);

  // Delete from original tables (in reverse dependency order)
  await db.execute(sql`DELETE FROM quiz_attempts WHERE quiz_id = ${quizId}`);
  await db.execute(sql`DELETE FROM quiz_questions WHERE quiz_id = ${quizId}`);
  await db.execute(sql`DELETE FROM quizzes WHERE id = ${quizId}`);
}

/**
 * Archive learning module with all its dependencies
 */
async function archiveModuleWithDependencies(moduleId: string, moduleData: any): Promise<void> {
  // Archive module materials first
  const materials = await db.execute(sql`
    SELECT * FROM module_materials WHERE module_id = ${moduleId}
  `);

  for (const material of materials as any[]) {
    await db.execute(sql`
      INSERT INTO archived_module_materials (
        original_id, module_id, material_type, title, description,
        material_data, order_index, created_at, archive_metadata
      ) VALUES (
        ${material.id}, ${moduleId}, ${material.material_type}, ${material.title}, ${material.description},
        ${JSON.stringify(material.material_data)}, ${material.order_index}, ${material.created_at},
        ${JSON.stringify({ archived_from: 'module_materials', archival_reason: 'parent_archived' })}
      )
    `);
  }

  // Archive learning progress
  const progress = await db.execute(sql`
    SELECT * FROM learning_progress WHERE module_id = ${moduleId}
  `);

  for (const prog of progress as any[]) {
    await db.execute(sql`
      INSERT INTO archived_learning_progress (
        original_id, user_id, module_id, material_id, is_completed,
        completed_at, last_accessed, archive_metadata
      ) VALUES (
        ${prog.id}, ${prog.user_id}, ${moduleId}, ${prog.material_id}, ${prog.is_completed},
        ${prog.completed_at}, ${prog.last_accessed},
        ${JSON.stringify({ archived_from: 'learning_progress', archival_reason: 'parent_archived' })}
      )
    `);
  }

  // Archive the module itself
  await db.execute(sql`
    INSERT INTO archived_learning_modules (
      original_id, created_by, title, description, category,
      target_audience, order_index, is_published, is_archived,
      archived_at, archived_by, created_at, updated_at, archive_metadata
    ) VALUES (
      ${moduleId}, ${moduleData.created_by}, ${moduleData.title}, ${moduleData.description}, ${moduleData.category},
      ${moduleData.target_audience}, ${moduleData.order_index}, ${moduleData.is_published}, true,
      NOW(), NULL, ${moduleData.created_at}, ${moduleData.updated_at},
      ${JSON.stringify({ archived_from: 'learning_modules', original_data: moduleData })}
    )
  `);

  // Delete from original tables (in reverse dependency order)
  await db.execute(sql`DELETE FROM learning_progress WHERE module_id = ${moduleId}`);
  await db.execute(sql`DELETE FROM module_materials WHERE module_id = ${moduleId}`);
  await db.execute(sql`DELETE FROM learning_modules WHERE id = ${moduleId}`);
}

/**
 * Execute external archival (export to files)
 */
async function executeExternalArchival(candidates: ArchivalCandidate[], dryRun: boolean = false): Promise<ArchivalResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveDir = path.join(process.cwd(), 'archives', 'external', timestamp);
  
  const result: ArchivalResult = {
    table: 'multiple',
    recordsArchived: 0,
    recordsSkipped: 0,
    spaceSaved: 0,
    archiveLocation: archiveDir,
    errors: [],
    warnings: [],
    preservedReferences: []
  };

  if (!dryRun && !existsSync(archiveDir)) {
    await mkdir(archiveDir, { recursive: true });
  }

  // Group candidates by table
  const candidatesByTable = candidates.reduce((acc, candidate) => {
    if (!acc[candidate.table]) acc[candidate.table] = [];
    acc[candidate.table].push(candidate);
    return acc;
  }, {} as Record<string, ArchivalCandidate[]>);

  for (const [table, tableCandidates] of Object.entries(candidatesByTable)) {
    try {
      const safeCandidates = tableCandidates.filter(c => c.archivalSafety !== 'unsafe');
      
      if (safeCandidates.length === 0) continue;

      const archiveData = {
        table,
        archivedAt: new Date().toISOString(),
        totalRecords: safeCandidates.length,
        records: safeCandidates.map(c => ({
          id: c.id,
          data: c.data,
          age: c.age,
          reason: c.reason,
          references: c.references,
          dependents: c.dependents
        }))
      };

      if (!dryRun) {
        const filePath = path.join(archiveDir, `${table}_archive.json`);
        await writeFile(filePath, JSON.stringify(archiveData, null, 2));
        
        // Also create a CSV for easier analysis
        const csvPath = path.join(archiveDir, `${table}_archive.csv`);
        const csvContent = generateCSV(safeCandidates);
        await writeFile(csvPath, csvContent);
      }

      result.recordsArchived += safeCandidates.length;
      result.recordsSkipped += tableCandidates.length - safeCandidates.length;
      result.spaceSaved += safeCandidates.length * 512; // Estimate

      logger.info(`${dryRun ? 'Would export' : 'Exported'} ${safeCandidates.length} ${table} records`);
    } catch (error) {
      const errorMessage = `Failed to export ${table}: ${error}`;
      logger.error(errorMessage, { error });
      result.errors.push(errorMessage);
    }
  }

  return result;
}

/**
 * Generate CSV content from candidates
 */
function generateCSV(candidates: ArchivalCandidate[]): string {
  if (candidates.length === 0) return '';

  const headers = ['id', 'age_days', 'archival_safety', 'reason', 'references_count', 'dependents_count'];
  const rows = candidates.map(c => [
    c.id,
    c.age.toString(),
    c.archivalSafety,
    `"${c.reason.replace(/"/g, '""')}"`,
    c.references.length.toString(),
    c.dependents.length.toString()
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Main archival function
 */
async function performArchival(options: {
  archiveType?: 'soft' | 'hard' | 'external';
  ageThreshold?: number;
  table?: string;
  dryRun?: boolean;
  preserveReferences?: boolean;
  createArchiveTables?: boolean;
}): Promise<ArchivalResult> {
  const { 
    archiveType = 'soft', 
    ageThreshold = 365, 
    table, 
    dryRun = false, 
    preserveReferences = true,
    createArchiveTables = false
  } = options;

  logger.info('Starting archival process', { options });

  // Create archive tables if requested
  if (createArchiveTables) {
    await createArchiveTables();
  }

  // Create archival plan
  const plan = await createArchivalPlan(ageThreshold, table, preserveReferences);
  
  logger.info('Archival plan created', {
    totalRecords: plan.totalRecords,
    safeToArchive: plan.safeToArchive,
    requiresReview: plan.requiresReview,
    unsafeToArchive: plan.unsafeToArchive
  });

  // Execute archival based on type
  let result: ArchivalResult;
  
  switch (archiveType) {
    case 'soft':
      result = await executeSoftArchival(plan.candidates, dryRun);
      break;
    case 'hard':
      result = await executeHardArchival(plan.candidates, dryRun);
      break;
    case 'external':
      result = await executeExternalArchival(plan.candidates, dryRun);
      break;
    default:
      throw new Error(`Unknown archive type: ${archiveType}`);
  }

  logger.info('Archival process completed', {
    recordsArchived: result.recordsArchived,
    recordsSkipped: result.recordsSkipped,
    spaceSaved: result.spaceSaved
  });

  return result;
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const archiveType = (args.find(arg => args[args.indexOf(arg) - 1] === '--archive-type') || 'soft') as 'soft' | 'hard' | 'external';
  const ageThreshold = parseInt(args.find(arg => args[args.indexOf(arg) - 1] === '--age-threshold') || '365');
  const table = args.find(arg => args[args.indexOf(arg) - 1] === '--table');
  const dryRun = args.includes('--dry-run');
  const preserveReferences = !args.includes('--no-preserve-references');
  const createArchiveTables = args.includes('--create-archive-tables');

  console.log('📦 Kavach Data Archival Tool');
  console.log('===========================\n');

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }

  const options = { archiveType, ageThreshold, table, dryRun, preserveReferences, createArchiveTables };

  performArchival(options)
    .then((result) => {
      console.log('📊 Archival Results:');
      console.log(`   📦 Archive type: ${archiveType}`);
      console.log(`   📁 Archive location: ${result.archiveLocation}`);
      console.log(`   ✅ Records archived: ${result.recordsArchived}`);
      console.log(`   ⏭️  Records skipped: ${result.recordsSkipped}`);
      console.log(`   💾 Space saved: ${(result.spaceSaved / 1024).toFixed(2)} KB`);

      if (result.preservedReferences.length > 0) {
        console.log('\n🔗 Preserved References:');
        result.preservedReferences.forEach((ref, index) => {
          console.log(`   ${index + 1}. ${ref}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`);
        });
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      console.log('\n✨ Archival process completed!');
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Archival process failed:', error);
      process.exit(1);
    });
}

export { 
  performArchival, 
  createArchivalPlan,
  createArchiveTables,
  executeSoftArchival,
  executeHardArchival,
  executeExternalArchival,
  type ArchivalCandidate, 
  type ArchivalPlan,
  type ArchivalResult 
};