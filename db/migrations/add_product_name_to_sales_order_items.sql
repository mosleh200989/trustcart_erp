-- Add product_name column to sales_order_items
-- This stores the product name for orders where product_id might be null (e.g. landing page orders)
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(500);
