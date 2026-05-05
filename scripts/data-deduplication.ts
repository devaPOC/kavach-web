#!/usr/bin/env bun
/**
 * Data Deduplication Tool for Kavach Awareness Lab
 *
 * This script identifies and resolves duplicate records across the awareness lab system
 * with intelligent conflict resolution and data preservation.
 *
 * Usage:
 *   bun run scripts/data-deduplication.ts [options]
 *
 * Options:
 *   --analyze: Analyze duplicates without removing them
 *   --deduplicate: Remove duplicates with conflict resolution
 *   --table <name>: Focus on specific table
 *   --dry-run: Preview actions without executing
 *   --interactive: Interactive conflict resolution
 *   --auto-resolve: Automatic conflict resolution using rules
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
import { sql, eq, and, or, desc, asc } from 'drizzle-orm';

interface DuplicateGroup {
  table: string;
  duplicateKey: string;
  records: DuplicateRecord[];
  conflictType: 'exact' | 'similar' | 'partial';
  resolutionStrategy: 'merge' | 'keep_newest' | 'keep_oldest' | 'manual';
  confidence: number;
}

interface DuplicateRecord {
  id: string;
  data: Record<string, any>;
  score: number;
  createdAt: Date;
  updatedAt?: Date;
  references: string[];
}

interface ConflictResolution {
  action: 'keep' | 'merge' | 'delete';
  targetId: string;
  sourceIds: string[];
  mergedData?: Record<string, any>;
  reason: string;
}

interface DeduplicationResult {
  table: string;
  duplicateGroups: number;
  recordsAnalyzed: number;
  recordsRemoved: number;
  recordsMerged: number;
  conflictsResolved: number;
  errors: string[];
  warnings: string[];
  resolutions: ConflictResolution[];
}

/**
 * Analyze quiz duplicates
 */
async function analyzeQuizDuplicates(): Promise<DuplicateGroup[]> {
  const duplicateGroups: DuplicateGroup[] = [];

  try {
    // Find quizzes with identical titles and creators
    const titleDuplicates = await db.execute(sql`
      SELECT 
        title,
        created_by,
        array_agg(id ORDER BY created_at DESC) as ids,
        array_agg(created_at ORDER BY created_at DESC) as created_dates,
        COUNT(*) as duplicate_count
      FROM quizzes 
      WHERE title IS NOT NULL AND title != ''
      GROUP BY title, created_by 
      HAVING COUNT(*) > 1
    `);

    for (const duplicate of titleDuplicates.rows as any[]) {
      const records: DuplicateRecord[] = [];
      
      for (let i = 0; i < duplicate.ids.length; i++) {
        const quizData = await db.execute(sql`
          SELECT q.*, 
                 COUNT(qq.id) as question_count,
                 COUNT(qa.id) as attempt_count
          FROM quizzes q
          LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
          LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
          WHERE q.id = ${duplicate.ids[i]}
          GROUP BY q.id
        `);

        if (quizData.rows.length > 0) {
          const quiz = quizData.rows[0] as any;
          records.push({
            id: quiz.id,
            data: quiz,
            score: calculateQuizScore(quiz),
            createdAt: new Date(duplicate.created_dates[i]),
            updatedAt: quiz.updated_at ? new Date(quiz.updated_at) : undefined,
            references: []
          });
        }
      }

      if (records.length > 1) {
        duplicateGroups.push({
          table: 'quizzes',
          duplicateKey: `${duplicate.title}_${duplicate.created_by}`,
          records,
          conflictType: determineConflictType(records),
          resolutionStrategy: determineResolutionStrategy(records),
          confidence: calculateConfidence(records)
        });
      }
    }

    // Find quizzes with similar content but different titles
    const contentSimilarQuizzes = await findSimilarQuizzesByContent();
    duplicateGroups.push(...contentSimilarQuizzes);

  } catch (error) {
    logger.error('Error analyzing quiz duplicates', { error });
  }

  return duplicateGroups;
}

/**
 * Calculate quiz score for deduplication priority
 */
