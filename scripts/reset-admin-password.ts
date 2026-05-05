#!/usr/bin/env bun

/**
 * Reset password for a selected existing admin user only.
 *
 * Usage:
 *   bun run scripts/reset-admin-password.ts                        # Interactive mode
 *   bun run scripts/reset-admin-password.ts --email admin@acme.com  # Auto-generate and reset
 *   bun run scripts/reset-admin-password.ts --email admin@acme.com --password "NewP@ssw0rd!"  # Use provided password
 *   bun run scripts/reset-admin-password.ts --list                  # List admin users (no changes)
 *   bun run scripts/reset-admin-password.ts --confirm               # Skip confirmation prompts
 *   bun run scripts/reset-admin-password.ts --force-unsafe          # Allow running on non-dev databases
 */

import { db, client } from '../src/lib/database/connection';
import { userRepository } from '../src/lib/database/repositories/user-repository';
import { users } from '../src/lib/database/schema';
import { desc, eq } from 'drizzle-orm';
import { hashPassword, generateSecurePassword, validatePassword } from '../src/lib/auth/password-utils';
import * as readline from 'readline';

// Safety checks similar to delete-admin.ts
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = "postgresql://neondb_owner:npg_69rYlPxcqHJA@ep-dawn-snow-adc63uhf-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

if (!DATABASE_URL) {
	console.error('🚨 ERROR: DATABASE_URL environment variable is required!');
	process.exit(1);
}

const isNeon = /neon\.tech/i.test(DATABASE_URL);
const isDatabaseSafe = DATABASE_URL.includes('localhost') ||
	DATABASE_URL.includes('127.0.0.1') ||
	DATABASE_URL.toLowerCase().includes('dev') ||
	(isNeon && NODE_ENV !== 'production') ||
	process.argv.includes('--force-unsafe');

if (NODE_ENV === 'production' && !process.argv.includes('--force-unsafe')) {
	console.error('🚨 ERROR: This script is blocked in production unless you pass --force-unsafe.');
	process.exit(1);
}

if (!isDatabaseSafe) {
	console.error('🚨 ERROR: This script can only be run against local/dev databases.');
	console.error('Current DATABASE_URL:', DATABASE_URL.replace(/\/\/[^@]+@/, '//***:***@'));
	console.error('If this is a safe dev database, re-run with --force-unsafe');
	process.exit(1);
}

interface Options {
	email?: string;
	password?: string; // optional; if omitted, auto-generate
	confirm?: boolean;
	list?: boolean;
	forceUnsafe?: boolean;
}

function parseArgs(): Options {
	const args = process.argv.slice(2);
	const opts: Options = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		switch (arg) {
			case '--email':
				opts.email = args[++i];
				break;
			case '--password':
				opts.password = args[++i];
				break;
			case '--confirm':
				opts.confirm = true;
				break;
			case '--list':
				opts.list = true;
				break;
			case '--force-unsafe':
				opts.forceUnsafe = true;
				break;
			case '--help':
			case '-h':
				printHelp();
				process.exit(0);
				break;
			default:
				if (arg.startsWith('--')) {
					console.error(`Unknown option: ${arg}`);
					process.exit(1);
				}
		}
	}

	return opts;
}

function printHelp() {
	console.log(`\n🔐 Reset Admin Password\n========================\n\nReset the password for a selected existing admin user.\n\nUsage:\n  bun run scripts/reset-admin-password.ts [options]\n\nOptions:\n  --email <email>          Target admin email\n  --password <password>    Use provided password (validated)\n  --list                   List admin users (no changes)\n  --confirm                Skip confirmation prompts\n  --force-unsafe           Allow running on non-dev databases\n  --help, -h               Show this help\n\nExamples:\n  bun run scripts/reset-admin-password.ts\n  bun run scripts/reset-admin-password.ts --email admin@company.com\n  bun run scripts/reset-admin-password.ts --email admin@company.com --password 'NewP@ssw0rd!'\n`);
}

function createPrompt() {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const question = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));
	const close = () => rl.close();
	return { question, close };
}

