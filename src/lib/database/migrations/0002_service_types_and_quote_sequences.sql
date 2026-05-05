-- Create service_types table
-- This table stores all available service types in the system
-- This eliminates the circular dependency of backend importing from frontend
CREATE TABLE IF NOT EXISTS "service_types" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL UNIQUE,
  "category" varchar(100) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--> statement-breakpoint

-- Create quote_number_sequence table
-- This table tracks the next quote number to generate for each day
-- Using a database-backed sequence ensures atomic increment and prevents race conditions
CREATE TABLE IF NOT EXISTS "quote_number_sequence" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "sequence_date" varchar(10) NOT NULL UNIQUE,
  "next_sequence_number" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--> statement-breakpoint

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_service_types_active" ON "service_types"("is_active");
CREATE INDEX IF NOT EXISTS "idx_service_types_category" ON "service_types"("category");
CREATE INDEX IF NOT EXISTS "idx_quote_number_sequence_date" ON "quote_number_sequence"("sequence_date");
