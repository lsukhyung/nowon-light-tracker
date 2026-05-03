-- Add 행공퍼센트 (haengong percentage) column to training_records table
-- This field tracks the percentage completion of 행공 training

ALTER TABLE training_records
ADD COLUMN IF NOT EXISTS 행공퍼센트 INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN training_records.행공퍼센트 IS '행공 완성도 (%, 10% 단위)';
