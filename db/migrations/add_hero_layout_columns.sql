-- Migration: Add hero_layout and show_hero_price columns to landing_pages table
-- Date: 2026-05-04
-- Description: 
--   hero_layout: Controls whether the hero section shows image first or title first
--                Values: 'image-first' (default, used by Elegant) or 'title-first' (used by FreeOffer)
--   show_hero_price: Toggle to show/hide the price preview in the hero section (Elegant template)

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS hero_layout VARCHAR(20) DEFAULT 'image-first';

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS show_hero_price BOOLEAN DEFAULT true;

-- Verify
-- SELECT id, title, template, hero_layout, show_hero_price FROM landing_pages;
