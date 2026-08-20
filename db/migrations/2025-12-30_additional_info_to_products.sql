-- Adds products.additional_info (JSONB) for Product "Additional Information" feature
-- Safe to run multiple times.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS additional_info JSONB DEFAULT '{}'::jsonb;

-- Optional: ensure existing NULLs become empty object
UPDATE products
SET additional_info = '{}'::jsonb
WHERE additional_info IS NULL;
