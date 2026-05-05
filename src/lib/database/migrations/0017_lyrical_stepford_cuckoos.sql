ALTER TABLE "trainer_resources" DROP CONSTRAINT "trainer_resources_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "trainer_resources" ADD CONSTRAINT "trainer_resources_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;