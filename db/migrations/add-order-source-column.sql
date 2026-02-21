-- Add order_source column to sales_orders table for tracking where orders originated
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS order_source VARCHAR(50) DEFAULT NULL;

-- Backfill existing orders based on traffic_source
UPDATE sales_orders SET order_source = 'landing_page' WHERE order_source IS NULL AND traffic_source IN ('landing_page', 'landing_page_intl');

-- Backfill: if created_by is the system user and no traffic_source, it's from website
UPDATE sales_orders SET order_source = 'website' WHERE order_source IS NULL AND (created_by IS NULL OR created_by = 1) AND traffic_source IS NULL;

-- Backfill: if created_by is a real user (not system), it's from admin panel
UPDATE sales_orders SET order_source = 'admin_panel' WHERE order_source IS NULL AND created_by IS NOT NULL AND created_by > 1;

-- Everything else defaults to website
UPDATE sales_orders SET order_source = 'website' WHERE order_source IS NULL;

-- Create index for agent order count queries
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_source ON sales_orders(order_source);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_by ON sales_orders(created_by);
