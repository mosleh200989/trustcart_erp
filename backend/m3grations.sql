-- Run this script to ensure product_images table exists and is populated
-- Safe to run multiple times

-- Step 1: Create the table if not exists
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);

-- Step 3: Backfill legacy products.image_url into product_images (as primary)
INSERT INTO product_images (product_id, image_url, display_order, is_primary)
SELECT p.id, p.image_url, 0, TRUE
FROM products p
WHERE p.image_url IS NOT NULL
  AND p.image_url <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM product_images pi
    WHERE pi.product_id = p.id
      AND pi.image_url = p.image_url
  )
ON CONFLICT DO NOTHING;

-- Step 4: Verify
SELECT 
  'Total products' as metric, 
  COUNT(*)::text as value 
FROM products
UNION ALL
SELECT 
  'Products with image_url' as metric, 
  COUNT(*)::text as value 
FROM products WHERE image_url IS NOT NULL AND image_url <> ''
UNION ALL
SELECT 
  'Rows in product_images' as metric, 
  COUNT(*)::text as value 
FROM product_images
UNION ALL
SELECT 
  'Products with images in product_images' as metric, 
  COUNT(DISTINCT product_id)::text as value 
FROM product_images;
