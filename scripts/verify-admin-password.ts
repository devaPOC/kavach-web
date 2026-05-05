#!/usr/bin/env bun

import { db, client } from '../src/lib/database/connection';
import { users } from '../src/lib/database/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../src/lib/auth/password-utils';

async function verifyAdminPassword() {
	try {
		const email = 'admin@kavach.com';
		const password = 'Admin@789';

		const [admin] = await db
			.select({ passwordHash: users.passwordHash })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!admin) {
			console.error('❌ Admin not found');
			process.exit(1);
		}

		console.log('🔐 Testing password verification...');
		console.log(`Email: ${email}`);
		console.log(`Password: ${password}`);
		console.log(`Hash (first 30): ${admin.passwordHash.substring(0, 30)}...`);

		const isValid = await verifyPassword(password, admin.passwordHash);

		if (isValid) {
			console.log('\n✅ SUCCESS: Password is correct!');
		} else {
			console.log('\n❌ FAILED: Password does not match!');
		}
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await client.end();
	}
}

verifyAdminPassword();
