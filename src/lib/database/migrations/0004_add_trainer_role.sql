-- Migration: Add trainer role support
-- This migration adds support for the trainer role and trainer resources

-- Add trainer-related fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trainer boolean DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promoted_to_trainer_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promoted_to_trainer_by uuid;

-- Add foreign key constraint for promoted_to_trainer_by
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_promoted_to_trainer_by_users_id_fk
  FOREIGN KEY (promoted_to_trainer_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create trainer_resources table
CREATE TABLE IF NOT EXISTS trainer_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  description text,
  resource_type varchar(50) NOT NULL,
  content_url varchar(500),
  content_data jsonb,
  thumbnail_url varchar(500),
  category varchar(100),
  tags jsonb,
  is_published boolean DEFAULT false NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  CONSTRAINT trainer_resources_created_by_users_id_fk
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS trainer_resources_created_by_idx ON trainer_resources(created_by);
CREATE INDEX IF NOT EXISTS trainer_resources_category_idx ON trainer_resources(category);
CREATE INDEX IF NOT EXISTS trainer_resources_is_published_idx ON trainer_resources(is_published);
CREATE INDEX IF NOT EXISTS trainer_resources_resource_type_idx ON trainer_resources(resource_type);
CREATE INDEX IF NOT EXISTS users_is_trainer_idx ON users(is_trainer);
