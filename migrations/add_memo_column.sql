-- Add memo column to training_records table
-- This field allows users to add notes/comments to their training records

ALTER TABLE training_records
ADD COLUMN IF NOT EXISTS memo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN training_records.memo IS '수련 기록 메모';
