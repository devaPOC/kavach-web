import { BaseService, ServiceResult, serviceSuccess, serviceError } from '../base.service';
import { AwarenessLabErrorCode } from '@/lib/errors/awareness-lab-errors';

export interface QuizQuestion {
  id: string;
  questionType: 'mcq' | 'true_false' | 'multiple_select';
  questionData: {
    question: string;
    options?: string[];
    explanation?: string;
  };
  correctAnswers: string[];
  orderIndex: number;
}

export interface QuestionResult {
  questionId: string;
  questionType: 'mcq' | 'true_false' | 'multiple_select';
  userAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  partialCredit: number; // 0-1 for partial credit scoring
  points: number;
  maxPoints: number;
  explanation?: string;
  feedback: string;
}

export interface ScoringResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  partialCreditQuestions: number;
  results: QuestionResult[];
  scoringMethod: 'standard' | 'partial_credit';
}

export interface ScoringConfig {
  enablePartialCredit: boolean;
  partialCreditThreshold: number; // Minimum percentage for partial credit
  roundingMethod: 'floor' | 'ceil' | 'round';
  passingScore: number; // Percentage required to pass
}

/**
 * Enhanced Quiz Scoring Service with support for all question types and partial credit
 * Implements requirements 2.3 and 2.5 for accurate scoring and detailed feedback
 */
export class QuizScoringService extends BaseService {
  private readonly defaultConfig: ScoringConfig = {
    enablePartialCredit: true,
    partialCreditThreshold: 0.5, // 50% minimum for partial credit
    roundingMethod: 'round',
    passingScore: 70 // 70% to pass
  };

