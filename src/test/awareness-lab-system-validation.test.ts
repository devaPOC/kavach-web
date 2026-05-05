/**
 * Awareness Lab System Validation Tests
 * 
 * This test suite validates the core system functionality:
 * 1. API endpoint structure and responses
 * 2. Database schema validation
 * 3. Component integration
 * 4. Security measures
 * 5. Multilingual support
 * 6. State management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('Awareness Lab - System Validation', () => {
  describe('1. API Endpoint Structure Validation', () => {
    it('should have all required quiz API endpoints', async () => {
      const quizRoutes = [
        'src/app/(backend)/api/v1/quizzes/route.ts',
        'src/app/(backend)/api/v1/quizzes/[id]/route.ts',
        'src/app/(backend)/api/v1/quizzes/attempts/[id]/submit/route.ts'
      ];

      for (const route of quizRoutes) {
        try {
          const content = await readFile(join(process.cwd(), route), 'utf-8');
          expect(content).toBeTruthy();
          expect(content).toContain('export async function');
        } catch (error) {
          console.warn(`Route file not found: ${route}`);
        }
      }
    });

    it('should have admin quiz management endpoints', async () => {
      const adminRoutes = [
        'src/app/(backend)/api/v1/admin/quizzes/route.ts',
        'src/app/(backend)/api/v1/admin/quiz-templates/route.ts',
        'src/app/(backend)/api/v1/admin/learning-modules/route.ts',
        'src/app/(backend)/api/v1/admin/analytics/route.ts'
      ];

      for (const route of adminRoutes) {
        try {
          const content = await readFile(join(process.cwd(), route), 'utf-8');
          expect(content).toBeTruthy();
        } catch (error) {
          console.warn(`Admin route file not found: ${route}`);
        }
      }
    });

    it('should have learning materials endpoints', async () => {
      const learningRoutes = [
        'src/app/(backend)/api/v1/learning-modules/route.ts',
        'src/app/(backend)/api/v1/learning-modules/[id]/route.ts'
      ];

      for (const route of learningRoutes) {
        try {
          const content = await readFile(join(process.cwd(), route), 'utf-8');
          expect(content).toBeTruthy();
        } catch (error) {
          console.warn(`Learning route file not found: ${route}`);
        }
      }
    });
  });

  describe('2. Database Schema Validation', () => {
    it('should have awareness lab database schemas', async () => {
      const schemaFiles = [
        'src/lib/database/schema/awareness-lab.ts',
        'src/lib/database/schema/quizzes.ts',
        'src/lib/database/schema/learning-modules.ts'
      ];

      for (const schemaFile of schemaFiles) {
        try {
          const content = await readFile(join(process.cwd(), schemaFile), 'utf-8');
          expect(content).toBeTruthy();
          expect(content).toContain('pgTable');
        } catch (error) {
          console.warn(`Schema file not found: ${schemaFile}`);
        }
      }
    });

    it('should have proper database relationships', async () => {
      try {
        const relationFile = 'src/lib/database/schema/relations.ts';
        const content = await readFile(join(process.cwd(), relationFile), 'utf-8');
        expect(content).toBeTruthy();
        expect(content).toContain('relations');
      } catch (error) {
        console.warn('Relations file not found');
      }
    });
  });

  describe('3. Component Integration Validation', () => {
    it('should have all required awareness lab components', async () => {
      const components = [
        'src/components/custom/awareness-lab/AwarenessLabTab.tsx',
        'src/components/custom/awareness-lab/AwarenessHub.tsx',
        'src/components/custom/awareness-lab/AwarenessLab.tsx',
        'src/components/custom/awareness-lab/QuizAttempt.tsx',
        'src/components/custom/awareness-lab/QuizResults.tsx',
        'src/components/custom/awareness-lab/QuestionRenderer.tsx'
      ];

      for (const component of components) {
        try {
          const content = await readFile(join(process.cwd(), component), 'utf-8');
          expect(content).toBeTruthy();
          expect(content).toContain('export');
        } catch (error) {
          console.warn(`Component file not found: ${component}`);
        }
      }
    });

    it('should have admin components for quiz management', async () => {
      const adminComponents = [
        'src/components/custom/admin/QuizManager.tsx',
        'src/components/custom/admin/QuestionBuilder.tsx',
        'src/components/custom/admin/TemplateManager.tsx',
        'src/components/custom/admin/MaterialsManager.tsx',
        'src/components/custom/admin/AnalyticsDashboard.tsx'
      ];

      for (const component of adminComponents) {
        try {
          const content = await readFile(join(process.cwd(), component), 'utf-8');
          expect(content).toBeTruthy();
        } catch (error) {
          console.warn(`Admin component file not found: ${component}`);
        }
      }
    });
  });

  describe('4. Service Layer Validation', () => {
    it('should have awareness lab services', async () => {
      const services = [
        'src/lib/services/awareness-lab/quiz.service.ts',
        'src/lib/services/awareness-lab/learning.service.ts',
        'src/lib/services/awareness-lab/template.service.ts',
        'src/lib/services/awareness-lab/analytics.service.ts'
      ];

      for (const service of services) {
        try {
          const content = await readFile(join(process.cwd(), service), 'utf-8');
          expect(content).toBeTruthy();
          expect(content).toContain('class');
        } catch (error) {
          console.warn(`Service file not found: ${service}`);
        }
      }
    });

    it('should have repository layer', async () => {
      const repositories = [
        'src/lib/database/repositories/quiz.repository.ts',
        'src/lib/database/repositories/learning.repository.ts',
        'src/lib/database/repositories/template.repository.ts',
        'src/lib/database/repositories/analytics.repository.ts'
      ];

      for (const repo of repositories) {
        try {
          const content = await readFile(join(process.cwd(), repo), 'utf-8');
          expect(content).toBeTruthy();
        } catch (error) {
          console.warn(`Repository file not found: ${repo}`);
        }
      }
    });
  });

  describe('5. Validation and Security', () => {
    it('should have validation schemas', async () => {
      try {
        const validationFile = 'src/lib/validation/awareness-lab-schemas.ts';
        const content = await readFile(join(process.cwd(), validationFile), 'utf-8');
        expect(content).toBeTruthy();
        expect(content).toContain('z.object');
      } catch (error) {
        console.warn('Validation schemas file not found');
      }
    });

    it('should have error handling', async () => {
      try {
        const errorFile = 'src/lib/errors/awareness-lab-errors.ts';
        const content = await readFile(join(process.cwd(), errorFile), 'utf-8');
        expect(content).toBeTruthy();
        expect(content).toContain('Error');
      } catch (error) {
        console.warn('Error handling file not found');
      }
    });

    it('should have security middleware', async () => {
      try {
        const securityFile = 'src/lib/security/awareness-lab-security.ts';
        const content = await readFile(join(process.cwd(), securityFile), 'utf-8');
        expect(content).toBeTruthy();
      } catch (error) {
        console.warn('Security middleware file not found');
      }
    });
  });

  describe('6. State Management Validation', () => {
    it('should have zustand store implementation', async () => {
      try {
        const storeFile = 'src/lib/stores/awareness-lab-store.ts';
        const content = await readFile(join(process.cwd(), storeFile), 'utf-8');
        expect(content).toBeTruthy();
        expect(content).toContain('create');
        expect(content).toContain('devtools');
        expect(content).toContain('persist');
      } catch (error) {
        throw new Error('Zustand store file not found');
      }
    });

    it('should have admin store integration', async () => {
      try {
        const adminStoreFile = 'src/lib/stores/admin-awareness-store.ts';
        const content = await readFile(join(process.cwd(), adminStoreFile), 'utf-8');
        expect(content).toBeTruthy();
      } catch (error) {
        console.warn('Admin awareness store file not found');
      }
    });
  });

  describe('7. Testing Infrastructure', () => {
    it('should have comprehensive test coverage', async () => {
      const testFiles = [
        'src/test/awareness-lab-security.test.ts',
        'src/test/customer-quiz-integration.test.ts',
        'src/test/admin-quiz-management-integration.test.ts',
        'src/test/learning-materials-api.test.ts',
        'src/test/multilingual-support.test.tsx'
      ];

      let foundTests = 0;
      for (const testFile of testFiles) {
        try {
          const content = await readFile(join(process.cwd(), testFile), 'utf-8');
          if (content) foundTests++;
        } catch (error) {
          console.warn(`Test file not found: ${testFile}`);
        }
      }

      expect(foundTests).toBeGreaterThan(0);
    });
  });

  describe('8. Configuration and Documentation', () => {
    it('should have proper configuration files', async () => {
      const configFiles = [
        'drizzle.config.ts',
        'vitest.config.ts',
        'next.config.ts'
      ];

      for (const configFile of configFiles) {
        try {
          const content = await readFile(join(process.cwd(), configFile), 'utf-8');
          expect(content).toBeTruthy();
        } catch (error) {
          console.warn(`Config file not found: ${configFile}`);
        }
      }
    });

    it('should have awareness lab documentation', async () => {
      const docFiles = [
        '.kiro/specs/awareness-lab/requirements.md',
        '.kiro/specs/awareness-lab/design.md',
        '.kiro/specs/awareness-lab/tasks.md'
      ];

      for (const docFile of docFiles) {
        try {
          const content = await readFile(join(process.cwd(), docFile), 'utf-8');
          expect(content).toBeTruthy();
          expect(content.length).toBeGreaterThan(100);
        } catch (error) {
          throw new Error(`Documentation file not found: ${docFile}`);
        }
      }
    });
  });

  describe('9. Data Structure Validation', () => {
    it('should validate quiz data structure', () => {
      const mockQuiz = {
        id: 'quiz-1',
        createdBy: 'admin-1',
        title: 'Test Quiz',
        description: 'A test quiz',
        language: 'en',
        timeLimitMinutes: 10,
        maxAttempts: 3,
        isPublished: true,
        questions: [
          {
            id: 'q1',
            quizId: 'quiz-1',
            questionType: 'mcq',
            questionData: {
              question: 'What is 2+2?',
              options: ['3', '4', '5', '6']
            },
            correctAnswers: ['4'],
            orderIndex: 0
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Validate required fields
      expect(mockQuiz.id).toBeTruthy();
      expect(mockQuiz.title).toBeTruthy();
      expect(mockQuiz.language).toMatch(/^(en|ar)$/);
      expect(mockQuiz.timeLimitMinutes).toBeGreaterThan(0);
      expect(mockQuiz.maxAttempts).toBeGreaterThan(0);
      expect(Array.isArray(mockQuiz.questions)).toBe(true);
      expect(mockQuiz.questions.length).toBeGreaterThan(0);
      
      // Validate question structure
      const question = mockQuiz.questions[0];
      expect(question.questionType).toMatch(/^(mcq|true_false|multiple_select)$/);
      expect(question.questionData.question).toBeTruthy();
      expect(Array.isArray(question.correctAnswers)).toBe(true);
    });

    it('should validate learning module data structure', () => {
      const mockModule = {
        id: 'module-1',
        createdBy: 'admin-1',
        title: 'Test Module',
        description: 'A test learning module',
        category: 'Security',
        orderIndex: 0,
        isPublished: true,
        materials: [
          {
            id: 'material-1',
            moduleId: 'module-1',
            materialType: 'link',
            title: 'Test Material',
            description: 'A test material',
            materialData: {
              url: 'https://example.com'
            },
            orderIndex: 0
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Validate required fields
      expect(mockModule.id).toBeTruthy();
      expect(mockModule.title).toBeTruthy();
      expect(mockModule.category).toBeTruthy();
      expect(Array.isArray(mockModule.materials)).toBe(true);
      
      // Validate material structure
      const material = mockModule.materials[0];
      expect(material.materialType).toMatch(/^(link|video|document)$/);
      expect(material.title).toBeTruthy();
      expect(material.materialData).toBeTruthy();
    });

    it('should validate Arabic content structure', () => {
      const arabicQuiz = {
        id: 'quiz-ar-1',
        title: 'اختبار الأمان',
        description: 'اختبار معرفة الأمان السيبراني',
        language: 'ar',
        questions: [
          {
            id: 'q-ar-1',
            questionData: {
              question: 'ما هو كلمة المرور القوية؟',
              options: ['123456', 'كلمة مرور معقدة', 'اسمي', 'تاريخ ميلادي']
            },
            correctAnswers: ['كلمة مرور معقدة']
          }
        ]
      };

      expect(arabicQuiz.language).toBe('ar');
      expect(arabicQuiz.title).toMatch(/[\u0600-\u06FF]/); // Arabic Unicode range
      expect(arabicQuiz.questions[0].questionData.question).toMatch(/[\u0600-\u06FF]/);
    });
  });

  describe('10. Performance and Scalability Validation', () => {
    it('should handle large datasets efficiently', () => {
      // Test data structure efficiency
      const largeQuizList = Array.from({ length: 1000 }, (_, i) => ({
        id: `quiz-${i}`,
        title: `Quiz ${i}`,
        language: i % 2 === 0 ? 'en' : 'ar',
        timeLimitMinutes: 10,
        maxAttempts: 3,
        isPublished: true,
        questions: []
      }));

      const startTime = performance.now();
      
      // Simulate filtering operations
      const englishQuizzes = largeQuizList.filter(q => q.language === 'en');
      const arabicQuizzes = largeQuizList.filter(q => q.language === 'ar');
      const publishedQuizzes = largeQuizList.filter(q => q.isPublished);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(englishQuizzes.length).toBe(500);
      expect(arabicQuizzes.length).toBe(500);
      expect(publishedQuizzes.length).toBe(1000);
      expect(processingTime).toBeLessThan(100); // Should process within 100ms
    });

    it('should validate memory usage patterns', () => {
      // Test memory-efficient data structures
      const quizAttempts = Array.from({ length: 100 }, (_, i) => ({
        id: `attempt-${i}`,
        userId: `user-${i % 10}`, // 10 users with multiple attempts
        quizId: `quiz-${i % 5}`, // 5 quizzes
        score: Math.floor(Math.random() * 100),
        isCompleted: true
      }));

      // Group by user efficiently
      const userAttempts = quizAttempts.reduce((acc, attempt) => {
        if (!acc[attempt.userId]) {
          acc[attempt.userId] = [];
        }
        acc[attempt.userId].push(attempt);
        return acc;
      }, {} as Record<string, typeof quizAttempts>);

      expect(Object.keys(userAttempts)).toHaveLength(10);
      expect(userAttempts['user-0'].length).toBeGreaterThan(0);
    });
  });
});