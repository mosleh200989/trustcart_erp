-- Migration: Add agent_tier column to users table
-- Three tiers for sales agents: silver, gold, platinum
-- Default tier is 'silver'

ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_tier VARCHAR(20) DEFAULT 'silver';

-- Set existing agents to 'silver' if NULL
UPDATE users SET agent_tier = 'silver' WHERE agent_tier IS NULL;
