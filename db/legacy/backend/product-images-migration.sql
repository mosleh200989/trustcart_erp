-- Product Images Migration
-- This creates a new table for multiple product images and adds additional_info field to products

BEGIN;

-- Create product_images table for multiple images per product
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(display_order);

-- Create partial unique index to ensure only one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_product_primary 
ON product_images(product_id) WHERE is_primary = TRUE;

-- Add additional_info JSONB column to products table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'additional_info'
  ) THEN
    ALTER TABLE products ADD COLUMN additional_info JSONB DEFAULT '{}';
  END IF;
END $$;

-- Migrate existing image_url to product_images table
INSERT INTO product_images (product_id, image_url, display_order, is_primary)
SELECT id, image_url, 0, TRUE
FROM products
WHERE image_url IS NOT NULL AND image_url != ''
ON CONFLICT DO NOTHING;

-- Add sample additional info for existing products (optional)
UPDATE products
SET additional_info = jsonb_build_object(
  'weight', '500g',
  'dimensions', '10x10x15 cm',
  'manufacturer', 'TrustCart',
  'warranty', '1 year'
)
WHERE additional_info IS NULL OR additional_info = '{}';

COMMIT;
