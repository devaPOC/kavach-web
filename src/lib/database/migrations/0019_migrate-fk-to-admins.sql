ALTER TABLE "service_pricing" DROP CONSTRAINT "service_pricing_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_pricing" DROP CONSTRAINT "service_pricing_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "quiz_templates" DROP CONSTRAINT "quiz_templates_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_archived_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "learning_modules" DROP CONSTRAINT "learning_modules_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "learning_modules" DROP CONSTRAINT "learning_modules_archived_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_templates" ADD CONSTRAINT "quiz_templates_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_archived_by_admins_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_archived_by_admins_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;