-- Migration: Add cross-sell tracking columns to order_items
-- An item is cross-sell when an agent adds a product to a website/landing-page order
-- Run: psql -U postgres -d trustcart_erp -f db/migrations/add_cross_sell_columns.sql

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_cross_sell BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS added_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_order_items_cross_sell ON order_items(is_cross_sell) WHERE is_cross_sell = TRUE;
CREATE INDEX IF NOT EXISTS idx_order_items_added_by ON order_items(added_by) WHERE added_by IS NOT NULL;
