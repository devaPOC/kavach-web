/**
 * Marketplace Database Connection for Core App Admin
 *
 * This connection is used by admin APIs in the Core App to manage
 * the separate marketplace database.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Use a separate environment variable for marketplace DB
const connectionString = process.env.MARKETPLACE_DATABASE_URL;

let marketplaceDb: ReturnType<typeof drizzle> | null = null;
let marketplaceClient: postgres.Sql | null = null;

/**
 * Get the marketplace database connection (lazy initialization)
 */
export function getMarketplaceDb() {
	if (!connectionString) {
		throw new Error('MARKETPLACE_DATABASE_URL environment variable is required for admin marketplace APIs');
	}

	if (!marketplaceDb) {
		marketplaceClient = postgres(connectionString, {
			max: 1,
			idle_timeout: 20,
			connect_timeout: 30,
			ssl: connectionString.includes('neon.tech') ? 'require' : false,
			connection: {
				application_name: 'kavach-core-admin'
			},
		});

		marketplaceDb = drizzle(marketplaceClient);
	}

	return marketplaceDb;
}

/**
 * Close the marketplace database connection
 */
export async function closeMarketplaceDb(): Promise<void> {
	if (marketplaceClient) {
		await marketplaceClient.end();
		marketplaceClient = null;
		marketplaceDb = null;
	}
}
