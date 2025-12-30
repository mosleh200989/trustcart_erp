-- Creates product_images table used for multiple images per product.
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);

-- Prevent duplicates for the same URL on the same product
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_product_id_image_url
ON product_images(product_id, image_url);

-- Ensure only one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_images_primary
ON product_images(product_id)
WHERE is_primary = TRUE;

-- Backfill legacy products.image_url into product_images (as primary)
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
  );

COMMIT;
