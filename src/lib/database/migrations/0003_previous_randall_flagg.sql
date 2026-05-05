ALTER TABLE "service_pricing" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_pricing_is_active_idx" ON "service_pricing" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "service_pricing_service_type_idx" ON "service_pricing" USING btree ("service_type");