-- Migration: Add slug column to products table and generate slugs from name_en

-- Step 1: Add slug column (nullable first, we'll add values then make it required)
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Step 2: Generate slugs from name_en for all products
-- Convert to lowercase, replace spaces and special chars with hyphens
UPDATE products 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(name_en, '[^a-zA-Z0-9\s-]', '', 'g'),  -- Remove special chars except spaces and hyphens
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    ),
    '-+', '-', 'g'  -- Replace multiple hyphens with single hyphen
  )
)
WHERE slug IS NULL;

-- Step 3: Handle any duplicate slugs by appending product id
UPDATE products p1
SET slug = slug || '-' || id
WHERE EXISTS (
  SELECT 1 FROM products p2 
  WHERE p2.slug = p1.slug AND p2.id < p1.id
);

-- Step 4: Add unique constraint
ALTER TABLE products ADD CONSTRAINT unique_product_slug UNIQUE (slug);

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Step 6: Make slug not null (after all slugs are generated)
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;

-- Verify the migration
SELECT id, name_en, slug FROM products LIMIT 10;
