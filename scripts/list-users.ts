#!/usr/bin/env bun

import { db } from '../src/lib/database/connection';
import { users } from '../src/lib/database/schema';
import { desc } from 'drizzle-orm';

async function listUsers() {
  try {
    console.log('Fetching all users...\n');
    
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isApproved: users.isApproved,
        isEmailVerified: users.isEmailVerified,
        isBanned: users.isBanned,
        isPaused: users.isPaused,
        isLocked: users.isLocked,
        createdAt: users.createdAt,
        approvedAt: users.approvedAt
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    if (allUsers.length === 0) {
      console.log('No users found');
      return;
    }

    console.log(`Found ${allUsers.length} users:\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Email Verified: ${user.isEmailVerified ? '✅' : '❌'}`);
      console.log(`   Approved: ${user.isApproved ? '✅' : '❌'} ${user.approvedAt ? `(${user.approvedAt.toISOString()})` : ''}`);
      console.log(`   Banned: ${user.isBanned ? '🚫' : '✅'}`);
      console.log(`   Paused: ${user.isPaused ? '⏸️' : '✅'}`);
      console.log(`   Locked: ${user.isLocked ? '🔒' : '✅'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log('');
    });

    // Summary
    const summary = {
      total: allUsers.length,
      customers: allUsers.filter(u => u.role === 'customer').length,
      experts: allUsers.filter(u => u.role === 'expert').length,
      admins: allUsers.filter(u => u.role === 'admin').length,
      approved: allUsers.filter(u => u.isApproved).length,
      emailVerified: allUsers.filter(u => u.isEmailVerified).length,
      banned: allUsers.filter(u => u.isBanned).length,
      paused: allUsers.filter(u => u.isPaused).length,
      locked: allUsers.filter(u => u.isLocked).length
    };

    console.log('📊 Summary:');
    console.log(`   Total Users: ${summary.total}`);
    console.log(`   Customers: ${summary.customers}`);
    console.log(`   Experts: ${summary.experts}`);
    console.log(`   Admins: ${summary.admins}`);
    console.log(`   Approved: ${summary.approved}/${summary.total}`);
    console.log(`   Email Verified: ${summary.emailVerified}/${summary.total}`);
    console.log(`   Banned: ${summary.banned}`);
    console.log(`   Paused: ${summary.paused}`);
    console.log(`   Locked: ${summary.locked}`);

  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers().then(() => {
  console.log('\nDone');
  process.exit(0);
});