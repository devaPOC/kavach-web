CREATE TABLE "super_admin_otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"super_admin_id" uuid NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "super_admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"super_admin_id" uuid NOT NULL,
	"token" varchar(500) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "super_admin_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "super_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "super_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "super_admin_otp_codes" ADD CONSTRAINT "super_admin_otp_codes_super_admin_id_super_admins_id_fk" FOREIGN KEY ("super_admin_id") REFERENCES "public"."super_admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "super_admin_sessions" ADD CONSTRAINT "super_admin_sessions_super_admin_id_super_admins_id_fk" FOREIGN KEY ("super_admin_id") REFERENCES "public"."super_admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "super_admin_otp_codes_super_admin_id_idx" ON "super_admin_otp_codes" USING btree ("super_admin_id");--> statement-breakpoint
CREATE INDEX "super_admin_otp_codes_expires_at_idx" ON "super_admin_otp_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "super_admin_sessions_super_admin_id_idx" ON "super_admin_sessions" USING btree ("super_admin_id");--> statement-breakpoint
CREATE INDEX "super_admin_sessions_token_idx" ON "super_admin_sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "super_admin_sessions_expires_at_idx" ON "super_admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "super_admins_email_idx" ON "super_admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX "super_admins_is_active_idx" ON "super_admins" USING btree ("is_active");