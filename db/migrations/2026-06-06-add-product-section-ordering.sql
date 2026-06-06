CREATE TABLE IF NOT EXISTS product_section_orders (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(80) NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_section_orders_section_product_unique UNIQUE (section_key, product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_section_orders_section_order
  ON product_section_orders (section_key, display_order, product_id);
