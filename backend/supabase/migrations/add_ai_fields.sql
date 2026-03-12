-- Migration: Add AI analysis fields to aircraft_positions table
-- Run this in Supabase SQL Editor to update existing databases

-- Add AI analysis fields to aircraft_positions table
ALTER TABLE aircraft_positions 
ADD COLUMN IF NOT EXISTS ai_threat_level TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_tags TEXT[];

-- Create indexes for AI fields for better query performance
CREATE INDEX IF NOT EXISTS aircraft_positions_ai_threat_level_idx 
ON aircraft_positions (ai_threat_level) 
WHERE ai_threat_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS aircraft_positions_ai_tags_idx 
ON aircraft_positions USING GIN (ai_tags) 
WHERE ai_tags IS NOT NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN aircraft_positions.ai_threat_level IS 'AI-generated threat level (low/medium/high)';
COMMENT ON COLUMN aircraft_positions.ai_summary IS 'AI-generated analysis summary';
COMMENT ON COLUMN aircraft_positions.ai_tags IS 'Array of AI-generated tags for threat classification';

-- Verify the migration worked
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'aircraft_positions' 
    AND column_name LIKE 'ai_%'
ORDER BY column_name;
