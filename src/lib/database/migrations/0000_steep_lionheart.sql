CREATE TABLE "archived_service_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_expert_id" uuid,
	"service_type" varchar(100),
	"status" varchar(50) NOT NULL,
	"priority" varchar(20),
	"title" varchar(255),
	"description" text,
	"data" jsonb NOT NULL,
	"assigned_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"archived_at" timestamp DEFAULT now() NOT NULL,
	"archive_reason" varchar(100) NOT NULL,
	"customer_name" varchar(255),
	"customer_email" varchar(255),
	"expert_name" varchar(255),
	"expert_email" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "awareness_session_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"session_date" timestamp NOT NULL,
	"location" varchar(500) NOT NULL,
	"duration" varchar(50) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"audience_size" integer NOT NULL,
	"audience_types" varchar(200) NOT NULL,
	"session_mode" varchar(20) NOT NULL,
	"special_requirements" text,
	"organization_name" varchar(200) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"assigned_expert_id" uuid,
	"admin_notes" text,
	"expert_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "awareness_session_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_request_id" uuid NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"changed_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone_number" varchar(20),
	"date_of_birth" date,
	"gender" varchar(20),
	"nationality" varchar(100),
	"country_of_residence" varchar(100),
	"governorate" varchar(100),
	"wilayat" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(512) NOT NULL,
	"type" varchar(20) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verifications_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "expert_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone_number" varchar(20),
	"date_of_birth" date,
	"gender" varchar(20),
	"nationality" varchar(100),
	"country_of_residence" varchar(100),
	"governorate" varchar(100),
	"wilayat" varchar(100),
	"areas_of_specialization" text,
	"professional_experience" text,
	"relevant_certifications" text,
	"current_employment_status" varchar(50),
	"current_employer" varchar(200),
	"availability" varchar(50),
	"preferred_work_arrangement" varchar(50),
	"preferred_payment_methods" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"is_profile_completed" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT true NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp,
	"paused_at" timestamp,
	"approved_at" timestamp,
	"locked_at" timestamp,
	"lock_reason" varchar(255),
	"password_reset_token" varchar(255),
	"password_reset_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(1000) NOT NULL,
	"token_type" varchar(20) DEFAULT 'access' NOT NULL,
	"jti" uuid,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "legal_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agreement_name" varchar(255) NOT NULL,
	"agreement_version" varchar(50) DEFAULT '1.0' NOT NULL,
	"agreement_content" text NOT NULL,
	"ip_address" "inet" NOT NULL,
	"user_agent" varchar(500),
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_expert_id" uuid,
	"service_type" varchar(100),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"title" varchar(255),
	"description" text,
	"data" jsonb NOT NULL,
	"assigned_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_type" varchar(100) NOT NULL,
	"pricing_type" varchar(20) NOT NULL,
	"fixed_price" numeric(10, 2),
	"min_price" numeric(10, 2),
	"max_price" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'OMR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "service_pricing_service_type_unique" UNIQUE("service_type")
);
--> statement-breakpoint
CREATE TABLE "quote_negotiations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"service_request_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"message" text NOT NULL,
	"is_from_customer" boolean NOT NULL,
	"currency" varchar(3) DEFAULT 'OMR' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"quote_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'OMR' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(50),
	"transaction_id" varchar(100),
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"admin_id" uuid,
	"quote_number" varchar(50) NOT NULL,
	"quoted_price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'OMR' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"description" text,
	"valid_until" timestamp,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_quotes_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"time_taken_seconds" integer NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"question_type" varchar(20) NOT NULL,
	"question_data" jsonb NOT NULL,
	"correct_answers" jsonb NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"template_config" jsonb NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"template_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"language" varchar(2) NOT NULL,
	"target_audience" varchar(10) DEFAULT 'customer' NOT NULL,
	"time_limit_minutes" integer NOT NULL,
	"max_attempts" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"archived_by" uuid,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"target_audience" varchar(10) DEFAULT 'customer' NOT NULL,
	"order_index" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"archived_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	"material_id" uuid,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"last_accessed" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"material_type" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"material_data" jsonb NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "awareness_session_requests" ADD CONSTRAINT "awareness_session_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awareness_session_requests" ADD CONSTRAINT "awareness_session_requests_assigned_expert_id_users_id_fk" FOREIGN KEY ("assigned_expert_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awareness_session_status_history" ADD CONSTRAINT "awareness_session_status_history_session_request_id_awareness_session_requests_id_fk" FOREIGN KEY ("session_request_id") REFERENCES "public"."awareness_session_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awareness_session_status_history" ADD CONSTRAINT "awareness_session_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert_profiles" ADD CONSTRAINT "expert_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_agreements" ADD CONSTRAINT "legal_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_data" ADD CONSTRAINT "service_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_data" ADD CONSTRAINT "service_data_assigned_expert_id_users_id_fk" FOREIGN KEY ("assigned_expert_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_pricing" ADD CONSTRAINT "service_pricing_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_negotiations" ADD CONSTRAINT "quote_negotiations_quote_id_service_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."service_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_negotiations" ADD CONSTRAINT "quote_negotiations_service_request_id_service_data_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_data"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_negotiations" ADD CONSTRAINT "quote_negotiations_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_service_request_id_service_data_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_data"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_quote_id_service_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."service_quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_service_request_id_service_data_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_data"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_quotes" ADD CONSTRAINT "service_quotes_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_templates" ADD CONSTRAINT "quiz_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_template_id_quiz_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."quiz_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress" ADD CONSTRAINT "learning_progress_material_id_module_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."module_materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_materials" ADD CONSTRAINT "module_materials_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "awareness_session_requests_requester_id_idx" ON "awareness_session_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "awareness_session_requests_status_idx" ON "awareness_session_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "awareness_session_requests_assigned_expert_id_idx" ON "awareness_session_requests" USING btree ("assigned_expert_id");--> statement-breakpoint
CREATE INDEX "awareness_session_requests_session_date_idx" ON "awareness_session_requests" USING btree ("session_date");--> statement-breakpoint
CREATE INDEX "awareness_session_requests_created_at_idx" ON "awareness_session_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "awareness_session_requests_status_created_at_idx" ON "awareness_session_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "awareness_session_status_history_session_request_id_idx" ON "awareness_session_status_history" USING btree ("session_request_id");--> statement-breakpoint
CREATE INDEX "awareness_session_status_history_changed_by_idx" ON "awareness_session_status_history" USING btree ("changed_by");--> statement-breakpoint
CREATE INDEX "awareness_session_status_history_created_at_idx" ON "awareness_session_status_history" USING btree ("created_at");