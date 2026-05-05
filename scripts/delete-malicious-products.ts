/**
 * Delete Malicious Product Script
 *
 * This script deletes products containing HTML/script tags (XSS attempts)
 * from the marketplace database.
 *
 * Usage:
 *   npx tsx scripts/delete-malicious-products.ts
 *
 * Environment:
 *   - MARKETPLACE_DATABASE_URL: PostgreSQL connection string for marketplace
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const connectionString = process.env.MARKETPLACE_DATABASE_URL;

if (!connectionString) {
	console.error('🚨 ERROR: MARKETPLACE_DATABASE_URL environment variable is required!');
	console.error('Please set it in your .env file or environment.');
	process.exit(1);
}

async function deleteMaliciousProducts() {
	console.log('🔍 Connecting to marketplace database...');

	const client = postgres(connectionString!, {
		max: 1,
		ssl: connectionString!.includes('neon.tech') ? 'require' : false,
	});

	const db = drizzle(client);

	try {
		// Find products with HTML/script tags in name
		console.log('\n🔍 Searching for products with HTML/script tags...');

		const maliciousProducts = await db.execute(sql`
			SELECT id, name, slug, created_at
			FROM products
			WHERE name ~ '<[^>]*>'
			   OR description ~ '<[^>]*>'
			   OR short_description ~ '<[^>]*>'
		`);

		if (maliciousProducts.length === 0) {
			console.log('✅ No malicious products found!');
			return;
		}

		console.log(`\n⚠️  Found ${maliciousProducts.length} potentially malicious product(s):`);

		for (const product of maliciousProducts) {
			const p = product as { id: string; name: string; slug: string; created_at: Date };
			console.log(`  - ID: ${p.id}`);
			console.log(`    Name: ${p.name.substring(0, 100)}${p.name.length > 100 ? '...' : ''}`);
			console.log(`    Slug: ${p.slug}`);
			console.log(`    Created: ${p.created_at}`);
			console.log('');
		}

		// Delete the malicious products
		console.log('🗑️  Deleting malicious products...');

		// First delete order items referencing these products
		console.log('  Deleting related order items...');
		await db.execute(sql`
			DELETE FROM order_items
			WHERE product_id IN (
				SELECT id FROM products
				WHERE name ~ '<[^>]*>'
				   OR description ~ '<[^>]*>'
				   OR short_description ~ '<[^>]*>'
			)
		`);

		// Then delete associated images
		console.log('  Deleting product images...');
		await db.execute(sql`
			DELETE FROM product_images
			WHERE product_id IN (
				SELECT id FROM products
				WHERE name ~ '<[^>]*>'
				   OR description ~ '<[^>]*>'
				   OR short_description ~ '<[^>]*>'
			)
		`);

		// Finally delete the products
		console.log('  Deleting products...');
		const result = await db.execute(sql`
			DELETE FROM products
			WHERE name ~ '<[^>]*>'
			   OR description ~ '<[^>]*>'
			   OR short_description ~ '<[^>]*>'
			RETURNING id, name
		`);

		console.log(`\n✅ Successfully deleted ${result.length} malicious product(s)!`);

	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	} finally {
		await client.end();
		console.log('\n🔒 Database connection closed.');
	}
}

deleteMaliciousProducts();