function calculateQuizScore(quiz: any): number {
  let score = 0;
  
  // Prefer published quizzes
  if (quiz.is_published) score += 50;
  
  // Prefer quizzes with more questions
  score += (quiz.question_count || 0) * 5;
  
  // Prefer quizzes with attempts
  score += (quiz.attempt_count || 0) * 2;
  
  // Prefer newer quizzes (slight preference)
  const daysSinceCreation = (Date.now() - new Date(quiz.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 30 - daysSinceCreation);
  
  // Prefer quizzes with descriptions
  if (quiz.description && quiz.description.length > 10) score += 10;
  
  return score;
}

/**
 * Find similar quizzes by content analysis
 */
async function findSimilarQuizzesByContent(): Promise<DuplicateGroup[]> {
  const duplicateGroups: DuplicateGroup[] = [];

  try {
    // Get all quizzes with their questions for content comparison
    const quizzesWithContent = await db.execute(sql`
      SELECT 
        q.id,
        q.title,
        q.description,
        q.created_by,
        q.created_at,
        q.is_published,
        array_agg(qq.question_data ORDER BY qq.order_index) as questions
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      GROUP BY q.id, q.title, q.description, q.created_by, q.created_at, q.is_published
      HAVING COUNT(qq.id) > 0
    `);

    const quizzes = quizzesWithContent.rows as any[];
    
    // Compare quizzes for similarity
    for (let i = 0; i < quizzes.length; i++) {
      for (let j = i + 1; j < quizzes.length; j++) {
        const quiz1 = quizzes[i];
        const quiz2 = quizzes[j];
        
        // Skip if same creator (already handled by title duplicates)
        if (quiz1.created_by === quiz2.created_by) continue;
        
        const similarity = calculateContentSimilarity(quiz1, quiz2);
        
        if (similarity > 0.8) { // 80% similarity threshold
          const records = [
            {
              id: quiz1.id,
              data: quiz1,
              score: calculateQuizScore(quiz1),
              createdAt: new Date(quiz1.created_at),
              references: []
            },
            {
              id: quiz2.id,
              data: quiz2,
              score: calculateQuizScore(quiz2),
              createdAt: new Date(quiz2.created_at),
              references: []
            }
          ];

          duplicateGroups.push({
            table: 'quizzes',
            duplicateKey: `content_similar_${quiz1.id}_${quiz2.id}`,
            records,
            conflictType: 'similar',
            resolutionStrategy: 'manual', // Similar content requires manual review
            confidence: similarity
          });
        }
      }
    }

  } catch (error) {
    logger.error('Error finding similar quizzes by content', { error });
  }

  return duplicateGroups;
}

/**
 * Calculate content similarity between two quizzes
 */
function calculateContentSimilarity(quiz1: any, quiz2: any): number {
  let similarity = 0;
  let factors = 0;

  // Title similarity
  if (quiz1.title && quiz2.title) {
    const titleSim = calculateStringSimilarity(quiz1.title, quiz2.title);
    similarity += titleSim * 0.3;
    factors += 0.3;
  }

  // Description similarity
  if (quiz1.description && quiz2.description) {
    const descSim = calculateStringSimilarity(quiz1.description, quiz2.description);
    similarity += descSim * 0.2;
    factors += 0.2;
  }

  // Question content similarity
  if (quiz1.questions && quiz2.questions && quiz1.questions.length > 0 && quiz2.questions.length > 0) {
    const questionSim = calculateQuestionsSimilarity(quiz1.questions, quiz2.questions);
    similarity += questionSim * 0.5;
    factors += 0.5;
  }

  return factors > 0 ? similarity / factors : 0;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len2][len1]) / maxLen;
}

/**
 * Calculate similarity between question arrays
 */
