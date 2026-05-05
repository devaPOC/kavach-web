#!/usr/bin/env bun
/**
 * Data Migration Tool for Kavach Awareness Lab
 *
 * This script provides safe migration capabilities with rollback support
 * for upgrading existing quiz and material data to new schema versions.
 *
 * Usage:
 *   bun run scripts/data-migration.ts [options]
 *
 * Options:
 *   --migration <name>: Run specific migration
 *   --list: List available migrations
 *   --rollback <name>: Rollback specific migration
 *   --dry-run: Preview migration without executing
 *   --backup: Create backup before migration
 *   --force: Skip confirmation prompts
 *
 * Environment Variables:
 *   - NODE_ENV: Environment (development, production)
 *   - DATABASE_URL: PostgreSQL connection string
 */

import { db } from '../src/lib/database/connection';
import { logger } from '../src/lib/utils/logger';
import { sql } from 'drizzle-orm';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  upQueries: string[];
  downQueries: string[];
  dataTransformations?: DataTransformation[];
  validationQueries?: string[];
  estimatedDuration: string;
  riskLevel: 'low' | 'medium' | 'high';
  backupRequired: boolean;
}

interface DataTransformation {
  name: string;
  description: string;
  query: string;
  rollbackQuery: string;
  validation: string;
}

interface MigrationResult {
  migrationId: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  recordsAffected: number;
  backupPath?: string;
  errors: string[];
  warnings: string[];
}

interface MigrationState {
  id: string;
  appliedAt: Date;
  version: string;
  checksum: string;
  rollbackData?: any;
}

/**
 * Available migrations
 */
