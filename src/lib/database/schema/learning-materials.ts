import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { admins } from './admins';

export const learningModules = pgTable('learning_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by').references(() => admins.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  targetAudience: varchar('target_audience', { length: 10 }).notNull().$type<'customer' | 'expert'>().default('customer'),
  orderIndex: integer('order_index').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by').references(() => admins.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdByIdx: index('learning_modules_created_by_idx').on(table.createdBy),
  categoryIdx: index('learning_modules_category_idx').on(table.category),
  targetAudienceIdx: index('learning_modules_target_audience_idx').on(table.targetAudience),
  isPublishedIdx: index('learning_modules_is_published_idx').on(table.isPublished),
  isArchivedIdx: index('learning_modules_is_archived_idx').on(table.isArchived),
  orderIndexIdx: index('learning_modules_order_index_idx').on(table.orderIndex),
  publishedArchivedIdx: index('learning_modules_published_archived_idx').on(table.isPublished, table.isArchived),
}));

export const moduleMaterials = pgTable('module_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => learningModules.id, { onDelete: 'cascade' }),
  materialType: varchar('material_type', { length: 20 }).notNull().$type<'link' | 'video' | 'document'>(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  materialData: jsonb('material_data').notNull().$type<{
    url?: string;
    embedCode?: string;
    fileUrl?: string;
    duration?: number;
  }>(),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  moduleIdIdx: index('module_materials_module_id_idx').on(table.moduleId),
  moduleIdOrderIdx: index('module_materials_module_id_order_idx').on(table.moduleId, table.orderIndex),
  materialTypeIdx: index('module_materials_material_type_idx').on(table.materialType),
}));

export const learningProgress = pgTable('learning_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  moduleId: uuid('module_id').notNull().references(() => learningModules.id),
  materialId: uuid('material_id').references(() => moduleMaterials.id),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  lastAccessed: timestamp('last_accessed', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('learning_progress_user_id_idx').on(table.userId),
  moduleIdIdx: index('learning_progress_module_id_idx').on(table.moduleId),
  materialIdIdx: index('learning_progress_material_id_idx').on(table.materialId),
  userModuleIdx: index('learning_progress_user_module_idx').on(table.userId, table.moduleId),
  isCompletedIdx: index('learning_progress_is_completed_idx').on(table.isCompleted),
  lastAccessedIdx: index('learning_progress_last_accessed_idx').on(table.lastAccessed),
  userModuleMaterialUnique: unique('learning_progress_user_module_material_unique').on(table.userId, table.moduleId, table.materialId),
}));
