ALTER TABLE "admins" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trainer_resources" ADD COLUMN "file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "trainer_resources" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "trainer_resources" ADD COLUMN "file_type" varchar(100);--> statement-breakpoint
ALTER TABLE "trainer_resources" ADD COLUMN "r2_key" varchar(500);