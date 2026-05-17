-- Migration: Add dedicated footer color controls to landing_pages

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS footer_bg_color VARCHAR(50) NOT NULL DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS footer_text_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS footer_link_bg_color VARCHAR(50) NOT NULL DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS footer_link_text_color VARCHAR(50) NOT NULL DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS footer_border_color VARCHAR(50) NOT NULL DEFAULT '#1f2937';

UPDATE landing_pages
SET footer_bg_color = COALESCE(NULLIF(background_color, ''), footer_bg_color),
    footer_text_color = COALESCE(NULLIF(secondary_color, ''), footer_text_color),
    footer_link_bg_color = COALESCE(NULLIF(primary_color, ''), footer_link_bg_color)
WHERE footer_bg_color = '#111827';

-- Verify
-- SELECT id, title, footer_bg_color, footer_text_color, footer_link_bg_color FROM landing_pages;
