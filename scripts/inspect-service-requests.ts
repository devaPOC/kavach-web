
import { db, client } from '@/lib/database/connection';
import { serviceData } from '@/lib/database/schema/service-data';
import { sql } from 'drizzle-orm';

async function inspectServiceRequests() {
	console.log('Inspecting Service Requests in DB...');

	try {
		const results = await db.select({
			type: serviceData.serviceType,
			count: sql<number>`count(*)`
		})
			.from(serviceData)
			.groupBy(serviceData.serviceType);

		console.log('Service Request Counts by Type:');
		if (results.length === 0) {
			console.log('  (No service requests found)');
		}
		for (const r of results) {
			console.log(`  - ${r.type}: ${r.count}`);
		}

	} catch (error) {
		console.error('Error inspecting DB:', error);
	} finally {
		await client.end();
	}
}

inspectServiceRequests();
