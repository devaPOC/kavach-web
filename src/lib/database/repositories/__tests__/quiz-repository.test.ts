import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizRepository } from '../quiz-repository';

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  desc: vi.fn((field) => ({ field, type: 'desc' })),
  asc: vi.fn((field) => ({ field, type: 'asc' })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: 'sql' })),
  inArray: vi.fn((field, values) => ({ field, values, type: 'inArray' }))
}));

// Mock database connection
vi.mock('../connection', () => ({
  db: {}
}));

// Mock schema
vi.mock('../schema', () => ({
  quizzes: {
    id: 'quizzes.id',
    createdBy: 'quizzes.createdBy',
    templateId: 'quizzes.templateId',
    title: 'quizzes.title',
    description: 'quizzes.description',
    language: 'quizzes.language',
    timeLimitMinutes: 'quizzes.timeLimitMinutes',
    maxAttempts: 'quizzes.maxAttempts',
    isPublished: 'quizzes.isPublished',
    createdAt: 'quizzes.createdAt',
    updatedAt: 'quizzes.updatedAt'
  },
  quizQuestions: {
    id: 'quizQuestions.id',
    quizId: 'quizQuestions.quizId',
    questionType: 'quizQuestions.questionType',
    questionData: 'quizQuestions.questionData',
    correctAnswers: 'quizQuestions.correctAnswers',
    orderIndex: 'quizQuestions.orderIndex',
    createdAt: 'quizQuestions.createdAt'
  },
  quizTemplates: {
    id: 'quizTemplates.id',
    usageCount: 'quizTemplates.usageCount',
    updatedAt: 'quizTemplates.updatedAt'
  }
}));

