#!/usr/bin/env bun

import { db } from '../src/lib/database/connection';
import { users } from '../src/lib/database/schema';
import { eq } from 'drizzle-orm';

async function approveUser(email: string) {
  try {
    console.log(`Looking for user with email: ${email}`);
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Current status: approved=${user.isApproved}, role=${user.role}`);

    if (user.isApproved) {
      console.log('User is already approved');
      return;
    }

    // Approve the user
    const [updatedUser] = await db
      .update(users)
      .set({
        isApproved: true,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log(`✅ User ${updatedUser.email} has been approved successfully`);
    console.log(`Approved at: ${updatedUser.approvedAt}`);

  } catch (error) {
    console.error('Error approving user:', error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: bun run scripts/approve-user.ts <email>');
  console.error('Example: bun run scripts/approve-user.ts user@example.com');
  process.exit(1);
}

approveUser(email).then(() => {
  console.log('Done');
  process.exit(0);
});