-- Migration: Add template column to landing_pages table
-- Date: 2026-02-27
-- Description: Adds a 'template' column to support multiple landing page designs (classic, elegant)

-- Add template column with default 'classic' for existing rows
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS template VARCHAR(50) NOT NULL DEFAULT 'classic';

-- Verify
-- SELECT id, title, template FROM landing_pages;
