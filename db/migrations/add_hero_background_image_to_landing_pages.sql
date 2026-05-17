-- Migration: Add optional hero background image for landing pages
-- Used by the Free Offer template hero section.

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS hero_background_image_url VARCHAR(500);

-- Verify
-- SELECT id, title, template, hero_background_image_url FROM landing_pages;
