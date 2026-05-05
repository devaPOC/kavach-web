
import { db, client } from '@/lib/database/connection';
import { serviceData } from '@/lib/database/schema/service-data';
import { awarenessSessionRequests } from '@/lib/database/schema/awareness-sessions';
import { eq, and } from 'drizzle-orm';
import { CreateAwarenessSessionData } from '@/types/awareness-session';

async function migrateAwarenessSessions() {
	console.log('Starting migration of Awareness Session requests...');

	try {
		// 1. Fetch all 'Cybersecurity Awareness Training' requests from service_data
		// Note: serviceType is kebab-case in DB based on inspection
		const legacyRequests = await db.select()
			.from(serviceData)
			.where(
				and(
					eq(serviceData.serviceType, 'cybersecurity-awareness-training'),
				)
			);

		console.log(`Found ${legacyRequests.length} legacy requests to migrate.`);

		if (legacyRequests.length === 0) {
			console.log('No requests to migrate. Exiting.');
			await client.end();
			return;
		}

		let successCount = 0;
		let errorCount = 0;

		for (const req of legacyRequests) {
			try {
				const data = req.data as any; // The JSON blob
				console.log(`Migrating request ID: ${req.id}`);

				// 2. Map data to new schema
				// Extract fields from the JSON data blob

				// Date & Time
				const sessionDateStr = data.preferredDate;
				const sessionTimeStr = data.preferredTime;
				let sessionDate: Date;

				if (sessionDateStr && sessionTimeStr) {
					sessionDate = new Date(`${sessionDateStr}T${sessionTimeStr}`);
				} else if (sessionDateStr) {
					sessionDate = new Date(sessionDateStr);
				} else {
					// Fallback if missing
					sessionDate = new Date();
					console.warn(`  - Missing date/time for request ${req.id}, using current date.`);
				}

				// Audience Size
				const audienceNumberRaw = data.audienceNumber;
				let audienceSize = 10; // Default
				if (audienceNumberRaw) {
					if (typeof audienceNumberRaw === 'number') {
						audienceSize = audienceNumberRaw;
					} else if (typeof audienceNumberRaw === 'string') {
						if (audienceNumberRaw.includes('-')) {
							const parts = audienceNumberRaw.split('-');
							audienceSize = parseInt(parts[1], 10);
						} else if (audienceNumberRaw.includes('+')) {
							audienceSize = parseInt(audienceNumberRaw.replace('+', ''), 10);
						} else {
							audienceSize = parseInt(audienceNumberRaw, 10) || 10;
						}
					}
				}

				// Duration Mapping
				let duration = data.trainingDuration || '1_hour';
				const durationMap: Record<string, string> = {
					'30-minutes': '1_hour',
					'1-hour': '1_hour',
					'2-hours': '2_hours',
					'half-day': 'half_day',
					'full-day': 'full_day',
					'multi-day': 'full_day',
					'ongoing': 'full_day'
				};
				if (durationMap[duration]) {
					duration = durationMap[duration];
				}

				// Location & Session Mode
				const location = data.awarenessPlace || 'Unknown Location';
				const locationType = data.awarenessPlace;
				const sessionMode = (locationType === 'online-virtual' || locationType === 'hybrid') ? 'online' : 'on_site';

				// Audience Types
				const audienceTypeRaw = data.audienceType;
				const audienceTypeMap: Record<string, string> = {
					'non-technical': 'corporate_staff',
					'technical': 'corporate_staff',
					'executive': 'corporate_staff',
					'board': 'corporate_staff',
					'mixed': 'mixed',
					'students': 'students',
					'healthcare': 'corporate_staff',
					'finance': 'corporate_staff',
					'government': 'corporate_staff',
					'retail': 'corporate_staff'
				};
				const audienceType = audienceTypeMap[audienceTypeRaw] || 'mixed';

				const subject = data.awarenessSubject || data.title || 'General Awareness';

				const specialRequirements = [data.trainingObjectives, data.additionalRequirements, data.description]
					.filter(Boolean)
					.join('\n\n');

				const organizationName = data.organizationName || 'Unknown Organization';
				const contactEmail = data.contactEmail || 'unknown@example.com';
				const contactPhone = data.contactPhone || '00000000';

				// 3. Insert into awareness_session_requests
				await db.insert(awarenessSessionRequests).values({
					requesterId: req.userId,
					sessionDate: sessionDate,
					location: location,
					duration: duration,
					subject: subject,
					audienceSize: audienceSize,
					audienceTypes: [audienceType],
					sessionMode: sessionMode,
					specialRequirements: specialRequirements,
					organizationName: organizationName,
					contactEmail: contactEmail,
					contactPhone: contactPhone,
					// Map status as best as possible. ServiceRequest status 'pending' -> 'pending_admin_review'
					status: 'pending_admin_review',
					createdAt: req.createdAt,
					updatedAt: req.updatedAt
				});

				// 4. Delete from service_data
				await db.delete(serviceData).where(eq(serviceData.id, req.id));

				console.log(`  - Successfully migrated request ${req.id}`);
				successCount++;

			} catch (err) {
				console.error(`  - Failed to migrate request ${req.id}:`, err);
				errorCount++;
			}
		}

		console.log('------------------------------------------------');
		console.log(`Migration Complete.`);
		console.log(`Success: ${successCount}`);
		console.log(`Errors:  ${errorCount}`);

	} catch (error) {
		console.error('Fatal error during migration:', error);
	} finally {
		await client.end();
	}
}

migrateAwarenessSessions();
