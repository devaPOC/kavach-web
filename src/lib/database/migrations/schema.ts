import { pgTable, uuid, varchar, text, jsonb, timestamp, foreignKey, date, unique, boolean, inet, integer, index, numeric } from "drizzle-orm/pg-core"



export const archivedServiceData = pgTable("archived_service_data", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	originalId: uuid("original_id").notNull(),
	userId: uuid("user_id").notNull(),
	assignedExpertId: uuid("assigned_expert_id"),
	serviceType: varchar("service_type", { length: 100 }),
	status: varchar({ length: 50 }).notNull(),
	priority: varchar({ length: 20 }),
	title: varchar({ length: 255 }),
	description: text(),
	data: jsonb().notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	archivedAt: timestamp("archived_at", { mode: 'string' }).defaultNow().notNull(),
	archiveReason: varchar("archive_reason", { length: 100 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }),
	customerEmail: varchar("customer_email", { length: 255 }),
	expertName: varchar("expert_name", { length: 255 }),
	expertEmail: varchar("expert_email", { length: 255 }),
});

export const customerProfiles = pgTable("customer_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	phoneNumber: varchar("phone_number", { length: 20 }),
	dateOfBirth: date("date_of_birth"),
	gender: varchar({ length: 20 }),
	nationality: varchar({ length: 100 }),
	countryOfResidence: varchar("country_of_residence", { length: 100 }),
	governorate: varchar({ length: 100 }),
	wilayat: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "customer_profiles_user_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const emailVerifications = pgTable("email_verifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	token: varchar({ length: 512 }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "email_verifications_user_id_users_id_fk"
	}).onDelete("cascade"),
	unique("email_verifications_token_unique").on(table.token),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	role: varchar({ length: 20 }).notNull(),
	isEmailVerified: boolean("is_email_verified").default(false).notNull(),
	isProfileCompleted: boolean("is_profile_completed").default(false).notNull(),
	isApproved: boolean("is_approved").default(true).notNull(),
	isBanned: boolean("is_banned").default(false).notNull(),
	isPaused: boolean("is_paused").default(false).notNull(),
	bannedAt: timestamp("banned_at", { mode: 'string' }),
	pausedAt: timestamp("paused_at", { mode: 'string' }),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	passwordResetToken: varchar("password_reset_token", { length: 255 }),
	passwordResetExpires: timestamp("password_reset_expires", { mode: 'string' }),
	isLocked: boolean("is_locked").default(false).notNull(),
	lockedAt: timestamp("locked_at", { mode: 'string' }),
	lockReason: varchar("lock_reason", { length: 255 }),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const expertProfiles = pgTable("expert_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	phoneNumber: varchar("phone_number", { length: 20 }),
	dateOfBirth: date("date_of_birth"),
	gender: varchar({ length: 20 }),
	nationality: varchar({ length: 100 }),
	countryOfResidence: varchar("country_of_residence", { length: 100 }),
	governorate: varchar({ length: 100 }),
	wilayat: varchar({ length: 100 }),
	areasOfSpecialization: text("areas_of_specialization"),
	professionalExperience: text("professional_experience"),
	relevantCertifications: text("relevant_certifications"),
	currentEmploymentStatus: varchar("current_employment_status", { length: 50 }),
	currentEmployer: varchar("current_employer", { length: 200 }),
	availability: varchar({ length: 50 }),
	preferredWorkArrangement: varchar("preferred_work_arrangement", { length: 50 }),
	preferredPaymentMethods: text("preferred_payment_methods"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "expert_profiles_user_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	token: varchar({ length: 1000 }).notNull(),
	tokenType: varchar("token_type", { length: 20 }).default('access').notNull(),
	jti: uuid(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "sessions_user_id_users_id_fk"
	}).onDelete("cascade"),
	unique("sessions_token_unique").on(table.token),
]);

export const legalAgreements = pgTable("legal_agreements", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	agreementName: varchar("agreement_name", { length: 255 }).notNull(),
	agreementVersion: varchar("agreement_version", { length: 50 }).default('1.0').notNull(),
	agreementContent: text("agreement_content").notNull(),
	ipAddress: inet("ip_address").notNull(),
	userAgent: varchar("user_agent", { length: 500 }),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "legal_agreements_user_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const serviceData = pgTable("service_data", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	data: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	assignedExpertId: uuid("assigned_expert_id"),
	serviceType: varchar("service_type", { length: 100 }),
	status: varchar({ length: 50 }).default('pending').notNull(),
	priority: varchar({ length: 20 }).default('normal'),
	title: varchar({ length: 255 }),
	description: text(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "service_data_user_id_users_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.assignedExpertId],
		foreignColumns: [users.id],
		name: "service_data_assigned_expert_id_users_id_fk"
	}).onDelete("set null"),
]);

