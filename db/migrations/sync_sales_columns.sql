-- Comprehensive migration to ensure all sales_orders and sales_order_items columns exist
-- Run on production: PGPASSWORD='c0mm0n' psql -U postgres -d trustcart_erp -f db/migrations/sync_sales_columns.sql

-- ========== sales_orders table ==========

-- Customer contact info
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30);

-- Enhanced order management
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS rider_instructions TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelled_by INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Discount / Offer
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS offer_id INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50);

-- Order Source Tracking
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS user_ip VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS geo_location JSONB;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS browser_info VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS operating_system VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- Courier Integration
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_company VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_order_id VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_status VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS thank_you_offer_accepted BOOLEAN DEFAULT false;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- ========== sales_order_items table ==========
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(500);
ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS product_image VARCHAR(1000);
ALTER TABLE sales_order_items ALTER COLUMN product_id DROP NOT NULL;

-- ========== landing_pages table ==========
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS delivery_charge_outside DECIMAL(10,2) DEFAULT 0;

SELECT 'All columns synced successfully!' AS result;
