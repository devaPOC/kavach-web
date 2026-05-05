-- Migration: Add file upload fields to trainer_resources table
-- This migration adds columns to support direct file uploads to R2 storage
-- AND fixes the foreign key to reference admins table instead of users table

-- Step 1: Add new file columns
ALTER TABLE trainer_resources
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS r2_key VARCHAR(500);

-- Step 2: Drop the old foreign key constraint (referencing users table)
ALTER TABLE trainer_resources
DROP CONSTRAINT IF EXISTS trainer_resources_created_by_users_id_fk;

-- Step 3: Add new foreign key constraint (referencing admins table)
ALTER TABLE trainer_resources
ADD CONSTRAINT trainer_resources_created_by_admins_id_fk
FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN trainer_resources.file_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN trainer_resources.file_size IS 'File size in bytes';
COMMENT ON COLUMN trainer_resources.file_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN trainer_resources.r2_key IS 'Storage key in Cloudflare R2';
COMMENT ON COLUMN trainer_resources.created_by IS 'References admins table';
