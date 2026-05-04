-- Migration: Add cross_sell_product column to landing_pages table
-- Date: 2026-05-04
-- Description: Adds a JSONB column to store a single cross-sell/add-on product suggestion
--              that appears with a checkbox on the landing page order form.
-- JSON shape: { name, description, image_url, price, compare_price, product_id, badge_text, suggestion_text }

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS cross_sell_product JSONB DEFAULT NULL;

-- Verify
-- SELECT id, title, cross_sell_product FROM landing_pages;
