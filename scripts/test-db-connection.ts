import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!);

async function test() {
	try {
		const adminUserId = '072abd18-d440-4f8c-9a5f-498e1f270b4d';

		// Check if the admin exists in the admins table
		console.log(`Checking if admin ${adminUserId} exists in admins table...`);
		const admin = await sql`
      SELECT id, email, role, created_at
      FROM admins
      WHERE id = ${adminUserId}::uuid
    `;

		if (admin.length === 0) {
			console.log(`\n❌ Admin ${adminUserId} NOT FOUND in the admins table!`);

			// List existing admins
			console.log('\n--- Existing admins ---');
			const admins = await sql`
        SELECT id, email, role, created_at
        FROM admins
        WHERE deleted_at IS NULL
      `;
			if (admins.length > 0) {
				admins.forEach((a: any) => {
					console.log(`  - ${a.email} (${a.id})`);
				});
			} else {
				console.log('  No admins found in the database!');
			}
		} else {
			console.log('\n✅ Admin found:', admin[0]);

			// Try a test insert now
			console.log('\nTesting learning module creation...');
			const testResult = await sql`
        INSERT INTO learning_modules (created_by, title, description, category, order_index, is_published, created_at, updated_at)
        VALUES (
          ${adminUserId}::uuid,
          'test-module',
          'test description',
          'test-category',
          999,
          false,
          NOW(),
          NOW()
        )
        RETURNING *
      `;
			console.log('✅ Insert successful:', testResult[0].id);

			// Clean up
			await sql`DELETE FROM learning_modules WHERE id = ${testResult[0].id}`;
			console.log('✅ Test module cleaned up');
		}

		await sql.end();
	} catch (e: any) {
		console.error('Error:', e.message);
		await sql.end();
		process.exit(1);
	}
}

test();
