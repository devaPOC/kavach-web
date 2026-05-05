#!/usr/bin/env bun

import { userRepository } from '../src/lib/database/repositories/user-repository';
import { hashPassword } from '../src/lib/auth/password-utils';
import { client } from '../src/lib/database/connection';

async function testUpdate() {
	try {
		const adminId = '60d98206-9ddb-4589-b6c3-476fb85b094a';
		const newPassword = 'Admin@456';

		console.log('🔧 Testing userRepository.update()...');
		const hash = await hashPassword(newPassword);
		console.log('Hash created:', hash.substring(0, 30) + '...');

		const updated = await userRepository.update(adminId, { passwordHash: hash });
		console.log('Updated user:', updated ? 'SUCCESS' : 'FAILED');
		if (updated) {
			console.log('Email:', updated.email);
			console.log('Hash (first 30):', updated.passwordHash.substring(0, 30) + '...');
		}
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await client.end();
	}
}

testUpdate();
