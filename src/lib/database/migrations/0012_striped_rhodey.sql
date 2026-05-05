ALTER TABLE "customer_profiles" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "expert_profiles" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "expert_profiles" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "service_data" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "service_data" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
CREATE INDEX "customer_profiles_deleted_at_idx" ON "customer_profiles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "expert_profiles_deleted_at_idx" ON "expert_profiles" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "service_data_deleted_at_idx" ON "service_data" USING btree ("deleted_at");