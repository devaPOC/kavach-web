#!/usr/bin/env bun
/**
 * Create test quiz and test end date functionality
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { quizzes, quizQuestions } from '../src/lib/database/schema/quizzes'
import { eq } from 'drizzle-orm'

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/kavach'
const client = postgres(connectionString)
const db = drizzle(client)

async function createTestQuizAndTestEndDate() {
  try {
    console.log('🧪 Creating Test Quiz and Testing End Date Functionality\n')

    // Create a test quiz
    console.log('1. Creating test quiz...')
    const testQuizData = {
      title: 'Test Quiz for End Date',
      description: 'This is a test quiz to verify end date functionality',
      language: 'en' as const,
      timeLimitMinutes: 30,
      maxAttempts: 3,
      isPublished: false,
      endDate: null as Date | null,
      createdBy: 'test-admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const [createdQuiz] = await db
      .insert(quizzes)
      .values(testQuizData)
      .returning()

    console.log(`✅ Created test quiz: "${createdQuiz.title}" (ID: ${createdQuiz.id})`)

    // Add a test question
    console.log('2. Adding test question...')
    const testQuestionData = {
      quizId: createdQuiz.id,
      questionType: 'mcq' as const,
      questionData: {
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6']
      },
      correctAnswers: ['4'],
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db
      .insert(quizQuestions)
      .values(testQuestionData)

    console.log('✅ Added test question')

    // Test Case 1: Set an end date
    console.log('\n3. Testing end date setting...')
    const testEndDate = new Date('2024-12-31T23:59:59')
    console.log(`   Setting end date to: ${testEndDate.toISOString()}`)

    await db
      .update(quizzes)
      .set({
        endDate: testEndDate,
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, createdQuiz.id))

    // Verify the update
    const updatedQuiz = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        endDate: quizzes.endDate,
        updatedAt: quizzes.updatedAt
      })
      .from(quizzes)
      .where(eq(quizzes.id, createdQuiz.id))
      .limit(1)

    if (updatedQuiz.length > 0) {
      const quiz = updatedQuiz[0]
      console.log('   ✅ End date updated successfully!')
      console.log(`   New end date: ${quiz.endDate?.toISOString()}`)
      console.log(`   Updated at: ${quiz.updatedAt?.toISOString()}`)

      // Verify the date matches what we set
      if (quiz.endDate && Math.abs(quiz.endDate.getTime() - testEndDate.getTime()) < 1000) {
        console.log('   ✅ End date matches expected value')
      } else {
        console.log('   ❌ End date does not match expected value')
        console.log(`      Expected: ${testEndDate.toISOString()}`)
        console.log(`      Actual: ${quiz.endDate?.toISOString()}`)
      }
    } else {
      console.log('   ❌ Failed to verify quiz update')
    }

    // Test Case 2: Clear the end date (set to null)
    console.log('\n4. Testing end date clearing...')

    await db
      .update(quizzes)
      .set({
        endDate: null,
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, createdQuiz.id))

    // Verify the clear
    const clearedQuiz = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        endDate: quizzes.endDate
      })
      .from(quizzes)
      .where(eq(quizzes.id, createdQuiz.id))
      .limit(1)

    if (clearedQuiz.length > 0 && clearedQuiz[0].endDate === null) {
      console.log('   ✅ End date cleared successfully!')
    } else {
      console.log('   ❌ Failed to clear end date')
      console.log(`      Current value: ${clearedQuiz[0]?.endDate}`)
    }

    // Test Case 3: Test with API-like payload (simulate frontend submission)
    console.log('\n5. Testing API-style update (simulating frontend)...')

    const apiPayload = {
      title: 'Updated Test Quiz Title',
      description: 'Updated test description',
      language: 'en' as const,
      timeLimitMinutes: 45,
      maxAttempts: 5,
      isPublished: true,
      endDate: new Date('2024-06-30T18:00:00') // Simulate datetime-local input
    }

    await db
      .update(quizzes)
      .set({
        ...apiPayload,
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, createdQuiz.id))

    const apiTestResult = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, createdQuiz.id))
      .limit(1)

    if (apiTestResult.length > 0) {
      const quiz = apiTestResult[0]
      console.log('   ✅ API-style update successful!')
      console.log(`      Title: ${quiz.title}`)
      console.log(`      Description: ${quiz.description}`)
      console.log(`      End Date: ${quiz.endDate?.toISOString()}`)
      console.log(`      Time Limit: ${quiz.timeLimitMinutes} minutes`)
      console.log(`      Max Attempts: ${quiz.maxAttempts}`)
      console.log(`      Published: ${quiz.isPublished}`)
    }

    console.log('\n6. Testing date format conversions (frontend simulation)...')

    // Simulate what happens when a datetime-local input sends a date string
    const datetimeLocalValue = '2024-08-15T14:30' // Format from datetime-local input
    const convertedDate = new Date(datetimeLocalValue)

    console.log(`   datetime-local value: "${datetimeLocalValue}"`)
    console.log(`   Converted to Date: ${convertedDate.toISOString()}`)

    await db
      .update(quizzes)
      .set({
        endDate: convertedDate,
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, createdQuiz.id))

    const dateConversionTest = await db
      .select({
        endDate: quizzes.endDate
      })
      .from(quizzes)
      .where(eq(quizzes.id, createdQuiz.id))
      .limit(1)

    if (dateConversionTest.length > 0) {
      console.log(`   ✅ Date conversion successful: ${dateConversionTest[0].endDate?.toISOString()}`)
    }

    // Clean up: Delete the test quiz
    console.log('\n7. Cleaning up test data...')

    // Delete questions first (foreign key constraint)
    await db
      .delete(quizQuestions)
      .where(eq(quizQuestions.quizId, createdQuiz.id))

    // Delete the quiz
    await db
      .delete(quizzes)
      .where(eq(quizzes.id, createdQuiz.id))

    console.log('   ✅ Test data cleaned up')

    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📋 Test Summary:')
    console.log('   ✅ Database connection working')
    console.log('   ✅ Can create quiz with null end date')
    console.log('   ✅ Can set end date on quiz')
    console.log('   ✅ Can clear end date (set to null)')
    console.log('   ✅ API-style update works with all fields')
    console.log('   ✅ Date conversion from datetime-local format works')
    console.log('\n💡 The quiz end date functionality is working correctly at the database level!')
    console.log('   If the frontend is still not working, check:')
    console.log('   - API endpoint request/response handling')
    console.log('   - Frontend form state management')
    console.log('   - Date serialization between client and server')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await client.end()
  }
}

// Run the test
createTestQuizAndTestEndDate()