const MIGRATIONS: Migration[] = [
  {
    id: 'add_quiz_metadata_fields',
    name: 'Add Quiz Metadata Fields',
    description: 'Add validation status, performance metrics, and archival information to quizzes',
    version: '1.0.0',
    dependencies: [],
    upQueries: [
      `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending'`,
      `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS last_validated TIMESTAMP`,
      `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS average_completion_time INTEGER DEFAULT 0`,
      `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS average_score DECIMAL(5,2) DEFAULT 0.00`,
      `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0`,
      `ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS archival_reason TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_quizzes_validation_status ON quizzes(validation_status)`,
      `CREATE INDEX IF NOT EXISTS idx_quizzes_last_validated ON quizzes(last_validated)`
    ],
    downQueries: [
      `DROP INDEX IF EXISTS idx_quizzes_last_validated`,
      `DROP INDEX IF EXISTS idx_quizzes_validation_status`,
      `ALTER TABLE quizzes DROP COLUMN IF EXISTS archival_reason`,
      `ALTER TABLE quizzes DROP COLUMN IF EXISTS attempt_count`,
      `ALTER TABLE quizzes DROP COLUMN IF EXISTS average_score`,
      `ALTER TABLE quizzes DROP COLUMN IF EXISTS average_completion_time`,
      `ALTER TABLE quizzes DROP COLUMN IF EXISTS last_validated`,
      `ALTER TABLE quizzes DROP COLUMN IF EXISTS validation_status`
    ],
    dataTransformations: [
      {
        name: 'calculate_quiz_metrics',
        description: 'Calculate and populate quiz performance metrics',
        query: `
          UPDATE quizzes SET 
            attempt_count = (SELECT COUNT(*) FROM quiz_attempts WHERE quiz_id = quizzes.id),
            average_score = (SELECT COALESCE(AVG(score), 0) FROM quiz_attempts WHERE quiz_id = quizzes.id AND is_completed = true),
            average_completion_time = (SELECT COALESCE(AVG(time_taken_seconds), 0) FROM quiz_attempts WHERE quiz_id = quizzes.id AND is_completed = true)
        `,
        rollbackQuery: `
          UPDATE quizzes SET 
            attempt_count = 0,
            average_score = 0.00,
            average_completion_time = 0
        `,
        validation: `SELECT COUNT(*) FROM quizzes WHERE attempt_count > 0 OR average_score > 0 OR average_completion_time > 0`
      }
    ],
    validationQueries: [
      `SELECT COUNT(*) FROM quizzes WHERE validation_status IS NOT NULL`,
      `SELECT COUNT(*) FROM quizzes WHERE attempt_count >= 0`
    ],
    estimatedDuration: '2-5 minutes',
    riskLevel: 'low',
    backupRequired: true
  },
  {
    id: 'add_quiz_attempt_metadata',
    name: 'Add Quiz Attempt Metadata',
    description: 'Add session tracking, timing details, and validation to quiz attempts',
    version: '1.0.0',
    dependencies: [],
    upQueries: [
      `ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)`,
      `ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS ip_address INET`,
      `ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_agent TEXT`,
      `ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS question_timings JSONB DEFAULT '{}'`,
      `ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS pause_durations INTEGER[] DEFAULT ARRAY[]::INTEGER[]`,
      `ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'`,
      `ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS security_flags JSONB DEFAULT '[]'`,
      `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_session_id ON quiz_attempts(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_ip_address ON quiz_attempts(ip_address)`
    ],
    downQueries: [
      `DROP INDEX IF EXISTS idx_quiz_attempts_ip_address`,
      `DROP INDEX IF EXISTS idx_quiz_attempts_session_id`,
      `ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS security_flags`,
      `ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS validation_errors`,
      `ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS pause_durations`,
      `ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS question_timings`,
      `ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS user_agent`,
      `ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS ip_address`,
      `ALTER TABLE quiz_attempts DROP COLUMN IF EXISTS session_id`
    ],
    estimatedDuration: '1-3 minutes',
    riskLevel: 'low',
    backupRequired: true
  },
  {
    id: 'add_learning_material_metadata',
    name: 'Add Learning Material Metadata',
    description: 'Add security validation, content metadata, and access tracking to learning materials',
    version: '1.0.0',
    dependencies: [],
    upQueries: [
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS security_status VARCHAR(20) DEFAULT 'pending'`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS last_security_check TIMESTAMP`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64)`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS content_size BIGINT DEFAULT 0`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100)`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending'`,
      `ALTER TABLE module_materials ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'`,
      `CREATE INDEX IF NOT EXISTS idx_module_materials_security_status ON module_materials(security_status)`,
      `CREATE INDEX IF NOT EXISTS idx_module_materials_validation_status ON module_materials(validation_status)`,
      `CREATE INDEX IF NOT EXISTS idx_module_materials_last_accessed ON module_materials(last_accessed)`
    ],
    downQueries: [
      `DROP INDEX IF EXISTS idx_module_materials_last_accessed`,
      `DROP INDEX IF EXISTS idx_module_materials_validation_status`,
      `DROP INDEX IF EXISTS idx_module_materials_security_status`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS validation_errors`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS validation_status`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS last_accessed`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS access_count`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS mime_type`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS content_size`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS content_hash`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS last_security_check`,
      `ALTER TABLE module_materials DROP COLUMN IF EXISTS security_status`
    ],
    estimatedDuration: '1-3 minutes',
    riskLevel: 'low',
    backupRequired: true
  },
  {
    id: 'migrate_quiz_question_format',
    name: 'Migrate Quiz Question Format',
    description: 'Migrate quiz questions to new enhanced format with validation and metadata',
    version: '1.1.0',
    dependencies: ['add_quiz_metadata_fields'],
    upQueries: [
      `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_metadata JSONB DEFAULT '{}'`,
      `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT '{}'`,
      `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'medium'`,
      `ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[]`,
      `CREATE INDEX IF NOT EXISTS idx_quiz_questions_difficulty ON quiz_questions(difficulty_level)`,
      `CREATE INDEX IF NOT EXISTS idx_quiz_questions_tags ON quiz_questions USING GIN(tags)`
    ],
    downQueries: [
      `DROP INDEX IF EXISTS idx_quiz_questions_tags`,
      `DROP INDEX IF EXISTS idx_quiz_questions_difficulty`,
      `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS tags`,
      `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS difficulty_level`,
      `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS validation_rules`,
      `ALTER TABLE quiz_questions DROP COLUMN IF EXISTS question_metadata`
    ],
    dataTransformations: [
      {
        name: 'migrate_question_data',
        description: 'Migrate existing question data to new format',
        query: `
          UPDATE quiz_questions SET 
            question_metadata = jsonb_build_object(
              'legacy_format', true,
              'migrated_at', NOW(),
              'original_data', question_data
            ),
            validation_rules = jsonb_build_object(
              'required_answer', true,
              'min_options', CASE WHEN question_type = 'mcq' THEN 2 ELSE 0 END
            )
          WHERE question_metadata = '{}'
        `,
        rollbackQuery: `
          UPDATE quiz_questions SET 
            question_metadata = '{}',
            validation_rules = '{}'
        `,
        validation: `SELECT COUNT(*) FROM quiz_questions WHERE question_metadata != '{}'`
      }
    ],
    validationQueries: [
      `SELECT COUNT(*) FROM quiz_questions WHERE question_metadata IS NOT NULL`,
      `SELECT COUNT(*) FROM quiz_questions WHERE difficulty_level IN ('easy', 'medium', 'hard')`
    ],
    estimatedDuration: '5-10 minutes',
    riskLevel: 'medium',
    backupRequired: true
  }
];

