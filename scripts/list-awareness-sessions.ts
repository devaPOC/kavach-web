#!/usr/bin/env bun

import { db } from '../src/lib/database/connection';
import { awarenessSessionRequests, awarenessSessionStatusHistory } from '../src/lib/database/schema';
import { desc } from 'drizzle-orm';

async function listAwarenessSessions() {
  try {
    console.log('Fetching all awareness session requests...\n');
    
    const allRequests = await db
      .select()
      .from(awarenessSessionRequests)
      .orderBy(desc(awarenessSessionRequests.createdAt));

    console.log(`Found ${allRequests.length} awareness session requests:\n`);
    
    if (allRequests.length === 0) {
      console.log('No awareness session requests found');
      return;
    }

    allRequests.forEach((request, index) => {
      console.log(`${index + 1}. ${request.organizationName}`);
      console.log(`   ID: ${request.id}`);
      console.log(`   Requester ID: ${request.requesterId}`);
      console.log(`   Subject: ${request.subject}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Session Date: ${request.sessionDate.toISOString()}`);
      console.log(`   Location: ${request.location}`);
      console.log(`   Audience Size: ${request.audienceSize}`);
      console.log(`   Created: ${request.createdAt.toISOString()}`);
      console.log(`   Updated: ${request.updatedAt.toISOString()}`);
      console.log('');
    });

    // Also check status history
    console.log('Fetching status history...\n');
    
    const allHistory = await db
      .select()
      .from(awarenessSessionStatusHistory)
      .orderBy(desc(awarenessSessionStatusHistory.createdAt));

    console.log(`Found ${allHistory.length} status history entries:\n`);
    
    allHistory.forEach((history, index) => {
      console.log(`${index + 1}. Session ${history.sessionRequestId}`);
      console.log(`   Previous Status: ${history.previousStatus || 'null'}`);
      console.log(`   New Status: ${history.newStatus}`);
      console.log(`   Changed By: ${history.changedBy}`);
      console.log(`   Notes: ${history.notes || 'none'}`);
      console.log(`   Created: ${history.createdAt.toISOString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error listing awareness sessions:', error);
    process.exit(1);
  }
}

listAwarenessSessions().then(() => {
  console.log('Done');
  process.exit(0);
});