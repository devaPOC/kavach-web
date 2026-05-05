'use client';

import React, { useEffect } from 'react';
import {
    useAwarenessLabStore,
    useQuizzes,
    useCurrentQuiz,
    useQuizTimer,
    useAwarenessLabActions,
    useAwarenessLabLoading,
    useAwarenessLabError,
    useAwarenessLabIntegration,
} from '../index';

/**
 * Example component demonstrating how to use the Awareness Lab store
 * This shows the basic patterns for customer-facing quiz functionality
 */
export function AwarenessLabExample() {
    // Use the integration hook to initialize stores
    useAwarenessLabIntegration();

    // Use selector hooks for better performance
    const quizzes = useQuizzes();
    const currentQuiz = useCurrentQuiz();
    const quizTimer = useQuizTimer();
    const actions = useAwarenessLabActions();
    const isLoading = useAwarenessLabLoading();
    const error = useAwarenessLabError();

    // Load quizzes on component mount
    useEffect(() => {
        actions.fetchQuizzes();
    }, [actions]);

    const handleStartQuiz = async (quizId: string) => {
        await actions.startQuiz(quizId);
    };

    const handleSubmitAnswer = (questionId: string, answer: string[]) => {
        actions.submitAnswer(questionId, answer);
    };

    const handleNextQuestion = () => {
        actions.nextQuestion();
    };

    const handleSubmitQuiz = async () => {
        await actions.submitQuiz();
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return (
            <div>
                <p>Error: {error}</p>
                <button onClick={actions.clearError}>Clear Error</button>
            </div>
        );
    }

    // Quiz taking interface
    if (currentQuiz) {
        const currentQuestion = currentQuiz.questions[0]; // Simplified for example

        return (
            <div>
                <h2>{currentQuiz.title}</h2>
                {quizTimer.isActive && (
                    <div>
                        Time Remaining: {formatTime(quizTimer.timeRemaining)}
                    </div>
                )}

                {currentQuestion && (
                    <div>
                        <h3>{currentQuestion.questionData.question}</h3>
                        {currentQuestion.questionData.options?.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleSubmitAnswer(currentQuestion.id, [option])}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}

                <div>
                    <button onClick={handleNextQuestion}>Next Question</button>
                    <button onClick={handleSubmitQuiz}>Submit Quiz</button>
                </div>
            </div>
        );
    }

    // Quiz selection interface
    return (
        <div>
            <h1>Available Quizzes</h1>
            {quizzes.length === 0 ? (
                <p>No quizzes available</p>
            ) : (
                <div>
                    {quizzes.map((quiz) => (
                        <div key={quiz.id}>
                            <h3>{quiz.title}</h3>
                            <p>{quiz.description}</p>
                            <p>Time Limit: {quiz.timeLimitMinutes} minutes</p>
                            <p>Max Attempts: {quiz.maxAttempts}</p>
                            <button onClick={() => handleStartQuiz(quiz.id)}>
                                Start Quiz
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Example component demonstrating admin functionality
 */
export function AdminAwarenessExample() {
    const {
        useAdminQuizzes,
        useAdminAwarenessActions,
        useAdminAwarenessLoading,
        useAdminAwarenessError,
    } = require('../index');

    const adminQuizzes = useAdminQuizzes();
    const actions = useAdminAwarenessActions();
    const isLoading = useAdminAwarenessLoading();
    const error = useAdminAwarenessError();

    useEffect(() => {
        actions.fetchAdminQuizzes();
    }, [actions]);

    const handleCreateQuiz = async () => {
        const newQuiz = {
            title: 'New Quiz',
            description: 'A new quiz created from the admin panel',
            language: 'en' as const,
            timeLimitMinutes: 30,
            maxAttempts: 3,
            questions: [
                {
                    questionType: 'mcq' as const,
                    questionData: {
                        question: 'What is cybersecurity?',
                        options: ['Security for computers', 'Security for cyber', 'Both'],
                    },
                    correctAnswers: ['Security for computers'],
                    orderIndex: 0,
                },
            ],
        };

        await actions.createQuiz(newQuiz);
    };

    const handlePublishQuiz = async (quizId: string) => {
        await actions.publishQuiz(quizId);
    };

    const handleDeleteQuiz = async (quizId: string) => {
        if (confirm('Are you sure you want to delete this quiz?')) {
            await actions.deleteQuiz(quizId);
        }
    };

    if (isLoading) {
        return <div>Loading admin data...</div>;
    }

    if (error) {
        return (
            <div>
                <p>Admin Error: {error}</p>
                <button onClick={actions.clearError}>Clear Error</button>
            </div>
        );
    }

    return (
        <div>
            <h1>Quiz Management</h1>

            <button onClick={handleCreateQuiz}>Create New Quiz</button>

            <div>
                <h2>Existing Quizzes</h2>
                {adminQuizzes.map((quiz: any) => (
                    <div key={quiz.id}>
                        <h3>{quiz.title}</h3>
                        <p>Status: {quiz.isPublished ? 'Published' : 'Draft'}</p>
                        <p>Questions: {quiz.questions.length}</p>

                        <button
                            onClick={() => handlePublishQuiz(quiz.id)}
                            disabled={quiz.isPublished}
                        >
                            {quiz.isPublished ? 'Published' : 'Publish'}
                        </button>

                        <button onClick={() => handleDeleteQuiz(quiz.id)}>
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Example of using the timer functionality
 */
export function QuizTimerExample() {
    const quizTimer = useQuizTimer();
    const actions = useAwarenessLabActions();

    const handleStartTimer = () => {
        actions.startTimer(5); // 5 minutes
    };

    const handlePauseTimer = () => {
        actions.pauseTimer();
    };

    const handleResumeTimer = () => {
        actions.resumeTimer();
    };

    const handleStopTimer = () => {
        actions.stopTimer();
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div>
            <h2>Quiz Timer Example</h2>

            <div>
                <p>Time Remaining: {formatTime(quizTimer.timeRemaining)}</p>
                <p>Status: {quizTimer.isActive ? 'Active' : 'Inactive'}</p>
                {quizTimer.startTime && (
                    <p>Started at: {quizTimer.startTime.toLocaleTimeString()}</p>
                )}
            </div>

            <div>
                <button onClick={handleStartTimer} disabled={quizTimer.isActive}>
                    Start Timer (5 min)
                </button>
                <button onClick={handlePauseTimer} disabled={!quizTimer.isActive}>
                    Pause Timer
                </button>
                <button onClick={handleResumeTimer} disabled={quizTimer.isActive || quizTimer.timeRemaining === 0}>
                    Resume Timer
                </button>
                <button onClick={handleStopTimer}>
                    Stop Timer
                </button>
            </div>
        </div>
    );
}