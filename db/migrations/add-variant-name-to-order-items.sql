-- Add variant_name column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255) DEFAULT NULL;

-- Add variant_name column to sales_order_items table as well
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255) DEFAULT NULL;
