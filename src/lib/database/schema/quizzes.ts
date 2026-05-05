import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { admins } from './admins';

export const quizTemplates = pgTable('quiz_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  templateConfig: jsonb('template_config').notNull().$type<{
    timeLimitMinutes: number;
    maxAttempts: number;
    language: 'en' | 'ar';
    questionTypes: string[];
    defaultQuestionCount: number;
  }>(),
  usageCount: integer('usage_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdByIdx: index('quiz_templates_created_by_idx').on(table.createdBy),
  createdAtIdx: index('quiz_templates_created_at_idx').on(table.createdAt),
}));

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
  templateId: uuid('template_id').references(() => quizTemplates.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  language: varchar('language', { length: 2 }).notNull().$type<'en' | 'ar'>(),
  targetAudience: varchar('target_audience', { length: 10 }).notNull().$type<'customer' | 'expert'>().default('customer'),
  timeLimitMinutes: integer('time_limit_minutes').notNull(),
  maxAttempts: integer('max_attempts').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by').references(() => admins.id, { onDelete: 'set null' }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdByIdx: index('quizzes_created_by_idx').on(table.createdBy),
  templateIdIdx: index('quizzes_template_id_idx').on(table.templateId),
  isPublishedIdx: index('quizzes_is_published_idx').on(table.isPublished),
  isArchivedIdx: index('quizzes_is_archived_idx').on(table.isArchived),
  targetAudienceIdx: index('quizzes_target_audience_idx').on(table.targetAudience),
  publishedArchivedIdx: index('quizzes_published_archived_idx').on(table.isPublished, table.isArchived),
  createdAtIdx: index('quizzes_created_at_idx').on(table.createdAt),
}));

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionType: varchar('question_type', { length: 20 }).notNull().$type<'mcq' | 'true_false' | 'multiple_select'>(),
  questionData: jsonb('question_data').notNull().$type<{
    question: string;
    options?: string[];
    explanation?: string;
  }>(),
  correctAnswers: jsonb('correct_answers').notNull().$type<string[]>(),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  quizIdIdx: index('quiz_questions_quiz_id_idx').on(table.quizId),
  quizIdOrderIdx: index('quiz_questions_quiz_id_order_idx').on(table.quizId, table.orderIndex),
}));

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizId: uuid('quiz_id').notNull().references(() => quizzes.id),
  answers: jsonb('answers').notNull().$type<Record<string, string[]>>(),
  score: integer('score').notNull(),
  timeTakenSeconds: integer('time_taken_seconds').notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  userIdIdx: index('quiz_attempts_user_id_idx').on(table.userId),
  quizIdIdx: index('quiz_attempts_quiz_id_idx').on(table.quizId),
  isCompletedIdx: index('quiz_attempts_is_completed_idx').on(table.isCompleted),
  userQuizIdx: index('quiz_attempts_user_quiz_idx').on(table.userId, table.quizId),
  startedAtIdx: index('quiz_attempts_started_at_idx').on(table.startedAt),
}));
