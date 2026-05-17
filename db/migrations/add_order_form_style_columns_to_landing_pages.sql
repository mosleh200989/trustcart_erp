-- Migration: Add dedicated order form color controls to landing_pages
-- Keeps order form typography/accent colors independent from page primary color.

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS order_form_bg_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS order_form_card_bg_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS order_form_title_color VARCHAR(50) NOT NULL DEFAULT '#1f2937',
  ADD COLUMN IF NOT EXISTS order_form_text_color VARCHAR(50) NOT NULL DEFAULT '#374151',
  ADD COLUMN IF NOT EXISTS order_form_accent_color VARCHAR(50) NOT NULL DEFAULT '#2d6a4f',
  ADD COLUMN IF NOT EXISTS order_form_border_color VARCHAR(50) NOT NULL DEFAULT '#e5e7eb';

UPDATE landing_pages
SET order_form_accent_color = primary_color
WHERE order_form_accent_color = '#2d6a4f'
  AND primary_color IS NOT NULL;

-- Verify
-- SELECT id, title, order_form_bg_color, order_form_title_color, order_form_text_color, order_form_accent_color FROM landing_pages;