  /**
   * Calculate quiz score with detailed results and feedback
   */
  async calculateScore(
    questions: QuizQuestion[],
    userAnswers: Record<string, string[]>,
    config: Partial<ScoringConfig> = {}
  ): Promise<ServiceResult<ScoringResult>> {
    try {
      const scoringConfig = { ...this.defaultConfig, ...config };
      const results: QuestionResult[] = [];
      let totalPoints = 0;
      let maxTotalPoints = 0;
      let correctCount = 0;
      let partialCreditCount = 0;

      // Validate inputs
      if (!questions || questions.length === 0) {
        return serviceError('No questions provided for scoring', AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
      }

      if (!userAnswers || typeof userAnswers !== 'object') {
        return serviceError('Invalid user answers format', AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
      }

      // Score each question
      for (const question of questions) {
        const questionResult = await this.scoreQuestion(
          question,
          userAnswers[question.id] || [],
          scoringConfig
        );

        if (!questionResult.success) {
          return serviceError(
            `Failed to score question ${question.id}: ${questionResult.error}`,
            AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS
          );
        }

        const result = questionResult.data!;
        results.push(result);

        totalPoints += result.points;
        maxTotalPoints += result.maxPoints;

        if (result.isCorrect) {
          correctCount++;
        } else if (result.partialCredit > 0) {
          partialCreditCount++;
        }
      }

      // Calculate final score
      const percentage = maxTotalPoints > 0 ? (totalPoints / maxTotalPoints) * 100 : 0;
      const finalScore = this.applyRounding(percentage, scoringConfig.roundingMethod);

      const scoringResult: ScoringResult = {
        totalScore: finalScore,
        maxScore: 100,
        percentage: finalScore,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        partialCreditQuestions: partialCreditCount,
        results,
        scoringMethod: scoringConfig.enablePartialCredit ? 'partial_credit' : 'standard'
      };

      this.audit({
        event: 'awareness.quiz.created',
        resource: 'quiz_scoring',
        metadata: {
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          partialCreditQuestions: partialCreditCount,
          finalScore: finalScore,
          scoringMethod: scoringResult.scoringMethod
        }
      });

      return serviceSuccess(scoringResult);
    } catch (error) {
      this.handleError(error, 'QuizScoringService.calculateScore');
    }
  }

  /**
   * Score an individual question based on its type
   */
  private async scoreQuestion(
    question: QuizQuestion,
    userAnswers: string[],
    config: ScoringConfig
  ): Promise<ServiceResult<QuestionResult>> {
    try {
      // Validate question format
      const validation = this.validateQuestionFormat(question);
      if (!validation.success) {
        return serviceError(validation.error!, AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS);
      }

      // Normalize answers (trim whitespace, handle case sensitivity)
      const normalizedUserAnswers = this.normalizeAnswers(userAnswers);
      const normalizedCorrectAnswers = this.normalizeAnswers(question.correctAnswers);

      let isCorrect = false;
      let partialCredit = 0;
      let points = 0;
      const maxPoints = 1; // Each question worth 1 point
      let feedback = '';

      switch (question.questionType) {
        case 'mcq':
          ({ isCorrect, partialCredit, feedback } = this.scoreMCQ(
            normalizedUserAnswers,
            normalizedCorrectAnswers
          ));
          break;

        case 'true_false':
          ({ isCorrect, partialCredit, feedback } = this.scoreTrueFalse(
            normalizedUserAnswers,
            normalizedCorrectAnswers
          ));
          break;

        case 'multiple_select':
          ({ isCorrect, partialCredit, feedback } = this.scoreMultipleSelect(
            normalizedUserAnswers,
            normalizedCorrectAnswers,
            config
          ));
          break;

        default:
          return serviceError(
            `Unsupported question type: ${question.questionType}`,
            AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS
          );
      }

      // Calculate points based on correctness and partial credit
      if (isCorrect) {
        points = maxPoints;
      } else if (config.enablePartialCredit && partialCredit >= config.partialCreditThreshold) {
        points = maxPoints * partialCredit;
      } else {
        points = 0;
        partialCredit = 0; // Reset partial credit if below threshold
      }

      const result: QuestionResult = {
        questionId: question.id,
        questionType: question.questionType,
        userAnswers: userAnswers, // Keep original format for display
        correctAnswers: question.correctAnswers,
        isCorrect,
        partialCredit,
        points,
        maxPoints,
        explanation: question.questionData.explanation,
        feedback
      };

      return serviceSuccess(result);
    } catch (error) {
      return serviceError(
        `Failed to score question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AwarenessLabErrorCode.INVALID_QUIZ_ANSWERS
      );
    }
  }

  /**
   * Score Multiple Choice Question (single correct answer)
   */
  private scoreMCQ(
    userAnswers: string[],
    correctAnswers: string[]
  ): { isCorrect: boolean; partialCredit: number; feedback: string } {
    // MCQ should have exactly one answer
    if (userAnswers.length === 0) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'No answer selected.'
      };
    }

    if (userAnswers.length > 1) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'Multiple answers selected for single-choice question.'
      };
    }

    if (correctAnswers.length !== 1) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'Invalid question configuration: MCQ must have exactly one correct answer.'
      };
    }

    const isCorrect = userAnswers[0] === correctAnswers[0];
    return {
      isCorrect,
      partialCredit: isCorrect ? 1 : 0,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswers[0]}`
    };
  }

  /**
   * Score True/False Question
   */
  private scoreTrueFalse(
    userAnswers: string[],
    correctAnswers: string[]
  ): { isCorrect: boolean; partialCredit: number; feedback: string } {
    if (userAnswers.length === 0) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'No answer selected.'
      };
    }

    if (userAnswers.length > 1) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'Multiple answers selected for true/false question.'
      };
    }

