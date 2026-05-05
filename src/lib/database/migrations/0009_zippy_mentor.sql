CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" varchar(100) NOT NULL,
	"category" varchar(50),
	"severity" varchar(20) DEFAULT 'medium',
	"user_id" uuid,
	"user_email" varchar(255),
	"user_role" varchar(50),
	"ip_address" "inet",
	"user_agent" varchar(500),
	"request_id" uuid,
	"correlation_id" uuid,
	"resource" varchar(100),
	"action" varchar(100),
	"success" boolean,
	"error_code" varchar(50),
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_event_idx" ON "audit_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "audit_logs_category_idx" ON "audit_logs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_user_event_idx" ON "audit_logs" USING btree ("user_id","event");--> statement-breakpoint
CREATE INDEX "audit_logs_category_created_idx" ON "audit_logs" USING btree ("category","created_at");