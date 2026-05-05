import { relations } from "drizzle-orm/relations";
import { users, customerProfiles, emailVerifications, expertProfiles, sessions, legalAgreements, serviceData, learningModules, learningProgress, moduleMaterials, quizTemplates, quizzes, quizAttempts, quizQuestions, awarenessSessionRequests, awarenessSessionStatusHistory, servicePricing, serviceQuotes, quoteNegotiations, servicePayments } from "./schema";

export const customerProfilesRelations = relations(customerProfiles, ({one}) => ({
	user: one(users, {
		fields: [customerProfiles.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	customerProfiles: many(customerProfiles),
	emailVerifications: many(emailVerifications),
	expertProfiles: many(expertProfiles),
	sessions: many(sessions),
	legalAgreements: many(legalAgreements),
	serviceData_userId: many(serviceData, {
		relationName: "serviceData_userId_users_id"
	}),
	serviceData_assignedExpertId: many(serviceData, {
		relationName: "serviceData_assignedExpertId_users_id"
	}),
	learningProgresses: many(learningProgress),
	learningModules_createdBy: many(learningModules, {
		relationName: "learningModules_createdBy_users_id"
	}),
	learningModules_archivedBy: many(learningModules, {
		relationName: "learningModules_archivedBy_users_id"
	}),
	quizzes_createdBy: many(quizzes, {
		relationName: "quizzes_createdBy_users_id"
	}),
	quizzes_archivedBy: many(quizzes, {
		relationName: "quizzes_archivedBy_users_id"
	}),
	quizAttempts: many(quizAttempts),
	quizTemplates: many(quizTemplates),
	awarenessSessionRequests_requesterId: many(awarenessSessionRequests, {
		relationName: "awarenessSessionRequests_requesterId_users_id"
	}),
	awarenessSessionRequests_assignedExpertId: many(awarenessSessionRequests, {
		relationName: "awarenessSessionRequests_assignedExpertId_users_id"
	}),
	awarenessSessionStatusHistories: many(awarenessSessionStatusHistory),
	servicePricings: many(servicePricing),
	serviceQuotes_customerId: many(serviceQuotes, {
		relationName: "serviceQuotes_customerId_users_id"
	}),
	serviceQuotes_adminId: many(serviceQuotes, {
		relationName: "serviceQuotes_adminId_users_id"
	}),
	quoteNegotiations: many(quoteNegotiations),
	servicePayments: many(servicePayments),
}));

export const emailVerificationsRelations = relations(emailVerifications, ({one}) => ({
	user: one(users, {
		fields: [emailVerifications.userId],
		references: [users.id]
	}),
}));

export const expertProfilesRelations = relations(expertProfiles, ({one}) => ({
	user: one(users, {
		fields: [expertProfiles.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const legalAgreementsRelations = relations(legalAgreements, ({one}) => ({
	user: one(users, {
		fields: [legalAgreements.userId],
		references: [users.id]
	}),
}));

export const serviceDataRelations = relations(serviceData, ({one, many}) => ({
	user_userId: one(users, {
		fields: [serviceData.userId],
		references: [users.id],
		relationName: "serviceData_userId_users_id"
	}),
	user_assignedExpertId: one(users, {
		fields: [serviceData.assignedExpertId],
		references: [users.id],
		relationName: "serviceData_assignedExpertId_users_id"
	}),
	serviceQuotes: many(serviceQuotes),
	quoteNegotiations: many(quoteNegotiations),
	servicePayments: many(servicePayments),
}));

export const learningProgressRelations = relations(learningProgress, ({one}) => ({
	learningModule: one(learningModules, {
		fields: [learningProgress.moduleId],
		references: [learningModules.id]
	}),
	moduleMaterial: one(moduleMaterials, {
		fields: [learningProgress.materialId],
		references: [moduleMaterials.id]
	}),
	user: one(users, {
		fields: [learningProgress.userId],
		references: [users.id]
	}),
}));

export const learningModulesRelations = relations(learningModules, ({one, many}) => ({
	learningProgresses: many(learningProgress),
	moduleMaterials: many(moduleMaterials),
	user_createdBy: one(users, {
		fields: [learningModules.createdBy],
		references: [users.id],
		relationName: "learningModules_createdBy_users_id"
	}),
	user_archivedBy: one(users, {
		fields: [learningModules.archivedBy],
		references: [users.id],
		relationName: "learningModules_archivedBy_users_id"
	}),
}));

export const moduleMaterialsRelations = relations(moduleMaterials, ({one, many}) => ({
	learningProgresses: many(learningProgress),
	learningModule: one(learningModules, {
		fields: [moduleMaterials.moduleId],
		references: [learningModules.id]
	}),
}));

export const quizzesRelations = relations(quizzes, ({one, many}) => ({
	quizTemplate: one(quizTemplates, {
		fields: [quizzes.templateId],
		references: [quizTemplates.id]
	}),
	user_createdBy: one(users, {
		fields: [quizzes.createdBy],
		references: [users.id],
		relationName: "quizzes_createdBy_users_id"
	}),
	user_archivedBy: one(users, {
		fields: [quizzes.archivedBy],
		references: [users.id],
		relationName: "quizzes_archivedBy_users_id"
	}),
	quizAttempts: many(quizAttempts),
	quizQuestions: many(quizQuestions),
}));

export const quizTemplatesRelations = relations(quizTemplates, ({one, many}) => ({
	quizzes: many(quizzes),
	user: one(users, {
		fields: [quizTemplates.createdBy],
		references: [users.id]
	}),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({one}) => ({
	quiz: one(quizzes, {
		fields: [quizAttempts.quizId],
		references: [quizzes.id]
	}),
	user: one(users, {
		fields: [quizAttempts.userId],
		references: [users.id]
	}),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({one}) => ({
	quiz: one(quizzes, {
		fields: [quizQuestions.quizId],
		references: [quizzes.id]
	}),
}));

export const awarenessSessionRequestsRelations = relations(awarenessSessionRequests, ({one, many}) => ({
	user_requesterId: one(users, {
		fields: [awarenessSessionRequests.requesterId],
		references: [users.id],
		relationName: "awarenessSessionRequests_requesterId_users_id"
	}),
	user_assignedExpertId: one(users, {
		fields: [awarenessSessionRequests.assignedExpertId],
		references: [users.id],
		relationName: "awarenessSessionRequests_assignedExpertId_users_id"
	}),
	awarenessSessionStatusHistories: many(awarenessSessionStatusHistory),
}));

export const awarenessSessionStatusHistoryRelations = relations(awarenessSessionStatusHistory, ({one}) => ({
	user: one(users, {
		fields: [awarenessSessionStatusHistory.changedBy],
		references: [users.id]
	}),
	awarenessSessionRequest: one(awarenessSessionRequests, {
		fields: [awarenessSessionStatusHistory.sessionRequestId],
		references: [awarenessSessionRequests.id]
	}),
}));

export const servicePricingRelations = relations(servicePricing, ({one}) => ({
	user: one(users, {
		fields: [servicePricing.createdBy],
		references: [users.id]
	}),
}));

export const serviceQuotesRelations = relations(serviceQuotes, ({one, many}) => ({
	serviceDatum: one(serviceData, {
		fields: [serviceQuotes.serviceRequestId],
		references: [serviceData.id]
	}),
	user_customerId: one(users, {
		fields: [serviceQuotes.customerId],
		references: [users.id],
		relationName: "serviceQuotes_customerId_users_id"
	}),
	user_adminId: one(users, {
		fields: [serviceQuotes.adminId],
		references: [users.id],
		relationName: "serviceQuotes_adminId_users_id"
	}),
	quoteNegotiations: many(quoteNegotiations),
	servicePayments: many(servicePayments),
}));

export const quoteNegotiationsRelations = relations(quoteNegotiations, ({one}) => ({
	serviceQuote: one(serviceQuotes, {
		fields: [quoteNegotiations.quoteId],
		references: [serviceQuotes.id]
	}),
	serviceDatum: one(serviceData, {
		fields: [quoteNegotiations.serviceRequestId],
		references: [serviceData.id]
	}),
	user: one(users, {
		fields: [quoteNegotiations.senderId],
		references: [users.id]
	}),
}));

export const servicePaymentsRelations = relations(servicePayments, ({one}) => ({
	serviceDatum: one(serviceData, {
		fields: [servicePayments.serviceRequestId],
		references: [serviceData.id]
	}),
	user: one(users, {
		fields: [servicePayments.customerId],
		references: [users.id]
	}),
	serviceQuote: one(serviceQuotes, {
		fields: [servicePayments.quoteId],
		references: [serviceQuotes.id]
	}),
}));