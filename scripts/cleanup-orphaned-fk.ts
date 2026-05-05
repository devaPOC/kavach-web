import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!);

async function cleanup() {
	try {
		// Check what data exists
		console.log('Checking existing data...');

		// Find changedBy values in awareness_session_status_history that are not in admins
		const orphanedHistory = await sql`
      SELECT DISTINCT h.changed_by
      FROM awareness_session_status_history h
      WHERE h.changed_by IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = h.changed_by)
    `;
		console.log('Orphaned changed_by in awareness_session_status_history:', orphanedHistory.length);

		// Find adminId values in service_quotes that are not in admins
		const orphanedQuotes = await sql`
      SELECT DISTINCT q.admin_id
      FROM service_quotes q
      WHERE q.admin_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = q.admin_id)
    `;
		console.log('Orphaned admin_id in service_quotes:', orphanedQuotes.length);

		// Set orphaned references to NULL
		if (orphanedHistory.length > 0) {
			console.log('Setting orphaned changed_by to NULL...');
			await sql`
        UPDATE awareness_session_status_history
        SET changed_by = NULL
        WHERE changed_by IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = changed_by)
      `;
			console.log('✅ Fixed awareness_session_status_history');
		}

		if (orphanedQuotes.length > 0) {
			console.log('Setting orphaned admin_id to NULL...');
			await sql`
        UPDATE service_quotes
        SET admin_id = NULL
        WHERE admin_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = admin_id)
      `;
			console.log('✅ Fixed service_quotes');
		}

		await sql.end();
		console.log('Done!');
	} catch (e: any) {
		console.error('Error:', e.message);
		await sql.end();
		process.exit(1);
	}
}

cleanup();
