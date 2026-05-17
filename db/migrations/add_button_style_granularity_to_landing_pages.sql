-- Migration: Add independent button style controls for order form and footer.
-- Section optional buttons store their style in the existing sections JSON.

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS order_form_button_bg_color VARCHAR(50) NOT NULL DEFAULT '#16a34a',
  ADD COLUMN IF NOT EXISTS order_form_button_text_color VARCHAR(50) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS order_form_button_border_color VARCHAR(50) NOT NULL DEFAULT 'transparent',
  ADD COLUMN IF NOT EXISTS order_form_button_border_radius INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS footer_link_border_color VARCHAR(50) NOT NULL DEFAULT 'transparent',
  ADD COLUMN IF NOT EXISTS footer_link_border_radius INTEGER NOT NULL DEFAULT 999;

UPDATE landing_pages
SET order_form_button_bg_color = COALESCE(NULLIF(btn_bg_color, ''), order_form_button_bg_color),
    order_form_button_text_color = COALESCE(NULLIF(btn_text_color, ''), order_form_button_text_color),
    order_form_button_border_color = COALESCE(NULLIF(btn_border_color, ''), order_form_button_border_color),
    order_form_button_border_radius = COALESCE(btn_border_radius, order_form_button_border_radius)
WHERE order_form_button_bg_color = '#16a34a';