async function listAdmins() {
	const admins = await db
		.select({
			id: users.id,
			email: users.email,
			firstName: users.firstName,
			lastName: users.lastName,
			createdAt: users.createdAt,
			isEmailVerified: users.isEmailVerified,
		})
		.from(users)
		.where(eq(users.role, 'admin'))
		.orderBy(desc(users.createdAt));

	if (admins.length === 0) {
		console.log('❌ No admin users found.');
		return;
	}

	console.log(`✅ Found ${admins.length} admin user(s):\n`);
	admins.forEach((u: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		createdAt: Date;
		isEmailVerified: boolean;
	}, i: number) => {
		console.log(`${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
		console.log(`   ID: ${u.id}`);
		console.log(`   Created: ${u.createdAt.toISOString()}`);
		console.log(`   Email Verified: ${u.isEmailVerified ? '✅' : '❌'}`);
		console.log('');
	});
}

async function resolveTargetEmail(opts: Options): Promise<string | null> {
	if (opts.email) return opts.email.toLowerCase().trim();

	const { question, close } = createPrompt();
	try {
		console.log('No email provided. You can list admins to find the email.');
		const shouldList = (await question('List admin users first? (y/N): ')).toLowerCase();
		if (shouldList === 'y' || shouldList === 'yes') {
			console.log('');
			await listAdmins();
		}
		const email = (await question('Enter admin email to reset password: ')).trim();
		if (!email) return null;
		return email.toLowerCase();
	} finally {
		close();
	}
}

async function obtainPassword(existing?: string): Promise<string> {
	if (existing) return existing;

	const { question, close } = createPrompt();
	try {
		console.log('\nPassword options:');
		console.log('1. Generate a secure password automatically');
		console.log('2. Enter a custom password');
		const choice = await question('Choose option (1/2): ');

		if (choice.trim() === '2') {
			const pwd = await question('Enter new password: ');
			if (!pwd) throw new Error('Password cannot be empty');
			return pwd;
		}

		const generated = generateSecurePassword(16);
		console.log('✅ Generated secure password');
		return generated;
	} finally {
		close();
	}
}

async function resetAdminPassword(email: string, newPassword: string, skipConfirm: boolean) {
	console.log(`\n🔎 Looking up admin: ${email}`);
	const admin = await userRepository.findByEmailAndRole(email, 'admin');
	if (!admin) {
		throw new Error('Admin user not found.');
	}

	console.log('✅ Admin found:');
	console.log(`   ID: ${admin.id}`);
	console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
	console.log(`   Email Verified: ${admin.isEmailVerified ? 'Yes' : 'No'}`);

	// Validate password
	const validation = validatePassword(newPassword);
	if (!validation.isValid) {
		throw new Error(`Password does not meet security requirements:\n- ${validation.errors.join('\n- ')}`);
	}
	console.log(`✅ Password strength: ${validation.strength.toUpperCase()}`);

	if (!skipConfirm) {
		const { question, close } = createPrompt();
		try {
			const confirm = (await question('Proceed with password reset? (yes/no): ')).toLowerCase();
			if (confirm !== 'yes' && confirm !== 'y') {
				console.log('❌ Password reset cancelled.');
				return null;
			}
		} finally {
			close();
		}
	}

	console.log('\n🔧 Updating password...');
	console.log(`Admin ID: ${admin.id}`);
	const passwordHash = await hashPassword(newPassword);
	console.log(`New hash (first 30 chars): ${passwordHash}`);

	console.log('Calling userRepository.update()...');
	const updated = await userRepository.update(admin.id, { passwordHash });
	if (!updated) {
		throw new Error('Failed to update admin password.');
	}

	console.log('✅ Password updated successfully!');
	console.log(`Updated hash (first 30 chars): ${updated.passwordHash.substring(0, 30)}...`);

	// Verify the update actually happened
	console.log('\n🔍 Verifying password was updated in database...');
	const verified = await userRepository.findById(admin.id);
	if (verified) {
		console.log(`Verified hash (first 30 chars): ${verified.passwordHash.substring(0, 30)}...`);
		if (verified.passwordHash !== passwordHash) {
			throw new Error('Password hash verification failed! Update did not persist.');
		}
		console.log('✅ Verification passed: password hash matches!');
	}

	return { email: updated.email, password: newPassword };
}

async function main() {
	try {
		// Quick DB check
		await db.execute('SELECT 1');

		const opts = parseArgs();

		if (opts.list) {
			await listAdmins();
			return;
		}

		const email = await resolveTargetEmail(opts);
		if (!email) {
			console.error('❌ Email is required.');
			process.exit(1);
		}

		const password = await obtainPassword(opts.password);

		const result = await resetAdminPassword(email, password, !!opts.confirm);
		if (result) {
			console.log('\n🔐 New Admin Credentials');
			console.log('========================');
			console.log(`Email: ${result.email}`);
			console.log(`Password: ${result.password}`);
			console.log('========================');
			console.log('⚠️  Store this password securely and rotate regularly.');
		}
	} catch (err) {
		console.error('\n❌ Password reset failed:', err instanceof Error ? err.message : err);
		process.exit(1);
	} finally {
		try { await client.end(); } catch { /* ignore */ }
	}
}

if (require.main === module) {
	main();
}

export { };
