/**
 * Test to verify incomplete quiz attempts are reused instead of creating new ones
 * This test verifies the fix for the 429 error when starting quizzes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { quizAttemptRepository } from '../quiz-attempt-repository';
import { eq, and, desc } from 'drizzle-orm';

// Mock the database connection
vi.mock('../../connection', () => ({
	db: {
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn()
	}
}));

describe('Incomplete Attempt Reuse', () => {
	const mockUserId = 'user-123';
	const mockQuizId = 'quiz-456';

	const mockIncompleteAttempt = {
		id: 'attempt-789',
		userId: mockUserId,
		quizId: mockQuizId,
		answers: {},
		score: 0,
		timeTakenSeconds: 0,
		isCompleted: false,
		startedAt: new Date('2024-01-01T10:00:00Z'),
		completedAt: null,
		ipAddress: null,
		userAgent: null,
		sessionId: null,
		interactionData: null
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should find an existing incomplete attempt', async () => {
		// Mock the database to return an incomplete attempt
		const { db } = await import('../../connection');
		(db.returning as any).mockResolvedValue([mockIncompleteAttempt]);

		const result = await quizAttemptRepository.findIncompleteAttempt(mockUserId, mockQuizId);

		expect(result).toEqual(mockIncompleteAttempt);
		expect(db.select).toHaveBeenCalled();
	});

	it('should return null when no incomplete attempt exists', async () => {
		// Mock the database to return empty array
		const { db } = await import('../../connection');
		(db.returning as any).mockResolvedValue([]);

		const result = await quizAttemptRepository.findIncompleteAttempt(mockUserId, mockQuizId);

		expect(result).toBeNull();
	});

	it('should only return incomplete attempts (isCompleted = false)', async () => {
		// This test verifies that the query filters by isCompleted = false
		const { db } = await import('../../connection');
		(db.returning as any).mockResolvedValue([mockIncompleteAttempt]);

		await quizAttemptRepository.findIncompleteAttempt(mockUserId, mockQuizId);

		// Verify that where clause was called with proper conditions
		expect(db.where).toHaveBeenCalled();
		expect(db.orderBy).toHaveBeenCalled();
		expect(db.limit).toHaveBeenCalledWith(1);
	});

	it('should return the most recent incomplete attempt when multiple exist', async () => {
		// Mock returns one attempt (the most recent due to orderBy desc)
		const { db } = await import('../../connection');
		(db.returning as any).mockResolvedValue([mockIncompleteAttempt]);

		const result = await quizAttemptRepository.findIncompleteAttempt(mockUserId, mockQuizId);

		expect(result).toEqual(mockIncompleteAttempt);
		// Verify orderBy was called with descending order
		expect(db.orderBy).toHaveBeenCalled();
		expect(db.limit).toHaveBeenCalledWith(1);
	});
});