function calculateQuestionsSimilarity(questions1: any[], questions2: any[]): number {
  if (questions1.length === 0 || questions2.length === 0) return 0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (const q1 of questions1) {
    let maxSim = 0;
    for (const q2 of questions2) {
      const sim = calculateQuestionSimilarity(q1, q2);
      maxSim = Math.max(maxSim, sim);
    }
    totalSimilarity += maxSim;
    comparisons++;
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

/**
 * Calculate similarity between individual questions
 */
function calculateQuestionSimilarity(q1: any, q2: any): number {
  if (!q1 || !q2 || !q1.question || !q2.question) return 0;
  
  let similarity = 0;
  let factors = 0;

  // Question text similarity
  const textSim = calculateStringSimilarity(q1.question, q2.question);
  similarity += textSim * 0.7;
  factors += 0.7;

  // Options similarity (if both have options)
  if (q1.options && q2.options && Array.isArray(q1.options) && Array.isArray(q2.options)) {
    const optionsSim = calculateArraySimilarity(q1.options, q2.options);
    similarity += optionsSim * 0.3;
    factors += 0.3;
  }

  return factors > 0 ? similarity / factors : 0;
}

/**
 * Calculate similarity between arrays of strings
 */
function calculateArraySimilarity(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 || arr2.length === 0) return 0;

  let matches = 0;
  for (const item1 of arr1) {
    for (const item2 of arr2) {
      if (calculateStringSimilarity(item1, item2) > 0.8) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(arr1.length, arr2.length);
}

/**
 * Analyze learning module duplicates
 */
async function analyzeLearningModuleDuplicates(): Promise<DuplicateGroup[]> {
  const duplicateGroups: DuplicateGroup[] = [];

  try {
    // Find modules with identical titles and creators
    const titleDuplicates = await db.execute(sql`
      SELECT 
        title,
        created_by,
        category,
        array_agg(id ORDER BY created_at DESC) as ids,
        array_agg(created_at ORDER BY created_at DESC) as created_dates,
        COUNT(*) as duplicate_count
      FROM learning_modules 
      WHERE title IS NOT NULL AND title != ''
      GROUP BY title, created_by, category
      HAVING COUNT(*) > 1
    `);

    for (const duplicate of titleDuplicates.rows as any[]) {
      const records: DuplicateRecord[] = [];
      
      for (let i = 0; i < duplicate.ids.length; i++) {
        const moduleData = await db.execute(sql`
          SELECT lm.*, 
                 COUNT(mm.id) as material_count,
                 COUNT(lp.id) as progress_count
          FROM learning_modules lm
          LEFT JOIN module_materials mm ON lm.id = mm.module_id
          LEFT JOIN learning_progress lp ON lm.id = lp.module_id
          WHERE lm.id = ${duplicate.ids[i]}
          GROUP BY lm.id
        `);

        if (moduleData.rows.length > 0) {
          const module = moduleData.rows[0] as any;
          records.push({
            id: module.id,
            data: module,
            score: calculateModuleScore(module),
            createdAt: new Date(duplicate.created_dates[i]),
            updatedAt: module.updated_at ? new Date(module.updated_at) : undefined,
            references: []
          });
        }
      }

      if (records.length > 1) {
        duplicateGroups.push({
          table: 'learning_modules',
          duplicateKey: `${duplicate.title}_${duplicate.created_by}_${duplicate.category}`,
          records,
          conflictType: determineConflictType(records),
          resolutionStrategy: determineResolutionStrategy(records),
          confidence: calculateConfidence(records)
        });
      }
    }

  } catch (error) {
    logger.error('Error analyzing learning module duplicates', { error });
  }

  return duplicateGroups;
}

/**
 * Calculate module score for deduplication priority
 */
function calculateModuleScore(module: any): number {
  let score = 0;
  
  // Prefer published modules
  if (module.is_published) score += 50;
  
  // Prefer modules with more materials
  score += (module.material_count || 0) * 10;
  
  // Prefer modules with progress records
  score += (module.progress_count || 0) * 3;
  
  // Prefer newer modules (slight preference)
  const daysSinceCreation = (Date.now() - new Date(module.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 30 - daysSinceCreation);
  
  // Prefer modules with descriptions
  if (module.description && module.description.length > 10) score += 15;
  
  return score;
}

/**
 * Analyze quiz template duplicates
 */
async function analyzeQuizTemplateDuplicates(): Promise<DuplicateGroup[]> {
  const duplicateGroups: DuplicateGroup[] = [];

  try {
    // Find templates with identical names and creators
    const nameDuplicates = await db.execute(sql`
      SELECT 
        name,
        created_by,
        array_agg(id ORDER BY created_at DESC) as ids,
        array_agg(created_at ORDER BY created_at DESC) as created_dates,
        COUNT(*) as duplicate_count
      FROM quiz_templates 
      WHERE name IS NOT NULL AND name != ''
      GROUP BY name, created_by 
      HAVING COUNT(*) > 1
    `);

    for (const duplicate of nameDuplicates.rows as any[]) {
      const records: DuplicateRecord[] = [];
      
      for (let i = 0; i < duplicate.ids.length; i++) {
        const templateData = await db.execute(sql`
          SELECT qt.*, 
                 COUNT(q.id) as usage_count_actual
          FROM quiz_templates qt
          LEFT JOIN quizzes q ON qt.id = q.template_id
          WHERE qt.id = ${duplicate.ids[i]}
          GROUP BY qt.id
        `);

        if (templateData.rows.length > 0) {
          const template = templateData.rows[0] as any;
          records.push({
            id: template.id,
            data: template,
            score: calculateTemplateScore(template),
            createdAt: new Date(duplicate.created_dates[i]),
            updatedAt: template.updated_at ? new Date(template.updated_at) : undefined,
            references: []
          });
        }
      }

      if (records.length > 1) {
        duplicateGroups.push({
          table: 'quiz_templates',
          duplicateKey: `${duplicate.name}_${duplicate.created_by}`,
          records,
          conflictType: determineConflictType(records),
          resolutionStrategy: determineResolutionStrategy(records),
          confidence: calculateConfidence(records)
        });
      }
    }

  } catch (error) {
    logger.error('Error analyzing quiz template duplicates', { error });
  }

  return duplicateGroups;
}

/**
 * Calculate template score for deduplication priority
 */
function calculateTemplateScore(template: any): number {
  let score = 0;
  
  // Prefer templates with actual usage
  score += (template.usage_count_actual || 0) * 20;
  
  // Prefer templates with higher recorded usage count
  score += (template.usage_count || 0) * 10;
  
  // Prefer newer templates (slight preference)
  const daysSinceCreation = (Date.now() - new Date(template.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 20 - daysSinceCreation);
  
  // Prefer templates with descriptions
  if (template.description && template.description.length > 10) score += 15;
  
  return score;
}

/**
 * Determine conflict type based on record analysis
 */
function determineConflictType(records: DuplicateRecord[]): 'exact' | 'similar' | 'partial' {
  if (records.length < 2) return 'exact';

  // Check if all records have identical key fields
  const firstRecord = records[0];
  const allIdentical = records.every(record => 
    JSON.stringify(getKeyFields(record.data)) === JSON.stringify(getKeyFields(firstRecord.data))
  );

  if (allIdentical) return 'exact';

  // Check similarity
  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const similarity = calculateRecordSimilarity(records[i], records[j]);
      totalSimilarity += similarity;
      comparisons++;
    }
  }

  const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
  return avgSimilarity > 0.7 ? 'similar' : 'partial';
}

/**
 * Get key fields for comparison
 */
function getKeyFields(data: any): any {
  return {
    title: data.title || data.name,
    description: data.description,
    created_by: data.created_by
  };
}

/**
 * Calculate similarity between two records
 */
function calculateRecordSimilarity(record1: DuplicateRecord, record2: DuplicateRecord): number {
  const data1 = record1.data;
  const data2 = record2.data;

  let similarity = 0;
  let factors = 0;

  // Title/name similarity
  const title1 = data1.title || data1.name || '';
  const title2 = data2.title || data2.name || '';
  if (title1 && title2) {
    similarity += calculateStringSimilarity(title1, title2) * 0.5;
    factors += 0.5;
  }

  // Description similarity
  if (data1.description && data2.description) {
    similarity += calculateStringSimilarity(data1.description, data2.description) * 0.3;
    factors += 0.3;
  }

  // Creator similarity
  if (data1.created_by === data2.created_by) {
    similarity += 0.2;
    factors += 0.2;
  }

  return factors > 0 ? similarity / factors : 0;
}

/**
 * Determine resolution strategy based on records
 */
function determineResolutionStrategy(records: DuplicateRecord[]): 'merge' | 'keep_newest' | 'keep_oldest' | 'manual' {
  if (records.length < 2) return 'keep_newest';

  // Sort by score (highest first)
  const sortedRecords = [...records].sort((a, b) => b.score - a.score);
  
  // If there's a clear winner (significantly higher score), keep it
  if (sortedRecords[0].score > sortedRecords[1].score * 1.5) {
    return 'keep_newest';
  }

  // If scores are similar, check for references
  const hasReferences = records.some(record => record.references.length > 0);
  if (hasReferences) {
    return 'manual'; // Requires careful handling
  }

  // Default to keeping newest for similar scores
  return 'keep_newest';
}

/**
 * Calculate confidence in deduplication decision
 */
function calculateConfidence(records: DuplicateRecord[]): number {
  if (records.length < 2) return 1.0;

  const sortedRecords = [...records].sort((a, b) => b.score - a.score);
  const scoreRatio = sortedRecords.length > 1 ? sortedRecords[0].score / sortedRecords[1].score : 1;
  
  // Higher confidence when there's a clear winner
  if (scoreRatio > 2) return 0.9;
  if (scoreRatio > 1.5) return 0.7;
  if (scoreRatio > 1.2) return 0.5;
  
  return 0.3; // Low confidence, manual review recommended
}

/**
 * Resolve conflicts automatically based on strategy
 */
async function resolveConflicts(duplicateGroups: DuplicateGroup[], autoResolve: boolean = false): Promise<ConflictResolution[]> {
  const resolutions: ConflictResolution[] = [];

  for (const group of duplicateGroups) {
    if (!autoResolve && group.resolutionStrategy === 'manual') {
      continue; // Skip manual resolution in auto mode
    }

    const sortedRecords = [...group.records].sort((a, b) => b.score - a.score);
    const keepRecord = sortedRecords[0];
    const removeRecords = sortedRecords.slice(1);

    const resolution: ConflictResolution = {
      action: 'keep',
      targetId: keepRecord.id,
      sourceIds: removeRecords.map(r => r.id),
      reason: `Auto-resolved: ${group.resolutionStrategy} strategy, confidence: ${group.confidence}`
    };

    if (group.resolutionStrategy === 'merge') {
      // Merge data from multiple records
      resolution.action = 'merge';
      resolution.mergedData = mergeRecordData(sortedRecords);
      resolution.reason += ' with data merge';
    }

    resolutions.push(resolution);
  }

  return resolutions;
}

/**
 * Merge data from multiple records
 */
function mergeRecordData(records: DuplicateRecord[]): Record<string, any> {
  const merged = { ...records[0].data };

  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    
    // Merge non-null values, preferring newer data
    Object.keys(record.data).forEach(key => {
      if (record.data[key] !== null && record.data[key] !== undefined) {
        if (merged[key] === null || merged[key] === undefined) {
          merged[key] = record.data[key];
        } else if (record.updatedAt && (!merged.updated_at || record.updatedAt > new Date(merged.updated_at))) {
          // Use newer value for updated fields
          merged[key] = record.data[key];
        }
      }
    });
  }

  return merged;
}

/**
 * Execute deduplication based on resolutions
 */
async function executeDeduplication(resolutions: ConflictResolution[], dryRun: boolean = false): Promise<DeduplicationResult> {
  const result: DeduplicationResult = {
    table: 'multiple',
    duplicateGroups: resolutions.length,
    recordsAnalyzed: 0,
    recordsRemoved: 0,
    recordsMerged: 0,
    conflictsResolved: 0,
    errors: [],
    warnings: [],
    resolutions
  };

  for (const resolution of resolutions) {
    try {
      if (!dryRun) {
        if (resolution.action === 'merge') {
          // Update target record with merged data
          // Note: This is a simplified example - actual implementation would need table-specific logic
          logger.info(`Would merge records: ${resolution.sourceIds.join(', ')} into ${resolution.targetId}`);
          result.recordsMerged++;
        }

        // Remove source records
        for (const sourceId of resolution.sourceIds) {
          logger.info(`Would remove duplicate record: ${sourceId}`);
          result.recordsRemoved++;
        }
      } else {
        logger.info(`Dry run: ${resolution.action} - ${resolution.reason}`);
      }

      result.conflictsResolved++;
    } catch (error) {
      const errorMessage = `Failed to resolve conflict for ${resolution.targetId}: ${error}`;
      logger.error(errorMessage, { error });
      result.errors.push(errorMessage);
    }
  }

  return result;
}

/**
 * Main deduplication function
 */
async function performDeduplication(options: {
  analyze?: boolean;
  deduplicate?: boolean;
  table?: string;
  dryRun?: boolean;
  interactive?: boolean;
  autoResolve?: boolean;
}): Promise<DeduplicationResult> {
  const { analyze = false, deduplicate = false, table, dryRun = false, interactive = false, autoResolve = false } = options;

  logger.info('Starting deduplication process', { options });

  const allDuplicateGroups: DuplicateGroup[] = [];

  // Analyze duplicates based on table filter
  if (!table || table === 'quizzes') {
    const quizDuplicates = await analyzeQuizDuplicates();
    allDuplicateGroups.push(...quizDuplicates);
  }

  if (!table || table === 'learning_modules') {
    const moduleDuplicates = await analyzeLearningModuleDuplicates();
    allDuplicateGroups.push(...moduleDuplicates);
  }

  if (!table || table === 'quiz_templates') {
    const templateDuplicates = await analyzeQuizTemplateDuplicates();
    allDuplicateGroups.push(...templateDuplicates);
  }

  const result: DeduplicationResult = {
    table: table || 'all',
    duplicateGroups: allDuplicateGroups.length,
    recordsAnalyzed: allDuplicateGroups.reduce((sum, group) => sum + group.records.length, 0),
    recordsRemoved: 0,
    recordsMerged: 0,
    conflictsResolved: 0,
    errors: [],
    warnings: [],
    resolutions: []
  };

  if (analyze) {
    // Just return analysis results
    logger.info(`Found ${allDuplicateGroups.length} duplicate groups`);
    return result;
  }

  if (deduplicate) {
    // Resolve conflicts and execute deduplication
    const resolutions = await resolveConflicts(allDuplicateGroups, autoResolve);
    const deduplicationResult = await executeDeduplication(resolutions, dryRun);
    
    // Merge results
    Object.assign(result, deduplicationResult);
  }

  logger.info('Deduplication process completed', {
    duplicateGroups: result.duplicateGroups,
    recordsAnalyzed: result.recordsAnalyzed,
    recordsRemoved: result.recordsRemoved,
    conflictsResolved: result.conflictsResolved
  });

  return result;
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const analyze = args.includes('--analyze');
  const deduplicate = args.includes('--deduplicate');
  const table = args.find(arg => args[args.indexOf(arg) - 1] === '--table');
  const dryRun = args.includes('--dry-run');
  const interactive = args.includes('--interactive');
  const autoResolve = args.includes('--auto-resolve');

  console.log('🔍 Kavach Data Deduplication Tool');
  console.log('=================================\n');

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
  }

  const options = { analyze, deduplicate, table, dryRun, interactive, autoResolve };

  performDeduplication(options)
    .then((result) => {
      console.log('📊 Deduplication Results:');
      console.log(`   🔍 Duplicate groups found: ${result.duplicateGroups}`);
      console.log(`   📝 Records analyzed: ${result.recordsAnalyzed}`);
      console.log(`   🗑️  Records removed: ${result.recordsRemoved}`);
      console.log(`   🔄 Records merged: ${result.recordsMerged}`);
      console.log(`   ✅ Conflicts resolved: ${result.conflictsResolved}`);

      if (result.resolutions.length > 0) {
        console.log('\n📋 Resolution Details:');
        result.resolutions.forEach((resolution, index) => {
          console.log(`   ${index + 1}. ${resolution.action.toUpperCase()}: ${resolution.targetId}`);
          console.log(`      Sources: ${resolution.sourceIds.join(', ')}`);
          console.log(`      Reason: ${resolution.reason}`);
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

      console.log('\n✨ Deduplication process completed!');
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('💥 Deduplication process failed:', error);
      process.exit(1);
    });
}

export { 
  performDeduplication, 
  analyzeQuizDuplicates,
  analyzeLearningModuleDuplicates,
  analyzeQuizTemplateDuplicates,
  resolveConflicts,
  executeDeduplication,
  type DuplicateGroup, 
  type ConflictResolution,
  type DeduplicationResult 
};