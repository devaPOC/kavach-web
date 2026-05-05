#!/usr/bin/env bun


import { db, client } from '@/lib/database/connection';
import { userRepository } from '@/lib/database/repositories/user-repository';
import { hashPassword, generateSecurePassword, validatePassword } from '@/lib/auth/password-utils';

interface CreateAdminOptions {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  force?: boolean; // Overwrite existing admin
}

/**
 * Interactive prompt for admin details
 */
async function promptAdminDetails(): Promise<CreateAdminOptions> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    console.log('🔐 Admin User Creation');
    console.log('=====================\n');

    const email = await question('Admin email (default: admin@kavach.com): ') || 'admin@kavach.com';
    const firstName = await question('First name (default: System): ') || 'System';
    const lastName = await question('Last name (default: Administrator): ') || 'Administrator';

    console.log('\nPassword options:');
    console.log('1. Generate secure password automatically');
    console.log('2. Enter custom password');

    const passwordChoice = await question('Choose option (1 or 2): ');
    let password: string | undefined;

    if (passwordChoice === '2') {
      password = await question('Enter password: ');
      if (!password) {
        throw new Error('Password cannot be empty');
      }
    }

    const forceChoice = await question('Overwrite existing admin user? (y/N): ');
    const force = forceChoice.toLowerCase() === 'y' || forceChoice.toLowerCase() === 'yes';

    return { email, firstName, lastName, password, force };

  } finally {
    rl.close();
  }
}

/**
 * Create admin user with the provided options
 */
async function createAdmin(options: CreateAdminOptions): Promise<{ email: string; password: string }> {
  const {
    email = 'admin@kavach.com',
    firstName = 'System',
    lastName = 'Administrator',
    password: providedPassword,
    force = false
  } = options;

  console.log(`\nCreating admin user: ${email}`);

  // Check if admin already exists
  const existingAdmin = await userRepository.findByEmailAndRole(email, 'admin');
  if (existingAdmin && !force) {
    throw new Error(`Admin user with email ${email} already exists. Use --force to overwrite.`);
  }

  // Generate or validate password
  let password = providedPassword;
  if (!password) {
    password = generateSecurePassword(16);
    console.log('✅ Generated secure password');
  }

  // Validate password strength
  const validation = validatePassword(password);
  if (!validation.isValid) {
    throw new Error(`Password does not meet security requirements:\n${validation.errors.join('\n')}`);
  }

  console.log(`✅ Password strength: ${validation.strength.toUpperCase()}`);

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create or update admin user
  let adminUser;
  if (existingAdmin && force) {
    console.log('Updating existing admin user...');
    adminUser = await userRepository.update(existingAdmin.id, {
      firstName,
      lastName,
      passwordHash,
      isEmailVerified: true,
    });
  } else {
    console.log('Creating new admin user...');
    adminUser = await userRepository.create({
      email,
      firstName,
      lastName,
      passwordHash,
      role: 'admin',
    });

    // Verify admin email immediately
    await userRepository.verifyEmail(adminUser!.id);
  }

  if (!adminUser) {
    throw new Error('Failed to create admin user');
  }

  console.log('✅ Admin user created successfully:');
  console.log(`   ID: ${adminUser.id}`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
  console.log(`   Role: ${adminUser.role}`);
  console.log(`   Email Verified: ${adminUser.isEmailVerified ? 'Yes' : 'No'}`);

  return { email, password };
}

/**
 * Parse command line arguments
 */
function parseArgs(): CreateAdminOptions {
  const args = process.argv.slice(2);
  const options: CreateAdminOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--email':
        options.email = args[++i];
        break;
      case '--first-name':
        options.firstName = args[++i];
        break;
      case '--last-name':
        options.lastName = args[++i];
        break;
      case '--password':
        options.password = args[++i];
        break;
      case '--force':
        options.force = true;
        break;
      case '--help':
      case '-h':
        console.log('Usage: bun run scripts/create-admin.ts [options]');
        console.log('');
        console.log('Options:');
        console.log('  --email <email>        Admin email address');
        console.log('  --first-name <name>    Admin first name');
        console.log('  --last-name <name>     Admin last name');
        console.log('  --password <password>  Admin password (will generate if not provided)');
        console.log('  --force               Overwrite existing admin user');
        console.log('  --help, -h            Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  bun run scripts/create-admin.ts');
        console.log('  bun run scripts/create-admin.ts --email admin@company.com --force');
        console.log('  bun run scripts/create-admin.ts --email admin@company.com --password MySecurePass123!');
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Test database connection
    await db.execute('SELECT 1');

    const args = parseArgs();

    // If no arguments provided, use interactive mode
    const options = Object.keys(args).length === 0 ? await promptAdminDetails() : args;

    // Create admin user
    const credentials = await createAdmin(options);

    console.log('\n🎉 Admin user creation completed successfully!');

    // Display credentials
    console.log('\n🔐 Admin Credentials:');
    console.log('====================');
    console.log(`Email: ${credentials.email}`);
    console.log(`Password: ${credentials.password}`);
    console.log('====================');
    console.log('⚠️  Please save these credentials securely!');
    console.log('💡 You can now login at: /admin/login');

  } catch (error) {
    console.error('\n❌ Admin user creation failed:', error);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (error) {
      // Ignore connection close errors
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { createAdmin };
