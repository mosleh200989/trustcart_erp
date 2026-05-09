-- Add button style columns to landing_pages table
-- Run on all three databases: trustcart_erp, natural_glowra, chinova_db

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS btn_bg_color VARCHAR(50) NOT NULL DEFAULT '#2d6a4f',
  ADD COLUMN IF NOT EXISTS btn_text_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS btn_border_color VARCHAR(50) NOT NULL DEFAULT 'transparent',
  ADD COLUMN IF NOT EXISTS btn_border_radius INTEGER NOT NULL DEFAULT 16;
