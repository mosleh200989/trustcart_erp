-- Adds richer combo setup support for the admin Combo Products page.
-- Existing combos remain compatible: old rows are treated as base-product combo items.

ALTER TABLE combo_deal_products
  ADD COLUMN IF NOT EXISTS id BIGSERIAL;

ALTER TABLE combo_deal_products
  ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS variant_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE combo_deal_products
  DROP CONSTRAINT IF EXISTS combo_deal_products_combo_deal_id_product_id_key;

ALTER TABLE combo_deal_products
  DROP CONSTRAINT IF EXISTS combo_deal_products_pkey;

ALTER TABLE combo_deal_products
  ALTER COLUMN id SET NOT NULL;

ALTER TABLE combo_deal_products
  ADD CONSTRAINT combo_deal_products_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_deal_products_combo_product_variant_unique
  ON combo_deal_products (combo_deal_id, product_id, COALESCE(variant_name, ''));

CREATE INDEX IF NOT EXISTS idx_combo_deal_products_combo_order
  ON combo_deal_products (combo_deal_id, display_order, id);

CREATE TABLE IF NOT EXISTS combo_deal_images (
  id SERIAL PRIMARY KEY,
  combo_deal_id INTEGER NOT NULL REFERENCES combo_deals(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_combo_deal_images_combo_id
  ON combo_deal_images (combo_deal_id);

CREATE INDEX IF NOT EXISTS idx_combo_deal_images_combo_order
  ON combo_deal_images (combo_deal_id, is_primary DESC, display_order ASC);
