-- Migration: Fix order_items.product_id to allow NULL and remove FK constraint
-- Reason: Landing-page orders have items where product_id is NULL (products
--         not linked to the product catalog). The existing NOT NULL + FK
--         constraint blocks agents from adding products to these orders
--         (upsell workflow) because the migration step fails when copying
--         sales_order_items → order_items.
--
-- Run this on the production DB ASAP.

-- 1. Drop the foreign key constraint (auto-named by PostgreSQL)
ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- 2. Allow NULL in product_id (required for custom / un-catalogued products)
ALTER TABLE order_items
  ALTER COLUMN product_id DROP NOT NULL;

-- 3. Drop the index that was created for the FK (optional, keep for performance)
-- Index on product_id is still useful for lookups, so we keep it.
-- CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
-- (already exists, no action needed)
