#!/usr/bin/env bun

/**
 * Development script to force delete quizzes or learning modules with existing attempts/progress
 * This script bypasses the business logic restrictions and directly removes data from the database
 *
 * ⚠️ WARNING: This script is for DEVELOPMENT PURPOSES ONLY!
 * ⚠️ It will permanently delete data and cannot be undone!
 *
 * Usage:
 *   bun run scripts/force-delete-dev.ts quiz <quizId>
 *   bun run scripts/force-delete-dev.ts module <moduleId>
 *   bun run scripts/force-delete-dev.ts quiz <quizId> --confirm
 *   bun run scripts/force-delete-dev.ts module <moduleId> --confirm
 *   bun run scripts/force-delete-dev.ts quiz <quizId> --confirm --force-unsafe
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as readline from 'readline';
import { quizzes, quizQuestions, quizAttempts } from '../src/lib/database/schema/quizzes';
import { learningModules, moduleMaterials, learningProgress } from '../src/lib/database/schema/learning-materials';

// Environment and safety checks
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL;

if (NODE_ENV === 'production') {
  console.error('🚨 ERROR: This script cannot be run in production environment!');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('🚨 ERROR: DATABASE_URL environment variable is required!');
  process.exit(1);
}

// Check if this is a potentially unsafe database
const isDatabaseSafe = DATABASE_URL.includes('localhost') ||
  DATABASE_URL.includes('127.0.0.1') ||
  DATABASE_URL.includes('dev') ||
  process.argv.includes('--force-unsafe');

if (!isDatabaseSafe) {
  console.error('🚨 ERROR: This script can only be run against local or development databases!');
  console.error('Current DATABASE_URL:', DATABASE_URL.replace(/\/\/[^@]+@/, '//***:***@'));
  console.error('');
  console.error('If you are CERTAIN this is a development database, you can override this check with:');
  console.error('--force-unsafe flag, but BE EXTREMELY CAREFUL!');
  process.exit(1);
}

// Database connection
const client = postgres(DATABASE_URL);
const db = drizzle(client);

interface SelectableItem {
  id: string;
  title: string;
  type: 'quiz' | 'module';
  metadata?: string;
}

async function getAllQuizzes(): Promise<SelectableItem[]> {
  const allQuizzes = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      isPublished: quizzes.isPublished,
      createdAt: quizzes.createdAt
    })
    .from(quizzes)
    .orderBy(quizzes.createdAt);

  return allQuizzes.map(quiz => ({
    id: quiz.id,
    title: quiz.title,
    type: 'quiz' as const,
    metadata: `${quiz.isPublished ? '🟢 Published' : '🔴 Draft'} - Created: ${quiz.createdAt.toLocaleDateString()}`
  }));
}

async function getAllLearningModules(): Promise<SelectableItem[]> {
  const allModules = await db
    .select({
      id: learningModules.id,
      title: learningModules.title,
      category: learningModules.category,
      isPublished: learningModules.isPublished,
      createdAt: learningModules.createdAt
    })
    .from(learningModules)
    .orderBy(learningModules.createdAt);

  return allModules.map(module => ({
    id: module.id,
    title: module.title,
    type: 'module' as const,
    metadata: `📂 ${module.category} - ${module.isPublished ? '🟢 Published' : '🔴 Draft'} - Created: ${module.createdAt.toLocaleDateString()}`
  }));
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function showInteractiveSelection(items: SelectableItem[]): Promise<SelectableItem | null> {
  return new Promise((resolve) => {
    let currentIndex = 0;
    const rl = createInterface();

    function displayList() {
      console.clear();
      console.log('🔧 Force Delete Tool - Interactive Selection');
      console.log('═══════════════════════════════════════════════');
      console.log('Use ↑/↓ arrow keys to navigate, ENTER to select, q to quit\n');

      items.forEach((item, index) => {
        const indicator = index === currentIndex ? '→' : ' ';
        const icon = item.type === 'quiz' ? '📝' : '📚';
        console.log(`${indicator} ${icon} ${item.title}`);
        if (item.metadata) {
          console.log(`   ${item.metadata}`);
        }
        console.log('');
      });

      console.log('═══════════════════════════════════════════════');
      console.log('Press ENTER to select, q to quit');
    }

    function handleKeypress(key: string, data: any) {
      if (data.name === 'up' && currentIndex > 0) {
        currentIndex--;
        displayList();
      } else if (data.name === 'down' && currentIndex < items.length - 1) {
        currentIndex++;
        displayList();
      } else if (data.name === 'return') {
        rl.close();
        resolve(items[currentIndex]);
      } else if (key === 'q' || data.name === 'escape') {
        rl.close();
        resolve(null);
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('keypress', handleKeypress);

    // Enable keypress events
    if (process.stdin.isTTY) {
      require('readline').emitKeypressEvents(process.stdin);
    }

    displayList();

    rl.on('close', () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', handleKeypress);
    });
  });
}

async function showMainMenu(): Promise<'quiz' | 'module' | null> {
  return new Promise((resolve) => {
    const options = [
      { key: 'quiz', label: '📝 Delete Quiz', description: 'Browse and delete quizzes' },
      { key: 'module', label: '📚 Delete Learning Module', description: 'Browse and delete learning modules' }
    ];

    let currentIndex = 0;
    const rl = createInterface();

    function displayMenu() {
      console.clear();
      console.log('🔧 Force Delete Tool for Development');
      console.log('═══════════════════════════════════════════════');
      console.log('What would you like to delete?\n');

      options.forEach((option, index) => {
        const indicator = index === currentIndex ? '→' : ' ';
        console.log(`${indicator} ${option.label}`);
        console.log(`   ${option.description}\n`);
      });

      console.log('═══════════════════════════════════════════════');
      console.log('Use ↑/↓ arrow keys to navigate, ENTER to select, q to quit');
    }

    function handleKeypress(key: string, data: any) {
      if (data.name === 'up' && currentIndex > 0) {
        currentIndex--;
        displayMenu();
      } else if (data.name === 'down' && currentIndex < options.length - 1) {
        currentIndex++;
        displayMenu();
      } else if (data.name === 'return') {
        rl.close();
        resolve(options[currentIndex].key as 'quiz' | 'module');
      } else if (key === 'q' || data.name === 'escape') {
        rl.close();
        resolve(null);
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('keypress', handleKeypress);

    // Enable keypress events
    if (process.stdin.isTTY) {
      require('readline').emitKeypressEvents(process.stdin);
    }

    displayMenu();

    rl.on('close', () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', handleKeypress);
    });
  });
}

async function confirmDeletion(item: SelectableItem): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface();

    console.log('\n⚠️  DELETION CONFIRMATION');
    console.log('═══════════════════════════════════════════════');
    console.log(`You are about to permanently delete:`);
    console.log(`${item.type === 'quiz' ? '📝' : '📚'} ${item.title}`);
    if (item.metadata) {
      console.log(`${item.metadata}`);
    }
    console.log('\n🚨 This action CANNOT be undone!');
    console.log('This will also delete all related data (attempts, progress, etc.)');

    rl.question('\nType "DELETE" to confirm, or anything else to cancel: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'DELETE');
    });
  });
}

async function forceDeleteQuiz(quizId: string, confirm: boolean = false) {
  try {
    console.log(`🔍 Checking quiz: ${quizId}`);

    // First, check if quiz exists
    const quiz = await db
      .select({ id: quizzes.id, title: quizzes.title })
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (quiz.length === 0) {
      console.log('❌ Quiz not found with ID:', quizId);
      return;
    }

    console.log(`📝 Found quiz: "${quiz[0].title}"`);

    // Check for existing attempts
    const attempts = await db
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId));

    console.log(`🎯 Found ${attempts.length} quiz attempts`);

    if (!confirm) {
      console.log('\n⚠️  DRY RUN MODE - No changes will be made');
      console.log('📋 The following data would be deleted:');
      console.log(`   - 1 quiz: "${quiz[0].title}"`);
      console.log(`   - ${attempts.length} quiz attempts`);
      console.log('   - All quiz questions (cascade delete)');
      console.log('\n🔄 To execute the deletion, add --confirm flag');
      return;
    }

    console.log('\n🗑️  FORCE DELETING - This cannot be undone!');

    // Delete attempts first (no cascade relationship)
    if (attempts.length > 0) {
      const deletedAttempts = await db
        .delete(quizAttempts)
        .where(eq(quizAttempts.quizId, quizId));
      console.log(`✅ Deleted ${attempts.length} quiz attempts`);
    }

    // Delete quiz (questions will be deleted automatically due to cascade)
    const deletedQuiz = await db
      .delete(quizzes)
      .where(eq(quizzes.id, quizId));

    console.log(`✅ Successfully force deleted quiz: "${quiz[0].title}"`);
    console.log('✅ Quiz questions deleted automatically (cascade)');

  } catch (error) {
    console.error('❌ Error force deleting quiz:', error);
    throw error;
  }
}

async function forceDeleteLearningModule(moduleId: string, confirm: boolean = false) {
  try {
    console.log(`🔍 Checking learning module: ${moduleId}`);

    // First, check if module exists
    const module = await db
      .select({ id: learningModules.id, title: learningModules.title })
      .from(learningModules)
      .where(eq(learningModules.id, moduleId))
      .limit(1);

    if (module.length === 0) {
      console.log('❌ Learning module not found with ID:', moduleId);
      return;
    }

    console.log(`📚 Found learning module: "${module[0].title}"`);

    // Check for existing progress
    const progress = await db
      .select({ id: learningProgress.id })
      .from(learningProgress)
      .where(eq(learningProgress.moduleId, moduleId));

    // Check for materials
    const materials = await db
      .select({ id: moduleMaterials.id, title: moduleMaterials.title })
      .from(moduleMaterials)
      .where(eq(moduleMaterials.moduleId, moduleId));

    console.log(`📊 Found ${progress.length} progress records`);
    console.log(`📄 Found ${materials.length} materials`);

    if (!confirm) {
      console.log('\n⚠️  DRY RUN MODE - No changes will be made');
      console.log('📋 The following data would be deleted:');
      console.log(`   - 1 learning module: "${module[0].title}"`);
      console.log(`   - ${materials.length} materials`);
      console.log(`   - ${progress.length} progress records`);
      console.log('\n🔄 To execute the deletion, add --confirm flag');
      return;
    }

    console.log('\n🗑️  FORCE DELETING - This cannot be undone!');

    // Delete progress records first (no cascade relationship)
    if (progress.length > 0) {
      const deletedProgress = await db
        .delete(learningProgress)
        .where(eq(learningProgress.moduleId, moduleId));
      console.log(`✅ Deleted ${progress.length} progress records`);
    }

    // Delete module (materials will be deleted automatically due to cascade)
    const deletedModule = await db
      .delete(learningModules)
      .where(eq(learningModules.id, moduleId));

    console.log(`✅ Successfully force deleted learning module: "${module[0].title}"`);
    console.log('✅ Materials deleted automatically (cascade)');

  } catch (error) {
    console.error('❌ Error force deleting learning module:', error);
    throw error;
  }
}

function showUsage() {
  console.log(`
🛠️  Force Delete Tool for Development

Usage:
  # Interactive mode (recommended)
  bun run scripts/force-delete-dev.ts

  # Direct mode with IDs
  bun run scripts/force-delete-dev.ts quiz <quizId> [--confirm] [--force-unsafe]
  bun run scripts/force-delete-dev.ts module <moduleId> [--confirm] [--force-unsafe]

Examples:
  # Interactive selection (recommended)
  bun run scripts/force-delete-dev.ts

  # Direct quiz deletion
  bun run scripts/force-delete-dev.ts quiz 78aca222-f808-4117-b64f-6c91cc38fe96 --confirm

  # Force delete on non-local database (USE WITH EXTREME CAUTION!)
  bun run scripts/force-delete-dev.ts quiz 78aca222-f808-4117-b64f-6c91cc38fe96 --confirm --force-unsafe

⚠️  IMPORTANT SAFETY NOTES:
   - This script only works in development environments
   - Cannot be run in production
   - Only works with local/dev databases (unless --force-unsafe is used)
   - Deletions are permanent and cannot be undone
   - Interactive mode provides the safest experience
   - --force-unsafe bypasses database safety checks - USE WITH EXTREME CAUTION!
`);
}

async function main() {
  const args = process.argv.slice(2);

  console.log('🔧 Force Delete Tool for Development');
  console.log('📍 Environment:', NODE_ENV);
  console.log('🗄️  Database:', DATABASE_URL?.replace(/\/\/[^@]+@/, '//***:***@') || 'Unknown');
  console.log('');

  try {
    // Interactive mode (no arguments or just flags)
    if (args.length === 0 || (args.length === 1 && args[0].startsWith('--'))) {
      console.log('🎮 Running in INTERACTIVE mode\n');

      // Show main menu
      const selectedType = await showMainMenu();
      if (!selectedType) {
        console.log('\n👋 Operation cancelled by user');
        return;
      }

      // Get items based on selection
      let items: SelectableItem[] = [];
      if (selectedType === 'quiz') {
        console.log('\n🔍 Loading quizzes...');
        items = await getAllQuizzes();
      } else {
        console.log('\n🔍 Loading learning modules...');
        items = await getAllLearningModules();
      }

      if (items.length === 0) {
        console.log(`\n😔 No ${selectedType === 'quiz' ? 'quizzes' : 'learning modules'} found.`);
        return;
      }

      // Show selection list
      const selectedItem = await showInteractiveSelection(items);
      if (!selectedItem) {
        console.log('\n👋 Operation cancelled by user');
        return;
      }

      // Show what would be deleted first
      console.log('\n� Analyzing what would be deleted...');
      if (selectedItem.type === 'quiz') {
        await forceDeleteQuiz(selectedItem.id, false); // Dry run first
      } else {
        await forceDeleteLearningModule(selectedItem.id, false); // Dry run first
      }

      // Confirm deletion
      const confirmed = await confirmDeletion(selectedItem);
      if (!confirmed) {
        console.log('\n� Deletion cancelled by user');
        return;
      }

      // Perform actual deletion
      console.log('\n�️  Proceeding with deletion...');
      if (selectedItem.type === 'quiz') {
        await forceDeleteQuiz(selectedItem.id, true);
      } else {
        await forceDeleteLearningModule(selectedItem.id, true);
      }

    } else {
      // Direct mode (legacy support)
      if (args.length < 2) {
        showUsage();
        process.exit(1);
      }

      const [type, id] = args;
      const confirm = args.includes('--confirm');

      if (!confirm) {
        console.log('🟡 Running in DRY RUN mode - no changes will be made');
        console.log('💡 Add --confirm flag to actually execute deletions');
        console.log('');
      } else {
        console.log('🔴 DESTRUCTIVE MODE - Changes will be permanent!');
        console.log('');
      }

      if (type === 'quiz') {
        await forceDeleteQuiz(id, confirm);
      } else if (type === 'module') {
        await forceDeleteLearningModule(id, confirm);
      } else {
        console.error('❌ Invalid type. Use "quiz" or "module"');
        showUsage();
        process.exit(1);
      }
    }

    console.log('\n🎉 Operation completed successfully!');

  } catch (error) {
    console.error('\n💥 Operation failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the script
main().catch(console.error);
