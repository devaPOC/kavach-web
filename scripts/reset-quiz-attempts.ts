#!/usr/bin/env bun

/**
 * Development script to reset quiz attempts for testing purposes
 * Usage: bun run scripts/reset-quiz-attempts.ts [userId] [quizId]
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import postgres from 'postgres';
import { quizAttempts } from '../src/lib/database/schema/quizzes';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/kavach_dev';
const client = postgres(connectionString);
const db = drizzle(client);

async function resetQuizAttempts(userId?: string, quizId?: string) {
  try {
    console.log('🔄 Resetting quiz attempts...');

    if (userId && quizId) {
      // Reset attempts for specific user and quiz
      const result = await db
        .delete(quizAttempts)
        .where(and(
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.quizId, quizId)
        ));

      console.log(`✅ Reset attempts for user ${userId} and quiz ${quizId}`);
    } else if (userId) {
      // Reset all attempts for user
      const result = await db
        .delete(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      console.log(`✅ Reset all attempts for user ${userId}`);
    } else if (quizId) {
      // Reset all attempts for quiz
      const result = await db
        .delete(quizAttempts)
        .where(eq(quizAttempts.quizId, quizId));

      console.log(`✅ Reset all attempts for quiz ${quizId}`);
    } else {
      console.log('❌ Please provide userId and/or quizId');
      console.log('Usage: bun run scripts/reset-quiz-attempts.ts [userId] [quizId]');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error resetting quiz attempts:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get command line arguments
const userId = process.argv[2];
const quizId = process.argv[3];

resetQuizAttempts(userId, quizId);
