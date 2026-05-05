import { db } from '@/lib/database';
import { superAdmins } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

/**
 * Seed script to create the initial super admin
 * Run with: bun run src/lib/database/seed-super-admin.ts
 */
async function seedSuperAdmin() {
	const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'mstelidevara123@gmail.com';
	const SUPER_ADMIN_FIRST_NAME = process.env.SUPER_ADMIN_FIRST_NAME || 'Deva';
	const SUPER_ADMIN_LAST_NAME = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

	console.log('Checking for existing super admin...');

	// Check if super admin already exists
	const [existing] = await db
		.select()
		.from(superAdmins)
		.where(eq(superAdmins.email, SUPER_ADMIN_EMAIL.toLowerCase()))
		.limit(1);

	if (existing) {
		console.log(`Super admin already exists: ${existing.email}`);
		return;
	}

	// Create super admin
	const [superAdmin] = await db
		.insert(superAdmins)
		.values({
			email: SUPER_ADMIN_EMAIL.toLowerCase(),
			firstName: SUPER_ADMIN_FIRST_NAME,
			lastName: SUPER_ADMIN_LAST_NAME,
			isActive: true,
		})
		.returning();

	console.log('✅ Super admin created successfully!');
	console.log(`   Email: ${superAdmin.email}`);
	console.log(`   Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
	console.log('\n   You can now login at /super-admin/login using this email.');
}

seedSuperAdmin()
	.then(() => {
		console.log('\nSeed complete.');
		process.exit(0);
	})
	.catch((error) => {
		console.error('Seed failed:', error);
		process.exit(1);
	});
