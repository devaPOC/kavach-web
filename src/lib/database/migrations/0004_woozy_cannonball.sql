CREATE TABLE "trainer_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"resource_type" varchar(50) NOT NULL,
	"content_url" varchar(500),
	"content_data" jsonb,
	"thumbnail_url" varchar(500),
	"category" varchar(100),
	"tags" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_trainer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "promoted_to_trainer_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "promoted_to_trainer_by" uuid;--> statement-breakpoint
ALTER TABLE "trainer_resources" ADD CONSTRAINT "trainer_resources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;