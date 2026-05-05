#!/usr/bin/env bun

/**
 * Script to delete admin users from the database
 *
 * ⚠️ WARNING: This script will permanently delete admin users and cannot be undone!
 * ⚠️ Use with extreme caution and only in development/testing environments!
 *
 * Usage:
 *   bun run scripts/delete-admin.ts                    # Interactive mode
 *   bun run scripts/delete-admin.ts --email admin@example.com
 *   bun run scripts/delete-admin.ts --all              # Delete ALL admin users (dangerous!)
 *   bun run scripts/delete-admin.ts --list             # List all admin users
 *   bun run scripts/delete-admin.ts --confirm          # Skip confirmation prompts
 */

import { db, client } from '@/lib/database/connection';
import { userRepository } from '@/lib/database/repositories/user-repository';
import { users } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import * as readline from 'readline';

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

interface DeleteAdminOptions {
  email?: string;
  all?: boolean;
  list?: boolean;
  confirm?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): DeleteAdminOptions {
  const args = process.argv.slice(2);
  const options: DeleteAdminOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--email':
        options.email = args[++i];
        break;
      case '--all':
        options.all = true;
        break;
      case '--list':
        options.list = true;
        break;
      case '--confirm':
        options.confirm = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
🗑️  Admin User Deletion Script
=============================

This script allows you to delete admin users from the database.

Usage:
  bun run scripts/delete-admin.ts [options]

Options:
  --email <email>     Delete admin user with specific email
  --all               Delete ALL admin users (very dangerous!)
  --list              List all admin users without deleting
  --confirm           Skip confirmation prompts
  --help, -h          Show this help message

Examples:
  bun run scripts/delete-admin.ts --list
  bun run scripts/delete-admin.ts --email admin@example.com
  bun run scripts/delete-admin.ts --all --confirm

⚠️  WARNING: This script permanently deletes data and cannot be undone!
⚠️  Only use in development/testing environments!
`);
}

/**
 * Interactive prompt utility
 */
function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  const close = () => rl.close();

  return { question, close };
}

/**
 * Find all admin users
 */
async function findAdminUsers() {
  try {
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .orderBy(users.createdAt);

    return adminUsers;
  } catch (error) {
    throw new Error(`Failed to find admin users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find admin user by email
 */
async function findAdminByEmail(email: string) {
  try {
    const adminUser = await userRepository.findByEmailAndRole(email.toLowerCase().trim(), 'admin');
    return adminUser;
  } catch (error) {
    throw new Error(`Failed to find admin user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete admin user by ID
 */
async function deleteAdminUser(userId: string) {
  try {
    const success = await userRepository.delete(userId);
    return success;
  } catch (error) {
    throw new Error(`Failed to delete admin user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all admin users
 */
async function listAdminUsers() {
  console.log('🔍 Finding admin users...\n');

  const adminUsers = await findAdminUsers();

  if (adminUsers.length === 0) {
    console.log('❌ No admin users found.');
    return;
  }

  console.log(`✅ Found ${adminUsers.length} admin user(s):\n`);

  adminUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.createdAt.toISOString()}`);
    console.log(`   Verified: ${user.isEmailVerified ? '✅' : '❌'}`);
    console.log('');
  });
}

/**
 * Delete admin user by email
 */
async function deleteAdminByEmail(email: string, skipConfirmation: boolean = false) {
  console.log(`🔍 Looking for admin user with email: ${email}`);

  const adminUser = await findAdminByEmail(email);

  if (!adminUser) {
    console.log('❌ Admin user not found.');
    return;
  }

  console.log(`\n✅ Found admin user:`);
  console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   ID: ${adminUser.id}`);
  console.log(`   Created: ${adminUser.createdAt.toISOString()}`);

  if (!skipConfirmation) {
    const { question, close } = createPrompt();

    console.log('\n⚠️  WARNING: This action cannot be undone!');
    const confirm = await question('Are you sure you want to delete this admin user? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Deletion cancelled.');
      close();
      return;
    }
    close();
  }

  console.log('\n🗑️  Deleting admin user...');

  const success = await deleteAdminUser(adminUser.id);

  if (success) {
    console.log('✅ Admin user deleted successfully!');
  } else {
    console.log('❌ Failed to delete admin user.');
  }
}

/**
 * Delete all admin users
 */
async function deleteAllAdminUsers(skipConfirmation: boolean = false) {
  console.log('🔍 Finding all admin users...\n');

  const adminUsers = await findAdminUsers();

  if (adminUsers.length === 0) {
    console.log('❌ No admin users found.');
    return;
  }

  console.log(`⚠️  Found ${adminUsers.length} admin user(s) to delete:`);
  adminUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
  });

  if (!skipConfirmation) {
    const { question, close } = createPrompt();

    console.log('\n🚨 DANGER: This will delete ALL admin users!');
    console.log('⚠️  This action cannot be undone!');
    const confirm = await question('Are you absolutely sure? Type "DELETE ALL ADMINS" to confirm: ');

    if (confirm !== 'DELETE ALL ADMINS') {
      console.log('❌ Deletion cancelled.');
      close();
      return;
    }
    close();
  }

  console.log('\n🗑️  Deleting all admin users...');

  let deletedCount = 0;
  let failedCount = 0;

  for (const user of adminUsers) {
    try {
      console.log(`   Deleting: ${user.firstName} ${user.lastName} (${user.email})`);
      const success = await deleteAdminUser(user.id);

      if (success) {
        deletedCount++;
        console.log(`   ✅ Deleted successfully`);
      } else {
        failedCount++;
        console.log(`   ❌ Failed to delete`);
      }
    } catch (error) {
      failedCount++;
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Successfully deleted: ${deletedCount}`);
  console.log(`   ❌ Failed to delete: ${failedCount}`);
}

/**
 * Interactive mode for admin deletion
 */
async function interactiveMode() {
  const { question, close } = createPrompt();

  try {
    console.log('🗑️  Admin User Deletion Script');
    console.log('==============================\n');

    console.log('What would you like to do?');
    console.log('1. List all admin users');
    console.log('2. Delete admin user by email');
    console.log('3. Delete ALL admin users (dangerous!)');
    console.log('4. Exit');

    const choice = await question('\nEnter your choice (1-4): ');

    switch (choice) {
      case '1':
        await listAdminUsers();
        break;

      case '2':
        const email = await question('Enter admin email to delete: ');
        if (email.trim()) {
          await deleteAdminByEmail(email.trim());
        } else {
          console.log('❌ Email cannot be empty.');
        }
        break;

      case '3':
        await deleteAllAdminUsers();
        break;

      case '4':
        console.log('👋 Goodbye!');
        break;

      default:
        console.log('❌ Invalid choice.');
        break;
    }
  } finally {
    close();
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    const options = parseArgs();

    // List mode
    if (options.list) {
      await listAdminUsers();
      return;
    }

    // Delete by email
    if (options.email) {
      await deleteAdminByEmail(options.email, options.confirm);
      return;
    }

    // Delete all admins
    if (options.all) {
      await deleteAllAdminUsers(options.confirm);
      return;
    }

    // Default to interactive mode
    await interactiveMode();

  } catch (error) {
    console.error('💥 Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    // Ensure database connection is closed
    try {
      await client.end();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the script
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
