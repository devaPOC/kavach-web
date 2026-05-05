import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, index, integer } from 'drizzle-orm/pg-core';
import { admins } from './admins';

export const trainerResources = pgTable('trainer_resources', {
	id: uuid('id').primaryKey().defaultRandom(),
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'document', 'video', 'article', 'course'
	contentUrl: varchar('content_url', { length: 500 }),
	contentData: jsonb('content_data'), // For embedded content or metadata
	thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
	category: varchar('category', { length: 100 }),
	tags: jsonb('tags').$type<string[]>(),
	isPublished: boolean('is_published').default(false).notNull(),
	// File upload fields
	fileName: varchar('file_name', { length: 255 }),
	fileSize: integer('file_size'), // Size in bytes
	fileType: varchar('file_type', { length: 100 }), // MIME type
	r2Key: varchar('r2_key', { length: 500 }), // Storage key in R2
	createdBy: uuid('created_by').notNull().references(() => admins.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
	isPublishedIdx: index('trainer_resources_is_published_idx').on(table.isPublished),
	createdByIdx: index('trainer_resources_created_by_idx').on(table.createdBy),
	categoryIdx: index('trainer_resources_category_idx').on(table.category),
	resourceTypeIdx: index('trainer_resources_resource_type_idx').on(table.resourceType),
	createdAtIdx: index('trainer_resources_created_at_idx').on(table.createdAt),
}));