    if (correctAnswers.length !== 1) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'Invalid question configuration: True/False must have exactly one correct answer.'
      };
    }

    // Normalize true/false answers
    const userAnswer = userAnswers[0].toLowerCase();
    const correctAnswer = correctAnswers[0].toLowerCase();

    // Handle various true/false formats
    const trueValues = ['true', 't', '1', 'yes', 'y'];
    const falseValues = ['false', 'f', '0', 'no', 'n'];

    const userIsTrue = trueValues.includes(userAnswer);
    const userIsFalse = falseValues.includes(userAnswer);
    const correctIsTrue = trueValues.includes(correctAnswer);

    if (!userIsTrue && !userIsFalse) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'Invalid answer format for true/false question.'
      };
    }

    const isCorrect = (userIsTrue && correctIsTrue) || (userIsFalse && !correctIsTrue);
    return {
      isCorrect,
      partialCredit: isCorrect ? 1 : 0,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctIsTrue ? 'True' : 'False'}`
    };
  }

  /**
   * Score Multiple Select Question with partial credit support
   */
  private scoreMultipleSelect(
    userAnswers: string[],
    correctAnswers: string[],
    config: ScoringConfig
  ): { isCorrect: boolean; partialCredit: number; feedback: string } {
    if (userAnswers.length === 0) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'No answers selected.'
      };
    }

    if (correctAnswers.length === 0) {
      return {
        isCorrect: false,
        partialCredit: 0,
        feedback: 'Invalid question configuration: Multiple select must have at least one correct answer.'
      };
    }

    // Convert to sets for easier comparison
    const userSet = new Set(userAnswers);
    const correctSet = new Set(correctAnswers);

    // Calculate matches and mismatches
    const correctSelections = userAnswers.filter(answer => correctSet.has(answer)).length;
    const incorrectSelections = userAnswers.filter(answer => !correctSet.has(answer)).length;
    const missedCorrectAnswers = correctAnswers.filter(answer => !userSet.has(answer)).length;

    // Check for perfect match
    const isCorrect = correctSelections === correctAnswers.length && 
                     incorrectSelections === 0 && 
                     missedCorrectAnswers === 0;

    if (isCorrect) {
      return {
        isCorrect: true,
        partialCredit: 1,
        feedback: 'Correct! All answers selected correctly.'
      };
    }

    // Calculate partial credit if enabled
    let partialCredit = 0;
    let feedback = '';

    if (config.enablePartialCredit) {
      // Partial credit formula: (correct selections - incorrect selections) / total correct answers
      // Ensure it doesn't go below 0
      partialCredit = Math.max(0, (correctSelections - incorrectSelections) / correctAnswers.length);
      
      if (partialCredit >= config.partialCreditThreshold) {
        feedback = `Partially correct (${Math.round(partialCredit * 100)}%). `;
      } else {
        feedback = 'Incorrect. ';
        partialCredit = 0;
      }
    } else {
      feedback = 'Incorrect. ';
    }

    // Add detailed feedback
    if (correctSelections > 0) {
      feedback += `You correctly selected ${correctSelections} out of ${correctAnswers.length} correct answers. `;
    }
    if (incorrectSelections > 0) {
      feedback += `You selected ${incorrectSelections} incorrect answer${incorrectSelections > 1 ? 's' : ''}. `;
    }
    if (missedCorrectAnswers > 0) {
      feedback += `You missed ${missedCorrectAnswers} correct answer${missedCorrectAnswers > 1 ? 's' : ''}. `;
    }

    feedback += `Correct answers: ${correctAnswers.join(', ')}`;

    return {
      isCorrect: false,
      partialCredit,
      feedback: feedback.trim()
    };
  }

  /**
   * Validate question format and structure
   */
  private validateQuestionFormat(question: QuizQuestion): { success: boolean; error?: string } {
    if (!question.id || typeof question.id !== 'string') {
      return { success: false, error: 'Question must have a valid ID' };
    }

    if (!question.questionType || !['mcq', 'true_false', 'multiple_select'].includes(question.questionType)) {
      return { success: false, error: 'Question must have a valid type' };
    }

    if (!question.correctAnswers || !Array.isArray(question.correctAnswers)) {
      return { success: false, error: 'Question must have correct answers array' };
    }

    if (question.correctAnswers.length === 0) {
      return { success: false, error: 'Question must have at least one correct answer' };
    }

    // Type-specific validations
    switch (question.questionType) {
      case 'mcq':
        if (question.correctAnswers.length !== 1) {
          return { success: false, error: 'MCQ must have exactly one correct answer' };
        }
        break;

      case 'true_false':
        if (question.correctAnswers.length !== 1) {
          return { success: false, error: 'True/False must have exactly one correct answer' };
        }
        break;

      case 'multiple_select':
        if (question.correctAnswers.length < 1) {
          return { success: false, error: 'Multiple select must have at least one correct answer' };
        }
        break;
    }

    return { success: true };
  }

  /**
   * Normalize answers for consistent comparison
   */
  private normalizeAnswers(answers: string[]): string[] {
    return answers
      .filter(answer => answer != null) // Remove null/undefined
      .map(answer => String(answer).trim()) // Convert to string and trim
      .filter(answer => answer.length > 0); // Remove empty strings
  }

  /**
   * Apply rounding method to final score
   */
  private applyRounding(score: number, method: 'floor' | 'ceil' | 'round'): number {
    switch (method) {
      case 'floor':
        return Math.floor(score);
      case 'ceil':
        return Math.ceil(score);
      case 'round':
      default:
        return Math.round(score);
    }
  }

  /**
   * Validate user answers format before scoring
   */
  async validateAnswersFormat(
    questions: QuizQuestion[],
    userAnswers: Record<string, string[]>
  ): Promise<ServiceResult<{ isValid: boolean; errors: string[] }>> {
    try {
      const errors: string[] = [];

      // Check if all questions have answers
      for (const question of questions) {
        const answers = userAnswers[question.id];
        
        if (!answers || !Array.isArray(answers)) {
          errors.push(`Question ${question.id}: Missing or invalid answer format`);
          continue;
        }

        // Type-specific validations
        switch (question.questionType) {
          case 'mcq':
          case 'true_false':
            if (answers.length !== 1) {
              errors.push(`Question ${question.id}: ${question.questionType} must have exactly one answer`);
            }
            break;

          case 'multiple_select':
            if (answers.length === 0) {
              errors.push(`Question ${question.id}: Multiple select must have at least one answer`);
            }
            break;
        }

        // Check for empty answers
        const emptyAnswers = answers.filter(answer => !answer || String(answer).trim().length === 0);
        if (emptyAnswers.length > 0) {
          errors.push(`Question ${question.id}: Contains empty answers`);
        }
      }

      return serviceSuccess({
        isValid: errors.length === 0,
        errors
      });
    } catch (error) {
      this.handleError(error, 'QuizScoringService.validateAnswersFormat');
    }
  }

  /**
   * Generate detailed feedback report
   */
  async generateFeedbackReport(scoringResult: ScoringResult): Promise<ServiceResult<string>> {
    try {
      let report = `Quiz Results Summary\n`;
      report += `========================\n\n`;
      report += `Final Score: ${scoringResult.totalScore}%\n`;
      report += `Correct Answers: ${scoringResult.correctAnswers}/${scoringResult.totalQuestions}\n`;
      
      if (scoringResult.partialCreditQuestions > 0) {
        report += `Partial Credit Questions: ${scoringResult.partialCreditQuestions}\n`;
      }
      
      report += `Scoring Method: ${scoringResult.scoringMethod === 'partial_credit' ? 'Partial Credit' : 'Standard'}\n\n`;

      report += `Question-by-Question Results:\n`;
      report += `==============================\n\n`;

      for (let i = 0; i < scoringResult.results.length; i++) {
        const result = scoringResult.results[i];
        report += `Question ${i + 1} (${result.questionType.toUpperCase()}):\n`;
        report += `Status: ${result.isCorrect ? 'CORRECT' : result.partialCredit > 0 ? 'PARTIAL CREDIT' : 'INCORRECT'}\n`;
        report += `Points: ${result.points}/${result.maxPoints}\n`;
        
        if (result.partialCredit > 0 && !result.isCorrect) {
          report += `Partial Credit: ${Math.round(result.partialCredit * 100)}%\n`;
        }
        
        report += `Your Answer(s): ${result.userAnswers.join(', ') || 'No answer'}\n`;
        report += `Correct Answer(s): ${result.correctAnswers.join(', ')}\n`;
        report += `Feedback: ${result.feedback}\n`;
        
        if (result.explanation) {
          report += `Explanation: ${result.explanation}\n`;
        }
        
        report += `\n`;
      }

      return serviceSuccess(report);
    } catch (error) {
      this.handleError(error, 'QuizScoringService.generateFeedbackReport');
    }
  }
}

// Export singleton instance
export const quizScoringService = new QuizScoringService();