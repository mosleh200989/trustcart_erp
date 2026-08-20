-- Migration: Add landing page tracking fields to incomplete_orders table
-- Date: 2026-02-19
-- Purpose: Track incomplete orders from landing pages with full context

-- Add new columns for landing page tracking
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS landing_page_id INT;
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS landing_page_slug VARCHAR(255);
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS landing_page_title VARCHAR(500);
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS delivery_zone VARCHAR(20);
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10, 2);
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE incomplete_orders ADD COLUMN IF NOT EXISTS converted_to_order BOOLEAN DEFAULT false;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_incomplete_source ON incomplete_orders(source);
CREATE INDEX IF NOT EXISTS idx_incomplete_landing_page_id ON incomplete_orders(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_incomplete_landing_page_slug ON incomplete_orders(landing_page_slug);
CREATE INDEX IF NOT EXISTS idx_incomplete_converted ON incomplete_orders(converted_to_order);
CREATE INDEX IF NOT EXISTS idx_incomplete_phone ON incomplete_orders(phone);
