import { relations } from "drizzle-orm/relations";
import {
  users,
  expertProfiles,
  customerProfiles,
  emailVerifications,
  sessions,
  legalAgreements,
  serviceData,

  quizzes,
  quizQuestions,
  quizAttempts,
  quizTemplates,
  learningModules,
  moduleMaterials,
  learningProgress,
  awarenessSessionRequests,
  awarenessSessionStatusHistory
} from "./index";

export const expertProfilesRelations = relations(expertProfiles, ({ one }) => ({
  user: one(users, {
    fields: [expertProfiles.userId],
    references: [users.id]
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  expertProfiles: many(expertProfiles),
  customerProfiles: many(customerProfiles),
  emailVerifications: many(emailVerifications),
  sessions: many(sessions),
  legalAgreements: many(legalAgreements),
  serviceData_userId: many(serviceData, {
    relationName: "serviceData_userId_users_id"
  }),
  serviceData_assignedExpertId: many(serviceData, {
    relationName: "serviceData_assignedExpertId_users_id"
  }),


  // Awareness Lab relations
  quizzes: many(quizzes),
  quizAttempts: many(quizAttempts),
  quizTemplates: many(quizTemplates),
  learningModules: many(learningModules),
  learningProgress: many(learningProgress),
  // Awareness Session relations
  awarenessSessionRequests_requester: many(awarenessSessionRequests, {
    relationName: "awarenessSessionRequests_requesterId_users_id"
  }),
  awarenessSessionRequests_assignedExpert: many(awarenessSessionRequests, {
    relationName: "awarenessSessionRequests_assignedExpertId_users_id"
  }),
  awarenessSessionStatusHistory: many(awarenessSessionStatusHistory),
}));

export const customerProfilesRelations = relations(customerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [customerProfiles.userId],
    references: [users.id]
  }),
}));

export const emailVerificationsRelations = relations(emailVerifications, ({ one }) => ({
  user: one(users, {
    fields: [emailVerifications.userId],
    references: [users.id]
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  }),
}));

export const legalAgreementsRelations = relations(legalAgreements, ({ one }) => ({
  user: one(users, {
    fields: [legalAgreements.userId],
    references: [users.id]
  }),
}));

export const serviceDataRelations = relations(serviceData, ({ one, many }) => ({
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

}));

// Awareness Lab Relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [quizzes.createdBy],
    references: [users.id]
  }),
  template: one(quizTemplates, {
    fields: [quizzes.templateId],
    references: [quizTemplates.id]
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id]
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id]
  }),
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id]
  }),
}));

export const quizTemplatesRelations = relations(quizTemplates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [quizTemplates.createdBy],
    references: [users.id]
  }),
  quizzes: many(quizzes),
}));

export const learningModulesRelations = relations(learningModules, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [learningModules.createdBy],
    references: [users.id]
  }),
  materials: many(moduleMaterials),
  progress: many(learningProgress),
}));

export const moduleMaterialsRelations = relations(moduleMaterials, ({ one, many }) => ({
  module: one(learningModules, {
    fields: [moduleMaterials.moduleId],
    references: [learningModules.id]
  }),
  progress: many(learningProgress),
}));

export const learningProgressRelations = relations(learningProgress, ({ one }) => ({
  user: one(users, {
    fields: [learningProgress.userId],
    references: [users.id]
  }),
  module: one(learningModules, {
    fields: [learningProgress.moduleId],
    references: [learningModules.id]
  }),
  material: one(moduleMaterials, {
    fields: [learningProgress.materialId],
    references: [moduleMaterials.id]
  }),
}));



// Awareness Session Relations
export const awarenessSessionRequestsRelations = relations(awarenessSessionRequests, ({ one, many }) => ({
  requester: one(users, {
    fields: [awarenessSessionRequests.requesterId],
    references: [users.id],
    relationName: "awarenessSessionRequests_requesterId_users_id"
  }),
  assignedExpert: one(users, {
    fields: [awarenessSessionRequests.assignedExpertId],
    references: [users.id],
    relationName: "awarenessSessionRequests_assignedExpertId_users_id"
  }),
  statusHistory: many(awarenessSessionStatusHistory),
}));

export const awarenessSessionStatusHistoryRelations = relations(awarenessSessionStatusHistory, ({ one }) => ({
  sessionRequest: one(awarenessSessionRequests, {
    fields: [awarenessSessionStatusHistory.sessionRequestId],
    references: [awarenessSessionRequests.id]
  }),
  changedBy: one(users, {
    fields: [awarenessSessionStatusHistory.changedBy],
    references: [users.id]
  }),
}));
