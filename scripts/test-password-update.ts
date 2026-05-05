#!/usr/bin/env bun

import { db, client } from '../src/lib/database/connection';
import { users } from '../src/lib/database/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/lib/auth/password-utils';

async function testPasswordUpdate() {
	try {
		const email = 'admin@kavach.com';
		const newPassword = 'TestPassword@123';

		console.log('🔎 Fetching current admin...');
		const [admin] = await db
			.select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!admin) {
			console.error('❌ Admin not found');
			process.exit(1);
		}

		console.log(`✅ Admin found: ${admin.email}`);
		console.log(`Current hash (first 30 chars): ${admin.passwordHash.substring(0, 30)}...`);

		console.log('\n🔧 Hashing new password...');
		const newHash = await hashPassword(newPassword);
		console.log(`New hash (first 30 chars): ${newHash.substring(0, 30)}...`);

		console.log('\n🔧 Updating password in database...');
		const [updated] = await db
			.update(users)
			.set({ passwordHash: newHash, updatedAt: new Date() })
			.where(eq(users.id, admin.id))
			.returning({ id: users.id, passwordHash: users.passwordHash });

		console.log(`Updated hash (first 30 chars): ${updated.passwordHash.substring(0, 30)}...`);

		console.log('\n✅ Verifying update...');
		const [verified] = await db
			.select({ passwordHash: users.passwordHash })
			.from(users)
			.where(eq(users.id, admin.id))
			.limit(1);

		console.log(`Verified hash (first 30 chars): ${verified.passwordHash.substring(0, 30)}...`);

		// Check if hashes match
		if (newHash === verified.passwordHash) {
			console.log('\n✅ SUCCESS: Password hash updated correctly!');
		} else {
			console.log('\n❌ FAILURE: Hash mismatch!');
		}
	} catch (error) {
		console.error('\n❌ Error:', error instanceof Error ? error.message : error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

testPasswordUpdate();
