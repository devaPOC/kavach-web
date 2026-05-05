ALTER TABLE "awareness_session_status_history" DROP CONSTRAINT "awareness_session_status_history_changed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "quote_negotiations" DROP CONSTRAINT "quote_negotiations_sender_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "service_quotes" DROP CONSTRAINT "service_quotes_admin_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "awareness_session_status_history" ADD CONSTRAINT "awareness_session_status_history_changed_by_admins_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;