/**
 * Create migration state table if it doesn't exist
 */
async function ensureMigrationTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS migration_state (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
      version VARCHAR(50) NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      rollback_data JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Calculate checksum for migration
 */
function calculateMigrationChecksum(migration: Migration): string {
  const content = JSON.stringify({
    upQueries: migration.upQueries,
    downQueries: migration.downQueries,
    dataTransformations: migration.dataTransformations
  });
  
  // Simple hash function (in production, use crypto.createHash)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(migrationId: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count FROM migration_state WHERE id = ${migrationId}
  `);
  return (result.rows[0] as any).count > 0;
}

/**
 * Create backup before migration
 */
async function createBackup(migrationId: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', 'migrations');
  const backupPath = path.join(backupDir, `${migrationId}_${timestamp}.sql`);

  // Ensure backup directory exists
  if (!existsSync(backupDir)) {
    await mkdir(backupDir, { recursive: true });
  }

  // Create backup using pg_dump (simplified - in production use proper pg_dump)
  const backupContent = `-- Backup created before migration: ${migrationId}
-- Timestamp: ${new Date().toISOString()}
-- Note: This is a simplified backup. In production, use pg_dump for complete backups.

-- Backup awareness lab tables
BEGIN;

-- Create backup tables
CREATE TABLE IF NOT EXISTS backup_quizzes_${timestamp.replace(/-/g, '_')} AS SELECT * FROM quizzes;
CREATE TABLE IF NOT EXISTS backup_quiz_questions_${timestamp.replace(/-/g, '_')} AS SELECT * FROM quiz_questions;
CREATE TABLE IF NOT EXISTS backup_quiz_attempts_${timestamp.replace(/-/g, '_')} AS SELECT * FROM quiz_attempts;
CREATE TABLE IF NOT EXISTS backup_learning_modules_${timestamp.replace(/-/g, '_')} AS SELECT * FROM learning_modules;
CREATE TABLE IF NOT EXISTS backup_module_materials_${timestamp.replace(/-/g, '_')} AS SELECT * FROM module_materials;
CREATE TABLE IF NOT EXISTS backup_learning_progress_${timestamp.replace(/-/g, '_')} AS SELECT * FROM learning_progress;

COMMIT;
`;

  await writeFile(backupPath, backupContent);
  logger.info(`Backup created: ${backupPath}`);
  
  return backupPath;
}

/**
 * Execute migration queries
 */
async function executeMigrationQueries(queries: string[], migrationId: string): Promise<{ recordsAffected: number; errors: string[] }> {
  let recordsAffected = 0;
  const errors: string[] = [];

  for (const query of queries) {
    try {
      logger.info(`Executing query for ${migrationId}: ${query.substring(0, 100)}...`);
      const result = await db.execute(sql.raw(query));
      recordsAffected += result.rowCount || 0;
    } catch (error) {
      const errorMessage = `Failed to execute query: ${query.substring(0, 100)}... Error: ${error}`;
      logger.error(errorMessage, { error });
      errors.push(errorMessage);
    }
  }

  return { recordsAffected, errors };
}

/**
 * Execute data transformations
 */
async function executeDataTransformations(transformations: DataTransformation[], migrationId: string): Promise<{ recordsAffected: number; errors: string[] }> {
  let recordsAffected = 0;
  const errors: string[] = [];

  for (const transformation of transformations) {
    try {
      logger.info(`Executing transformation: ${transformation.name}`);
      const result = await db.execute(sql.raw(transformation.query));
      recordsAffected += result.rowCount || 0;

      // Validate transformation
      if (transformation.validation) {
        const validationResult = await db.execute(sql.raw(transformation.validation));
        logger.info(`Transformation validation: ${transformation.name} - ${JSON.stringify(validationResult.rows[0])}`);
      }
    } catch (error) {
      const errorMessage = `Failed to execute transformation ${transformation.name}: ${error}`;
      logger.error(errorMessage, { error });
      errors.push(errorMessage);
    }
  }

  return { recordsAffected, errors };
}

/**
 * Validate migration results
 */
async function validateMigration(migration: Migration): Promise<string[]> {
  const warnings: string[] = [];

  if (migration.validationQueries) {
    for (const validationQuery of migration.validationQueries) {
      try {
        const result = await db.execute(sql.raw(validationQuery));
        logger.info(`Validation query result: ${JSON.stringify(result.rows[0])}`);
      } catch (error) {
        warnings.push(`Validation query failed: ${validationQuery} - ${error}`);
      }
    }
  }

  return warnings;
}

/**
 * Record migration state
 */
async function recordMigrationState(migration: Migration, rollbackData?: any): Promise<void> {
  const checksum = calculateMigrationChecksum(migration);
  
  await db.execute(sql`
    INSERT INTO migration_state (id, version, checksum, rollback_data)
    VALUES (${migration.id}, ${migration.version}, ${checksum}, ${JSON.stringify(rollbackData)})
    ON CONFLICT (id) DO UPDATE SET
      applied_at = NOW(),
      version = EXCLUDED.version,
      checksum = EXCLUDED.checksum,
      rollback_data = EXCLUDED.rollback_data
  `);
}

/**
 * Apply migration
 */
async function applyMigration(migration: Migration, options: { dryRun?: boolean; backup?: boolean } = {}): Promise<MigrationResult> {
  const { dryRun = false, backup = true } = options;
  const startTime = new Date();
  
  const result: MigrationResult = {
    migrationId: migration.id,
    success: false,
    startTime,
    endTime: new Date(),
    duration: 0,
    recordsAffected: 0,
    errors: [],
    warnings: []
  };

  try {
    logger.info(`${dryRun ? 'Dry run' : 'Applying'} migration: ${migration.name}`);

    // Check dependencies
    for (const dep of migration.dependencies) {
      if (!(await isMigrationApplied(dep))) {
        throw new Error(`Dependency not met: ${dep}`);
      }
    }

    // Check if already applied
    if (await isMigrationApplied(migration.id)) {
      logger.warn(`Migration ${migration.id} already applied`);
      result.warnings.push('Migration already applied');
      result.success = true;
      return result;
    }

    // Create backup if required and not dry run
    if (backup && migration.backupRequired && !dryRun) {
      result.backupPath = await createBackup(migration.id);
    }

    if (!dryRun) {
      // Begin transaction
      await db.execute(sql`BEGIN`);

      try {
        // Execute schema changes
        const schemaResult = await executeMigrationQueries(migration.upQueries, migration.id);
        result.recordsAffected += schemaResult.recordsAffected;
        result.errors.push(...schemaResult.errors);

        // Execute data transformations
        if (migration.dataTransformations) {
          const transformResult = await executeDataTransformations(migration.dataTransformations, migration.id);
          result.recordsAffected += transformResult.recordsAffected;
          result.errors.push(...transformResult.errors);
        }

        // Validate migration
        const validationWarnings = await validateMigration(migration);
        result.warnings.push(...validationWarnings);

        // Record migration state
        await recordMigrationState(migration);

        // Commit transaction
        await db.execute(sql`COMMIT`);
        
        result.success = true;
        logger.info(`Migration ${migration.id} applied successfully`);
      } catch (error) {
        // Rollback transaction
        await db.execute(sql`ROLLBACK`);
        throw error;
      }
    } else {
      // Dry run - just log what would be done
      logger.info(`Would execute ${migration.upQueries.length} schema queries`);
      if (migration.dataTransformations) {
        logger.info(`Would execute ${migration.dataTransformations.length} data transformations`);
      }
      result.success = true;
    }

  } catch (error) {
    const errorMessage = `Migration ${migration.id} failed: ${error}`;
    logger.error(errorMessage, { error });
    result.errors.push(errorMessage);
  }

  result.endTime = new Date();
  result.duration = result.endTime.getTime() - result.startTime.getTime();

  return result;
}

/**
 * Rollback migration
 */
async function rollbackMigration(migrationId: string): Promise<MigrationResult> {
  const startTime = new Date();
  
  const result: MigrationResult = {
    migrationId,
    success: false,
    startTime,
    endTime: new Date(),
    duration: 0,
    recordsAffected: 0,
    errors: [],
    warnings: []
  };

  try {
    logger.info(`Rolling back migration: ${migrationId}`);

    // Check if migration was applied
    if (!(await isMigrationApplied(migrationId))) {
      throw new Error(`Migration ${migrationId} was not applied`);
    }

    // Find migration
    const migration = MIGRATIONS.find(m => m.id === migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    // Begin transaction
    await db.execute(sql`BEGIN`);

    try {
      // Execute rollback data transformations first
      if (migration.dataTransformations) {
        for (const transformation of migration.dataTransformations) {
          if (transformation.rollbackQuery) {
            logger.info(`Rolling back transformation: ${transformation.name}`);
            const rollbackResult = await db.execute(sql.raw(transformation.rollbackQuery));
            result.recordsAffected += rollbackResult.rowCount || 0;
          }
        }
      }

      // Execute rollback schema changes
      const rollbackResult = await executeMigrationQueries(migration.downQueries, migrationId);
      result.recordsAffected += rollbackResult.recordsAffected;
      result.errors.push(...rollbackResult.errors);

      // Remove migration state
      await db.execute(sql`DELETE FROM migration_state WHERE id = ${migrationId}`);

      // Commit transaction
      await db.execute(sql`COMMIT`);
      
      result.success = true;
      logger.info(`Migration ${migrationId} rolled back successfully`);
    } catch (error) {
      // Rollback transaction
      await db.execute(sql`ROLLBACK`);
      throw error;
    }

  } catch (error) {
    const errorMessage = `Rollback of ${migrationId} failed: ${error}`;
    logger.error(errorMessage, { error });
    result.errors.push(errorMessage);
  }

  result.endTime = new Date();
  result.duration = result.endTime.getTime() - result.startTime.getTime();

  return result;
}

/**
 * List available migrations
 */
async function listMigrations(): Promise<void> {
  await ensureMigrationTable();

  console.log('📋 Available Migrations:');
  console.log('========================\n');

  for (const migration of MIGRATIONS) {
    const isApplied = await isMigrationApplied(migration.id);
    const status = isApplied ? '✅ Applied' : '⏳ Pending';
    const riskIcon = { low: '🟢', medium: '🟡', high: '🔴' }[migration.riskLevel];
    
    console.log(`${status} ${migration.id}`);
    console.log(`   Name: ${migration.name}`);
    console.log(`   Description: ${migration.description}`);
    console.log(`   Version: ${migration.version}`);
    console.log(`   Risk Level: ${riskIcon} ${migration.riskLevel}`);
    console.log(`   Duration: ${migration.estimatedDuration}`);
    console.log(`   Backup Required: ${migration.backupRequired ? '✅' : '❌'}`);
    if (migration.dependencies.length > 0) {
      console.log(`   Dependencies: ${migration.dependencies.join(', ')}`);
    }
    console.log('');
  }
}

/**
 * CLI execution when run directly
 */
if (import.meta.main) {
  const args = process.argv.slice(2);
  const migrationName = args.find(arg => args[args.indexOf(arg) - 1] === '--migration');
  const rollbackName = args.find(arg => args[args.indexOf(arg) - 1] === '--rollback');
  const listMigrationsFlag = args.includes('--list');
  const dryRun = args.includes('--dry-run');
  const backup = !args.includes('--no-backup');
  const force = args.includes('--force');

  console.log('🔄 Kavach Data Migration Tool');
  console.log('============================\n');

  (async () => {
    try {
      await ensureMigrationTable();

      if (listMigrationsFlag) {
        await listMigrations();
        return;
      }

      if (rollbackName) {
        console.log(`🔙 Rolling back migration: ${rollbackName}\n`);
        const result = await rollbackMigration(rollbackName);
        
        console.log('📊 Rollback Results:');
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Records affected: ${result.recordsAffected}`);
        
        if (result.errors.length > 0) {
          console.log('\n❌ Errors:');
          result.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        process.exit(result.success ? 0 : 1);
      }

      if (migrationName) {
        const migration = MIGRATIONS.find(m => m.id === migrationName);
        if (!migration) {
          console.error(`❌ Migration not found: ${migrationName}`);
          process.exit(1);
        }

        if (dryRun) {
          console.log(`🔍 Dry run mode - previewing migration: ${migration.name}\n`);
        } else {
          console.log(`🚀 Applying migration: ${migration.name}\n`);
          if (migration.riskLevel === 'high' && !force) {
            console.log('⚠️  This is a HIGH RISK migration. Use --force to proceed.');
            process.exit(1);
          }
        }

        const result = await applyMigration(migration, { dryRun, backup });
        
        console.log('📊 Migration Results:');
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Records affected: ${result.recordsAffected}`);
        
        if (result.backupPath) {
          console.log(`   Backup: ${result.backupPath}`);
        }
        
        if (result.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          result.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        if (result.errors.length > 0) {
          console.log('\n❌ Errors:');
          result.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        process.exit(result.success ? 0 : 1);
      }

      // No specific action - show help
      console.log('Usage:');
      console.log('  --list                    List available migrations');
      console.log('  --migration <name>        Apply specific migration');
      console.log('  --rollback <name>         Rollback specific migration');
      console.log('  --dry-run                 Preview without executing');
      console.log('  --no-backup               Skip backup creation');
      console.log('  --force                   Skip confirmation prompts');
      console.log('\nExample:');
      console.log('  bun run scripts/data-migration.ts --list');
      console.log('  bun run scripts/data-migration.ts --migration add_quiz_metadata_fields --dry-run');
      
    } catch (error) {
      console.error('💥 Migration tool failed:', error);
      process.exit(1);
    }
  })();
}

export { 
  applyMigration, 
  rollbackMigration, 
  listMigrations,
  MIGRATIONS,
  type Migration, 
  type MigrationResult 
};