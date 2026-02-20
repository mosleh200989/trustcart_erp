-- Add contacted_done column to incomplete_orders table
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS contacted_done BOOLEAN DEFAULT false;