export const learningProgress = pgTable("learning_progress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	moduleId: uuid("module_id").notNull(),
	materialId: uuid("material_id"),
	isCompleted: boolean("is_completed").default(false).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	lastAccessed: timestamp("last_accessed", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.moduleId],
		foreignColumns: [learningModules.id],
		name: "learning_progress_module_id_learning_modules_id_fk"
	}),
	foreignKey({
		columns: [table.materialId],
		foreignColumns: [moduleMaterials.id],
		name: "learning_progress_material_id_module_materials_id_fk"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "learning_progress_user_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const moduleMaterials = pgTable("module_materials", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	moduleId: uuid("module_id").notNull(),
	materialType: varchar("material_type", { length: 20 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	materialData: jsonb("material_data").notNull(),
	orderIndex: integer("order_index").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.moduleId],
		foreignColumns: [learningModules.id],
		name: "module_materials_module_id_learning_modules_id_fk"
	}).onDelete("cascade"),
]);

export const learningModules = pgTable("learning_modules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdBy: uuid("created_by"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 100 }).notNull(),
	orderIndex: integer("order_index").notNull(),
	isPublished: boolean("is_published").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	targetAudience: varchar("target_audience", { length: 10 }).default('customer').notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	archivedAt: timestamp("archived_at", { mode: 'string' }),
	archivedBy: uuid("archived_by"),
}, (table) => [
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "learning_modules_created_by_users_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.archivedBy],
		foreignColumns: [users.id],
		name: "learning_modules_archived_by_users_id_fk"
	}).onDelete("set null"),
]);

export const quizzes = pgTable("quizzes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdBy: uuid("created_by"),
	templateId: uuid("template_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	language: varchar({ length: 2 }).notNull(),
	timeLimitMinutes: integer("time_limit_minutes").notNull(),
	maxAttempts: integer("max_attempts").notNull(),
	isPublished: boolean("is_published").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	targetAudience: varchar("target_audience", { length: 10 }).default('customer').notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	archivedAt: timestamp("archived_at", { mode: 'string' }),
	archivedBy: uuid("archived_by"),
}, (table) => [
	foreignKey({
		columns: [table.templateId],
		foreignColumns: [quizTemplates.id],
		name: "quizzes_template_id_quiz_templates_id_fk"
	}),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "quizzes_created_by_users_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.archivedBy],
		foreignColumns: [users.id],
		name: "quizzes_archived_by_users_id_fk"
	}).onDelete("set null"),
]);

export const quizAttempts = pgTable("quiz_attempts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	quizId: uuid("quiz_id").notNull(),
	answers: jsonb().notNull(),
	score: integer().notNull(),
	timeTakenSeconds: integer("time_taken_seconds").notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
		columns: [table.quizId],
		foreignColumns: [quizzes.id],
		name: "quiz_attempts_quiz_id_quizzes_id_fk"
	}),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "quiz_attempts_user_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const quizQuestions = pgTable("quiz_questions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quizId: uuid("quiz_id").notNull(),
	questionType: varchar("question_type", { length: 20 }).notNull(),
	questionData: jsonb("question_data").notNull(),
	correctAnswers: jsonb("correct_answers").notNull(),
	orderIndex: integer("order_index").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.quizId],
		foreignColumns: [quizzes.id],
		name: "quiz_questions_quiz_id_quizzes_id_fk"
	}).onDelete("cascade"),
]);

export const quizTemplates = pgTable("quiz_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdBy: uuid("created_by"),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	templateConfig: jsonb("template_config").notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "quiz_templates_created_by_users_id_fk"
	}).onDelete("set null"),
]);

export const awarenessSessionRequests = pgTable("awareness_session_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	requesterId: uuid("requester_id").notNull(),
	sessionDate: timestamp("session_date", { mode: 'string' }).notNull(),
	location: varchar({ length: 500 }).notNull(),
	duration: varchar({ length: 50 }).notNull(),
	subject: varchar({ length: 500 }).notNull(),
	audienceSize: integer("audience_size").notNull(),
	audienceTypes: varchar("audience_types", { length: 200 }).notNull(),
	sessionMode: varchar("session_mode", { length: 20 }).notNull(),
	specialRequirements: text("special_requirements"),
	organizationName: varchar("organization_name", { length: 200 }).notNull(),
	contactEmail: varchar("contact_email", { length: 255 }).notNull(),
	contactPhone: varchar("contact_phone", { length: 50 }).notNull(),
	status: varchar({ length: 50 }).notNull(),
	assignedExpertId: uuid("assigned_expert_id"),
	adminNotes: text("admin_notes"),
	expertNotes: text("expert_notes"),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
}, (table) => [
	index("awareness_session_requests_assigned_expert_id_idx").using("btree", table.assignedExpertId.asc().nullsLast().op("uuid_ops")),
	index("awareness_session_requests_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("awareness_session_requests_requester_id_idx").using("btree", table.requesterId.asc().nullsLast().op("uuid_ops")),
	index("awareness_session_requests_session_date_idx").using("btree", table.sessionDate.asc().nullsLast().op("timestamp_ops")),
	index("awareness_session_requests_status_created_at_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("awareness_session_requests_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.requesterId],
		foreignColumns: [users.id],
		name: "awareness_session_requests_requester_id_users_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.assignedExpertId],
		foreignColumns: [users.id],
		name: "awareness_session_requests_assigned_expert_id_users_id_fk"
	}).onDelete("set null"),
]);