describe('QuizRepository', () => {
  let quizRepository: QuizRepository;
  let mockDb: any;

  const mockQuiz = {
    id: 'quiz-123',
    createdBy: 'user-123',
    templateId: null,
    title: 'Test Quiz',
    description: 'A test quiz',
    language: 'en',
    timeLimitMinutes: 30,
    maxAttempts: 3,
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockQuestion = {
    id: 'question-123',
    quizId: 'quiz-123',
    questionType: 'mcq',
    questionData: {
      question: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      explanation: 'Basic math'
    },
    correctAnswers: ['4'],
    orderIndex: 1,
    createdAt: new Date()
  };

  beforeEach(() => {
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    quizRepository = new QuizRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    const createData = {
      title: 'Test Quiz',
      description: 'A test quiz',
      language: 'en' as const,
      timeLimitMinutes: 30,
      maxAttempts: 3
    };

    it('should create quiz successfully', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockQuiz])
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await quizRepository.create('user-123', createData);

      expect(result).toEqual(mockQuiz);
      expect(mockInsert.values).toHaveBeenCalledWith({
        createdBy: 'user-123',
        ...createData,
        isPublished: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should increment template usage when templateId provided', async () => {
      const createDataWithTemplate = { ...createData, templateId: 'template-123' };
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockQuiz])
      };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      };
      mockDb.insert.mockReturnValue(mockInsert);
      mockDb.update.mockReturnValue(mockUpdate);

      const mockTx = { insert: mockDb.insert, update: mockDb.update };
      await quizRepository.create('user-123', createDataWithTemplate, mockTx);

      expect(mockUpdate.set).toHaveBeenCalled();
      expect(mockUpdate.where).toHaveBeenCalled();
    });

    it('should throw error when creation fails', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([])
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(quizRepository.create('user-123', createData))
        .rejects.toThrow('Failed to create quiz');
    });

    it('should handle database errors', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('Database error'))
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(quizRepository.create('user-123', createData))
        .rejects.toThrow('Failed to create quiz: Database error');
    });
  });

  describe('findById', () => {
    it('should find quiz by ID successfully', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockQuiz])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.findById('quiz-123');

      expect(result).toEqual(mockQuiz);
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when quiz not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('Database error'))
      };
      mockDb.select.mockReturnValue(mockSelect);

      await expect(quizRepository.findById('quiz-123'))
        .rejects.toThrow('Failed to find quiz by ID: Database error');
    });
  });

  describe('findByIdWithQuestions', () => {
    it('should find quiz with questions successfully', async () => {
      const mockSelectQuiz = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockQuiz])
      };
      const mockSelectQuestions = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockQuestion])
      };
      mockDb.select
        .mockReturnValueOnce(mockSelectQuiz)
        .mockReturnValueOnce(mockSelectQuestions);

      const result = await quizRepository.findByIdWithQuestions('quiz-123');

      expect(result).toEqual({
        ...mockQuiz,
        questions: [mockQuestion]
      });
    });

    it('should return null when quiz not found', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.findByIdWithQuestions('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should find quizzes with filters', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockQuiz])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const filters = { language: 'en' as const, isPublished: true };
      const result = await quizRepository.findMany(filters, 10, 0);

      expect(result).toEqual([mockQuiz]);
      expect(mockSelect.limit).toHaveBeenCalledWith(10);
      expect(mockSelect.offset).toHaveBeenCalledWith(0);
    });

    it('should find quizzes without filters', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockQuiz])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.findMany({}, 20, 0);

      expect(result).toEqual([mockQuiz]);
      expect(mockSelect.where).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateData = {
      title: 'Updated Quiz',
      isPublished: true
    };

    it('should update quiz successfully', async () => {
      const updatedQuiz = { ...mockQuiz, ...updateData };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedQuiz])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await quizRepository.update('quiz-123', updateData);

      expect(result).toEqual(updatedQuiz);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        ...updateData,
        updatedAt: expect.any(Date)
      });
    });

    it('should return null when quiz not found', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await quizRepository.update('nonexistent-id', updateData);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete quiz successfully', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([{ id: 'quiz-123' }])
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await quizRepository.delete('quiz-123');

      expect(result).toBe(true);
    });

    it('should return false when quiz not found', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([])
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await quizRepository.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('addQuestion', () => {
    const questionData = {
      questionType: 'mcq' as const,
      questionData: {
        question: 'What is 2+2?',
        options: ['3', '4', '5', '6']
      },
      correctAnswers: ['4'],
      orderIndex: 1
    };

    it('should add question successfully', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockQuestion])
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await quizRepository.addQuestion('quiz-123', questionData);

      expect(result).toEqual(mockQuestion);
      expect(mockInsert.values).toHaveBeenCalledWith({
        quizId: 'quiz-123',
        ...questionData,
        createdAt: expect.any(Date)
      });
    });

    it('should throw error when question creation fails', async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([])
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(quizRepository.addQuestion('quiz-123', questionData))
        .rejects.toThrow('Failed to add question');
    });
  });

  describe('deleteAllQuestions', () => {
    it('should delete all questions for a quiz', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([
          { id: 'question-1' },
          { id: 'question-2' }
        ])
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await quizRepository.deleteAllQuestions('quiz-123');

      expect(result).toBe(2);
    });

    it('should return 0 when no questions found', async () => {
      const mockDelete = {
        where: vi.fn().mockResolvedValue([])
      };
      mockDb.delete.mockReturnValue(mockDelete);

      const result = await quizRepository.deleteAllQuestions('quiz-123');

      expect(result).toBe(0);
    });
  });

  describe('getQuestions', () => {
    it('should get questions for a quiz', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockQuestion])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.getQuestions('quiz-123');

      expect(result).toEqual([mockQuestion]);
    });
  });

  describe('reorderQuestions', () => {
    it('should reorder questions successfully', async () => {
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const questionIds = ['question-1', 'question-2', 'question-3'];
      await quizRepository.reorderQuestions(questionIds);

      expect(mockUpdate.set).toHaveBeenCalledTimes(3);
      expect(mockUpdate.where).toHaveBeenCalledTimes(3);
    });
  });

  describe('count', () => {
    it('should count quizzes with filters', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: '5' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.count({ isPublished: true });

      expect(result).toBe(5);
    });

    it('should count all quizzes when no filters', async () => {
      const mockSelect = {
        from: vi.fn().mockResolvedValue([{ count: '10' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.count();

      expect(result).toBe(10);
    });
  });

  describe('exists', () => {
    it('should return true when quiz exists', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'quiz-123' }])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.exists('quiz-123');

      expect(result).toBe(true);
    });

    it('should return false when quiz does not exist', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.exists('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('findPublished', () => {
    it('should find published quizzes', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockQuiz])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.findPublished('en', 10, 0, 'customer');

      expect(result).toEqual([mockQuiz]);
    });

    it('should find published quizzes without language filter', async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockQuiz])
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await quizRepository.findPublished(undefined, 10, 0, 'customer');

      expect(result).toEqual([mockQuiz]);
    });
  });

  describe('setPublished', () => {
    it('should set quiz published status', async () => {
      const publishedQuiz = { ...mockQuiz, isPublished: true };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([publishedQuiz])
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await quizRepository.setPublished('quiz-123', true);

      expect(result).toEqual(publishedQuiz);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        isPublished: true,
        updatedAt: expect.any(Date)
      });
    });
  });
});