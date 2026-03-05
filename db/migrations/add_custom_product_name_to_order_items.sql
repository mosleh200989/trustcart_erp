-- Migration: Add custom_product_name to order_items and sales_order_items
-- This field allows overriding the product display name per order line
-- without modifying the actual product master data.
-- The custom name is used in invoices, stickers, courier labels, and all displays.
-- If NULL, the original product_name is used as fallback.

-- Add to order_items (admin-managed orders)
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS custom_product_name VARCHAR(500) DEFAULT NULL;

-- Add to sales_order_items (checkout-created orders)
ALTER TABLE sales_order_items
ADD COLUMN IF NOT EXISTS custom_product_name VARCHAR(500) DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN order_items.custom_product_name IS 'Optional override for product display name. Used in invoices, stickers, courier. Does NOT modify actual product.';
COMMENT ON COLUMN sales_order_items.custom_product_name IS 'Optional override for product display name. Used in invoices, stickers, courier. Does NOT modify actual product.';