export const awarenessSessionStatusHistory = pgTable("awareness_session_status_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionRequestId: uuid("session_request_id").notNull(),
	previousStatus: varchar("previous_status", { length: 50 }),
	newStatus: varchar("new_status", { length: 50 }).notNull(),
	changedBy: uuid("changed_by"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("awareness_session_status_history_changed_by_idx").using("btree", table.changedBy.asc().nullsLast().op("uuid_ops")),
	index("awareness_session_status_history_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("awareness_session_status_history_session_request_id_idx").using("btree", table.sessionRequestId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.changedBy],
		foreignColumns: [users.id],
		name: "awareness_session_status_history_changed_by_users_id_fk"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.sessionRequestId],
		foreignColumns: [awarenessSessionRequests.id],
		name: "fk_session_status_history_request_id"
	}),
]);

export const servicePricing = pgTable("service_pricing", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceType: varchar("service_type", { length: 100 }).notNull(),
	pricingType: varchar("pricing_type", { length: 20 }).notNull(),
	fixedPrice: numeric("fixed_price", { precision: 10, scale: 2 }),
	minPrice: numeric("min_price", { precision: 10, scale: 2 }),
	maxPrice: numeric("max_price", { precision: 10, scale: 2 }),
	currency: varchar({ length: 3 }).default('OMR').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
}, (table) => [
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [users.id],
		name: "service_pricing_created_by_users_id_fk"
	}).onDelete("set null"),
	unique("service_pricing_service_type_unique").on(table.serviceType),
]);

export const serviceQuotes = pgTable("service_quotes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceRequestId: uuid("service_request_id").notNull(),
	customerId: uuid("customer_id").notNull(),
	adminId: uuid("admin_id"),
	quoteNumber: varchar("quote_number", { length: 50 }).notNull(),
	quotedPrice: numeric("quoted_price", { precision: 10, scale: 2 }).notNull(),
	currency: varchar({ length: 3 }).default('OMR').notNull(),
	status: varchar({ length: 30 }).default('pending').notNull(),
	description: text(),
	validUntil: timestamp("valid_until", { mode: 'string' }),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	rejectedAt: timestamp("rejected_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.serviceRequestId],
		foreignColumns: [serviceData.id],
		name: "service_quotes_service_request_id_service_data_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.customerId],
		foreignColumns: [users.id],
		name: "service_quotes_customer_id_users_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.adminId],
		foreignColumns: [users.id],
		name: "service_quotes_admin_id_users_id_fk"
	}).onDelete("set null"),
	unique("service_quotes_quote_number_unique").on(table.quoteNumber),
]);

export const quoteNegotiations = pgTable("quote_negotiations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quoteId: uuid("quote_id").notNull(),
	serviceRequestId: uuid("service_request_id").notNull(),
	senderId: uuid("sender_id").notNull(),
	message: text().notNull(),
	isFromCustomer: boolean("is_from_customer").notNull(),
	currency: varchar({ length: 3 }).default('OMR').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.quoteId],
		foreignColumns: [serviceQuotes.id],
		name: "quote_negotiations_quote_id_service_quotes_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.serviceRequestId],
		foreignColumns: [serviceData.id],
		name: "quote_negotiations_service_request_id_service_data_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.senderId],
		foreignColumns: [users.id],
		name: "quote_negotiations_sender_id_users_id_fk"
	}).onDelete("cascade"),
]);

export const servicePayments = pgTable("service_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceRequestId: uuid("service_request_id").notNull(),
	customerId: uuid("customer_id").notNull(),
	quoteId: uuid("quote_id"),
	amount: numeric({ precision: 10, scale: 2 }).notNull(),
	currency: varchar({ length: 3 }).default('OMR').notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }),
	transactionId: varchar("transaction_id", { length: 100 }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
		columns: [table.serviceRequestId],
		foreignColumns: [serviceData.id],
		name: "service_payments_service_request_id_service_data_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.customerId],
		foreignColumns: [users.id],
		name: "service_payments_customer_id_users_id_fk"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.quoteId],
		foreignColumns: [serviceQuotes.id],
		name: "service_payments_quote_id_service_quotes_id_fk"
	}),
]);
