'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  GripVertical,
  CheckCircle,
  XCircle,
  HelpCircle,
  List,
  CheckSquare
} from 'lucide-react'
import MultilingualEditor from './MultilingualEditor'

export interface QuestionData {
  id?: string
  questionType: 'mcq' | 'true_false' | 'multiple_select'
  questionData: {
    question: string
    options?: string[]
    explanation?: string
  }
  correctAnswers: string[]
  orderIndex: number
}

interface QuestionBuilderProps {
  questions: QuestionData[]
  onChange: (questions: QuestionData[]) => void
  language: 'en' | 'ar'
  disabled?: boolean
}

export default function QuestionBuilder({
  questions,
  onChange,
  language,
  disabled = false
}: QuestionBuilderProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  const addQuestion = () => {
    const newQuestion: QuestionData = {
      questionType: 'mcq',
      questionData: {
        question: '',
        options: ['', ''],
        explanation: ''
      },
      correctAnswers: [],
      orderIndex: questions.length
    }
    onChange([...questions, newQuestion])
    setExpandedQuestion(questions.length)
  }

  const updateQuestion = (index: number, updates: Partial<QuestionData>) => {
    const updatedQuestions = questions.map((q, i) =>
      i === index ? { ...q, ...updates } : q
    )
    onChange(updatedQuestions)
  }

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, orderIndex: i }))
    onChange(updatedQuestions)

    if (expandedQuestion === index) {
      setExpandedQuestion(null)
    } else if (expandedQuestion !== null && expandedQuestion > index) {
      setExpandedQuestion(expandedQuestion - 1)
    }
  }

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= questions.length) return

    const updatedQuestions = [...questions]
    const [movedQuestion] = updatedQuestions.splice(fromIndex, 1)
    updatedQuestions.splice(toIndex, 0, movedQuestion)

    // Update order indices
    const reorderedQuestions = updatedQuestions.map((q, i) => ({ ...q, orderIndex: i }))
    onChange(reorderedQuestions)

    // Update expanded question index
    if (expandedQuestion === fromIndex) {
      setExpandedQuestion(toIndex)
    } else if (expandedQuestion !== null) {
      if (fromIndex < expandedQuestion && toIndex >= expandedQuestion) {
        setExpandedQuestion(expandedQuestion - 1)
      } else if (fromIndex > expandedQuestion && toIndex <= expandedQuestion) {
        setExpandedQuestion(expandedQuestion + 1)
      }
    }
  }

  const updateQuestionType = (index: number, type: 'mcq' | 'true_false' | 'multiple_select') => {
    const question = questions[index]
    let updates: Partial<QuestionData> = { questionType: type }

    switch (type) {
      case 'true_false':
        updates.questionData = {
          ...question.questionData,
          options: undefined
        }
        updates.correctAnswers = []
        break
      case 'mcq':
        updates.questionData = {
          ...question.questionData,
          options: question.questionData.options || ['', '']
        }
        updates.correctAnswers = []
        break
      case 'multiple_select':
        updates.questionData = {
          ...question.questionData,
          options: question.questionData.options || ['', '']
        }
        updates.correctAnswers = []
        break
    }

    updateQuestion(index, updates)
  }

  const updateQuestionText = (index: number, text: string) => {
    updateQuestion(index, {
      questionData: {
        ...questions[index].questionData,
        question: text
      }
    })
  }

  const updateExplanation = (index: number, explanation: string) => {
    updateQuestion(index, {
      questionData: {
        ...questions[index].questionData,
        explanation
      }
    })
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const question = questions[questionIndex]
    const options = [...(question.questionData.options || [])]
    options[optionIndex] = value

    updateQuestion(questionIndex, {
      questionData: {
        ...question.questionData,
        options
      }
    })
  }

  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex]
    const options = [...(question.questionData.options || []), '']

    updateQuestion(questionIndex, {
      questionData: {
        ...question.questionData,
        options
      }
    })
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex]
    const optionToRemove = question.questionData.options?.[optionIndex]
    const options = (question.questionData.options || []).filter((_, i) => i !== optionIndex)

    // Remove this option from correct answers if it was selected
    const correctAnswers = question.correctAnswers.filter(answer =>
      answer !== optionToRemove
    )

    updateQuestion(questionIndex, {
      questionData: {
        ...question.questionData,
        options
      },
      correctAnswers
    })
  }

  const updateCorrectAnswers = (questionIndex: number, answers: string[]) => {
    updateQuestion(questionIndex, { correctAnswers: answers })
  }

  const toggleCorrectAnswer = (questionIndex: number, answer: string) => {
    const question = questions[questionIndex]
    const currentAnswers = question.correctAnswers

    if (question.questionType === 'mcq' || question.questionType === 'true_false') {
      // Single answer only
      updateCorrectAnswers(questionIndex, [answer])
    } else {
      // Multiple answers allowed
      const newAnswers = currentAnswers.includes(answer)
        ? currentAnswers.filter(a => a !== answer)
        : [...currentAnswers, answer]
      updateCorrectAnswers(questionIndex, newAnswers)
    }
  }

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <CheckCircle className="h-4 w-4" />
      case 'true_false': return <XCircle className="h-4 w-4" />
      case 'multiple_select': return <CheckSquare className="h-4 w-4" />
      default: return <HelpCircle className="h-4 w-4" />
    }
  }

  const getQuestionTypeName = (type: string) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice'
      case 'true_false': return 'True/False'
      case 'multiple_select': return 'Multiple Select'
      default: return 'Unknown'
    }
  }

  const validateQuestion = (question: QuestionData): string[] => {
    const errors: string[] = []

    if (!question.questionData.question.trim()) {
      errors.push('Question text is required')
    }

    if (question.questionType === 'true_false') {
      if (question.correctAnswers.length !== 1 ||
        !['true', 'false'].includes(question.correctAnswers[0]?.toLowerCase())) {
        errors.push('True/False questions must have exactly one correct answer (true or false)')
      }
    } else if (question.questionType === 'mcq' || question.questionType === 'multiple_select') {
      const options = question.questionData.options || []

      if (options.length < 2) {
        errors.push('Must have at least 2 options')
      }

      if (options.some(opt => !opt.trim())) {
        errors.push('All options must have text')
      }

      if (question.questionType === 'mcq' && question.correctAnswers.length !== 1) {
        errors.push('Multiple choice questions must have exactly one correct answer')
      }

      if (question.questionType === 'multiple_select' && question.correctAnswers.length === 0) {
        errors.push('Multiple select questions must have at least one correct answer')
      }
    }

    return errors
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Questions ({questions.length})</h3>
          <p className="text-sm text-muted-foreground">
            Build your quiz questions with multiple question types
          </p>
        </div>
        <Button
          onClick={addQuestion}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <List className="h-12 w-12 text-muted-foreground/80 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Start building your quiz by adding your first question
            </p>
            <Button onClick={addQuestion} disabled={disabled}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const errors = validateQuestion(question)
            const isExpanded = expandedQuestion === index

            return (
              <Card key={index} className={`${errors.length > 0 ? 'border-destructive' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-grab"
                          disabled={disabled}
                          onMouseDown={(e) => {
                            // Simple drag implementation
                            e.preventDefault()
                          }}
                        >
                          <GripVertical className="h-4 w-4" />
                        </Button>
                        <span className="font-medium">Question {index + 1}</span>
                      </div>

                      <Badge variant="outline" className="flex items-center gap-1">
                        {getQuestionTypeIcon(question.questionType)}
                        {getQuestionTypeName(question.questionType)}
                      </Badge>

                      {errors.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {errors.length} error{errors.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveQuestion(index, index - 1)}
                        disabled={disabled || index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveQuestion(index, index + 1)}
                        disabled={disabled || index === questions.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedQuestion(isExpanded ? null : index)}
                        disabled={disabled}
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        disabled={disabled}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {!isExpanded && question.questionData.question && (
                    <div className="text-sm text-muted-foreground truncate">
                      {question.questionData.question}
                    </div>
                  )}

                  {errors.length > 0 && (
                    <div className="text-sm text-destructive">
                      {errors.map((error, i) => (
                        <div key={i}>• {error}</div>
                      ))}
                    </div>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {/* Question Type Selection */}
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={question.questionType}
                        onValueChange={(value: 'mcq' | 'true_false' | 'multiple_select') =>
                          updateQuestionType(index, value)
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mcq">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Multiple Choice (Single Answer)
                            </div>
                          </SelectItem>
                          <SelectItem value="true_false">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              True/False
                            </div>
                          </SelectItem>
                          <SelectItem value="multiple_select">
                            <div className="flex items-center gap-2">
                              <CheckSquare className="h-4 w-4" />
                              Multiple Select (Multiple Answers)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-2">
                      <Label>Question Text *</Label>
                      <MultilingualEditor
                        value={question.questionData.question}
                        onChange={(value) => updateQuestionText(index, value)}
                        language={language}
                        placeholder="Enter your question..."
                        disabled={disabled}
                      />
                    </div>

                    {/* Answer Options */}
                    {question.questionType === 'true_false' ? (
                      <div className="space-y-2">
                        <Label>Correct Answer *</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`question-${index}-answer`}
                              value="true"
                              checked={question.correctAnswers.includes('true')}
                              onChange={() => toggleCorrectAnswer(index, 'true')}
                              disabled={disabled}
                            />
                            <span>True</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`question-${index}-answer`}
                              value="false"
                              checked={question.correctAnswers.includes('false')}
                              onChange={() => toggleCorrectAnswer(index, 'false')}
                              disabled={disabled}
                            />
                            <span>False</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Answer Options *</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(index)}
                            disabled={disabled || (question.questionData.options?.length || 0) >= 6}
                            className="flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Option
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {(question.questionData.options || []).map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-3">
                              <div className="flex items-center">
                                {question.questionType === 'mcq' ? (
                                  <input
                                    type="radio"
                                    name={`question-${index}-correct`}
                                    checked={question.correctAnswers.includes(option)}
                                    onChange={() => toggleCorrectAnswer(index, option)}
                                    disabled={disabled}
                                    className="mr-2"
                                  />
                                ) : (
                                  <Checkbox
                                    checked={question.correctAnswers.includes(option)}
                                    onCheckedChange={() => toggleCorrectAnswer(index, option)}
                                    disabled={disabled}
                                    className="mr-2"
                                  />
                                )}
                              </div>

                              <div className="flex-1">
                                <MultilingualEditor
                                  value={option}
                                  onChange={(value) => updateOption(index, optionIndex, value)}
                                  language={language}
                                  placeholder={`Option ${optionIndex + 1}...`}
                                  disabled={disabled}
                                  compact
                                />
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(index, optionIndex)}
                                disabled={disabled || (question.questionData.options?.length || 0) <= 2}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {question.questionType === 'mcq'
                            ? 'Select one correct answer'
                            : 'Select all correct answers'
                          }
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="space-y-2">
                      <Label>Explanation</Label>
                      <MultilingualEditor
                        value={question.questionData.explanation || ''}
                        onChange={(value) => updateExplanation(index, value)}
                        language={language}
                        placeholder="Provide an explanation for the correct answer..."
                        disabled={disabled}
                      />
                      <div className="text-xs text-muted-foreground">
                        This explanation will be shown to users after they complete the quiz
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
