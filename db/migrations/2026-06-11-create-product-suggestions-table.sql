-- Migration: Create product suggestions table
-- Description: Create product_suggestions table to link main products with suggested items.

CREATE TABLE IF NOT EXISTS product_suggestions (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  suggested_product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_product_suggestion UNIQUE(product_id, suggested_product_id)
);
