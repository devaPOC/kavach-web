/**
 * Utility to seed initial service types from dummyServices
 * Run this after migrations to populate the service_types table
 *
 * Usage: import { seedServiceTypes } from '@/lib/database/seed-service-types'
 *        await seedServiceTypes();
 */

import { db } from '@/lib/database';
import { serviceTypes } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { dummyServices } from '@/app/(frontend)/dashboard/data';

export async function seedServiceTypes(): Promise<void> {
	try {
		console.log('Starting service types seeding...');

		for (const service of dummyServices) {
			try {
				await db.insert(serviceTypes).values({
					name: service.service,
					category: service.category || 'general',
					description: Object.values(service.description || {}).join(' | '),
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				console.log(`✓ Seeded service type: ${service.service}`);
			} catch (error: any) {
				// Ignore duplicate key errors - service type already exists
				if (error.message?.includes('duplicate key')) {
					console.log(`⊘ Service type already exists: ${service.service}`);
				} else {
					console.error(`✗ Error seeding service type "${service.service}":`, error.message);
				}
			}
		}

		console.log('Service types seeding completed!');
	} catch (error) {
		console.error('Error during service types seeding:', error);
		throw error;
	}
}

/**
 * Checks if service types are already seeded
 * Returns the count of active service types in the database
 */
export async function getServiceTypeCount(): Promise<number> {
	try {
		const result = await db
			.select()
			.from(serviceTypes)
			.where(eq(serviceTypes.isActive, true));
		return result.length;
	} catch {
		return 0;
	}
}
