import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizAttemptRepository } from '../quiz-attempt-repository';

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
  avg: vi.fn((field) => ({ field, type: 'avg' })),
  max: vi.fn((field) => ({ field, type: 'max' })),
  min: vi.fn((field) => ({ field, type: 'min' }))
}));

// Mock database connection
vi.mock('../connection', () => ({
  db: {}
}));

// Mock schema
vi.mock('../schema', () => ({
  quizAttempts: {
    id: 'quizAttempts.id',
    userId: 'quizAttempts.userId',
    quizId: 'quizAttempts.quizId',
    answers: 'quizAttempts.answers',
    score: 'quizAttempts.score',
    timeTakenSeconds: 'quizAttempts.timeTakenSeconds',
    isCompleted: 'quizAttempts.isCompleted',
    startedAt: 'quizAttempts.startedAt',
    completedAt: 'quizAttempts.completedAt'
  },
  quizzes: {
    id: 'quizzes.id',
    title: 'quizzes.title',
    language: 'quizzes.language',
    timeLimitMinutes: 'quizzes.timeLimitMinutes',
    maxAttempts: 'quizzes.maxAttempts'
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    firstName: 'users.firstName',
    lastName: 'users.lastName'
  }
}));

describe('QuizAttemptRepository', () => {
  let quizAttemptRepository: QuizAttemptRepository;
  let mockDb: any;

  const mockAttempt = {
    id: 'attempt-123',
    userId: 'user-456',
    quizId: 'quiz-123',
    answers: { 'question-1': ['A'] },
    score: 85,
    timeTakenSeconds: 900,
    isCompleted: true,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:15:00Z')
  };

  const mockAttemptWithDetails = {
    ...mockAttempt,
    quiz: {
      id: 'quiz-123',
      title: 'Test Quiz',
      language: 'en',
      timeLimitMinutes: 30,
      maxAttempts: 3
    },
    user: {
      id: 'user-456',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    }
  };

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    quizAttemptRepository = new QuizAttemptRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    const createData = {
      userId: 'user-456',
      quizId: 'quiz-123',
      answers: {},
      score: 0,
      timeTakenSeconds: 0,
      isCompleted: false
    };

    it('should create attempt successfully', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await quizAttemptRepository.create(createData);

      expect(result).toEqual(mockAttempt);
      expect(mockInsert.values).toHaveBeenCalledWith({
        ...createData,
        startedAt: expect.any(Date),
        completedAt: null
      });
    });

    it('should set completedAt when isCompleted is true', async () => {
      const completedCreateData = { ...createData, isCompleted: true };
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await quizAttemptRepository.create(completedCreateData);

      expect(mockInsert.values).toHaveBeenCalledWith({
        ...completedCreateData,
        startedAt: expect.any(Date),
        completedAt: expect.any(Date)
      });
    });

    it('should throw error when creation fails', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([])
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(quizAttemptRepository.create(createData))
        .rejects.toThrow('Failed to create quiz attempt');
    });
  });

  describe('findById', () => {
    it('should find attempt by ID successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.findById('attempt-123');

      expect(result).toEqual(mockAttempt);
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when attempt not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithDetails', () => {
    it('should find attempt with quiz and user details', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{
          attempt: mockAttempt,
          quiz: mockAttemptWithDetails.quiz,
          user: mockAttemptWithDetails.user
        }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.findByIdWithDetails('attempt-123');

      expect(result).toEqual(mockAttemptWithDetails);
      expect(mockSelect.leftJoin).toHaveBeenCalledTimes(2);
    });

    it('should return null when attempt not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.findByIdWithDetails('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find attempts with filters', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const filters = { userId: 'user-456', isCompleted: true };
      const result = await quizAttemptRepository.findMany(filters, 10, 0);

      expect(result).toEqual([mockAttempt]);
      expect(mockSelect.limit).toHaveBeenCalledWith(10);
      expect(mockSelect.offset).toHaveBeenCalledWith(0);
    });

    it('should find attempts without filters', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.findMany({}, 20, 0);

      expect(result).toEqual([mockAttempt]);
      expect(mockSelect.where).not.toHaveBeenCalled();
    });

    it('should apply date filters', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const filters = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31')
      };
      await quizAttemptRepository.findMany(filters, 10, 0);

      expect(mockSelect.where).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateData = {
      score: 90,
      isCompleted: true
    };

    it('should update attempt successfully', async () => {
      const updatedAttempt = { ...mockAttempt, ...updateData };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedAttempt])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await quizAttemptRepository.update('attempt-123', updateData);

      expect(result).toEqual(updatedAttempt);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        ...updateData,
        completedAt: expect.any(Date)
      });
    });

    it('should not set completedAt when isCompleted is false', async () => {
      const updateDataNotCompleted = { score: 50, isCompleted: false };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      await quizAttemptRepository.update('attempt-123', updateDataNotCompleted);

      expect(mockUpdate.set).toHaveBeenCalledWith({
        ...updateDataNotCompleted,
        completedAt: null
      });
    });

    it('should return null when attempt not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await quizAttemptRepository.update('nonexistent-id', updateData);

      expect(result).toBeNull();
    });
  });

  describe('submit', () => {
    it('should submit attempt successfully', async () => {
      const answers = { 'question-1': ['A'], 'question-2': ['B'] };
      const score = 85;
      const timeTaken = 900;

      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await quizAttemptRepository.submit('attempt-123', answers, score, timeTaken);

      expect(result).toEqual(mockAttempt);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        answers,
        score,
        timeTakenSeconds: timeTaken,
        isCompleted: true,
        completedAt: expect.any(Date)
      });
    });
  });

  describe('countUserAttempts', () => {
    it('should count user attempts for a quiz', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '3' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.countUserAttempts('user-456', 'quiz-123');

      expect(result).toBe(3);
    });

    it('should return 0 when no attempts found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '0' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.countUserAttempts('user-456', 'quiz-123');

      expect(result).toBe(0);
    });
  });

  describe('getUserBestScore', () => {
    it('should get user best score for a quiz', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ maxScore: 95 }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.getUserBestScore('user-456', 'quiz-123');

      expect(result).toBe(95);
    });

    it('should return 0 when no completed attempts found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ maxScore: null }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.getUserBestScore('user-456', 'quiz-123');

      expect(result).toBe(0);
    });
  });

  describe('getUserQuizProgress', () => {
    it('should get comprehensive user quiz progress', async () => {
      // Mock count attempts
      const mockSelectCount = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '3' }])
      };
      
      // Mock best score
      const mockSelectScore = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ maxScore: 85 }])
      };
      
      // Mock last attempt
      const mockSelectLast = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ startedAt: new Date() }])
      };
      
      // Mock completed attempts count
      const mockSelectCompleted = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '2' }])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectCount)
        .mockReturnValueOnce(mockSelectScore)
        .mockReturnValueOnce(mockSelectLast)
        .mockReturnValueOnce(mockSelectCompleted);

      const result = await quizAttemptRepository.getUserQuizProgress('user-456', 'quiz-123', 5);

      expect(result.userId).toBe('user-456');
      expect(result.quizId).toBe('quiz-123');
      expect(result.attemptCount).toBe(3);
      expect(result.bestScore).toBe(85);
      expect(result.hasCompletedAttempts).toBe(true);
      expect(result.canAttempt).toBe(true);
    });

    it('should indicate cannot attempt when limit reached', async () => {
      const mockSelectCount = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '5' }])
      };
      
      const mockSelectScore = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ maxScore: 85 }])
      };
      
      const mockSelectLast = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ startedAt: new Date() }])
      };
      
      const mockSelectCompleted = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '3' }])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectCount)
        .mockReturnValueOnce(mockSelectScore)
        .mockReturnValueOnce(mockSelectLast)
        .mockReturnValueOnce(mockSelectCompleted);

      const result = await quizAttemptRepository.getUserQuizProgress('user-456', 'quiz-123', 5);

      expect(result.canAttempt).toBe(false);
    });
  });

  describe('getQuizStatistics', () => {
    it('should calculate comprehensive quiz statistics', async () => {
      // Mock total attempts
      const mockSelectTotal = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '100' }])
      };
      
      // Mock completed attempts
      const mockSelectCompleted = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '85' }])
      };
      
      // Mock score statistics
      const mockSelectStats = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{
          avgScore: '78.5',
          maxScore: 100,
          minScore: 45,
          avgTime: '900'
        }])
      };
      
      // Mock unique users
      const mockSelectUsers = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '75' }])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectTotal)
        .mockReturnValueOnce(mockSelectCompleted)
        .mockReturnValueOnce(mockSelectStats)
        .mockReturnValueOnce(mockSelectUsers);

      const result = await quizAttemptRepository.getQuizStatistics('quiz-123');

      expect(result.quizId).toBe('quiz-123');
      expect(result.totalAttempts).toBe(100);
      expect(result.completedAttempts).toBe(85);
      expect(result.completionRate).toBe(85);
      expect(result.averageScore).toBe(78.5);
      expect(result.averageTimeSeconds).toBe(900);
      expect(result.highestScore).toBe(100);
      expect(result.lowestScore).toBe(45);
      expect(result.uniqueUsers).toBe(75);
    });

    it('should handle quiz with no attempts', async () => {
      const mockSelectZero = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '0' }])
      };
      
      const mockSelectNull = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{
          avgScore: null,
          maxScore: null,
          minScore: null,
          avgTime: null
        }])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectZero) // total attempts
        .mockReturnValueOnce(mockSelectZero) // completed attempts
        .mockReturnValueOnce(mockSelectNull) // score stats
        .mockReturnValueOnce(mockSelectZero); // unique users

      const result = await quizAttemptRepository.getQuizStatistics('quiz-123');

      expect(result.totalAttempts).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.uniqueUsers).toBe(0);
    });
  });

  describe('findManyWithDetails', () => {
    it('should find attempts with quiz and user details', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([{
          attempt: mockAttempt,
          quiz: mockAttemptWithDetails.quiz,
          user: mockAttemptWithDetails.user
        }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.findManyWithDetails({}, 10, 0);

      expect(result).toEqual([mockAttemptWithDetails]);
      expect(mockSelect.leftJoin).toHaveBeenCalledTimes(2);
    });
  });

  describe('count', () => {
    it('should count attempts with filters', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '25' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.count({ isCompleted: true });

      expect(result).toBe(25);
    });

    it('should count all attempts when no filters', async () => {
      const mockSelect = {
        from: vi.fn().mockResolvedValue([{ count: '100' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.count();

      expect(result).toBe(100);
    });
  });

  describe('exists', () => {
    it('should return true when attempt exists', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'attempt-123' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.exists('attempt-123');

      expect(result).toBe(true);
    });

    it('should return false when attempt does not exist', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.exists('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete attempt successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: 'attempt-123' }])
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await quizAttemptRepository.delete('attempt-123');

      expect(result).toBe(true);
    });

    it('should return false when attempt not found', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([])
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await quizAttemptRepository.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('findUserAttempts', () => {
    it('should find all attempts for a user and quiz', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockAttempt])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizAttemptRepository.findUserAttempts('user-456', 'quiz-123');

      expect(result).toEqual([mockAttempt]);
      expect(mockSelect.limit).toHaveBeenCalledWith(100);
      expect(mockSelect.offset).toHaveBeenCalledWith(0);
    });
  });
});