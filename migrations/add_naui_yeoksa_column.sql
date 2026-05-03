-- Add 나의역사 column to training_records table
-- This field tracks whether the user completed '나의 역사' practice

ALTER TABLE training_records
ADD COLUMN IF NOT EXISTS 나의역사 BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN training_records.나의역사 IS '나의 역사 수련 여부';
