-- =====================================================
-- Order Management Enhancement Migration
-- Features: Product Management, Courier Integration,
-- Order Tracking, Activity Logs, User Source Tracking
-- =====================================================

-- 1. Add new columns to sales_orders table
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS rider_instructions TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelled_by INT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Order Source Tracking
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS user_ip VARCHAR(50);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS geo_location JSONB; -- {country, city, latitude, longitude}
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS browser_info VARCHAR(255);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS device_type VARCHAR(50); -- mobile, desktop, tablet
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS operating_system VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS traffic_source VARCHAR(100); -- facebook_ads, google_ads, direct, organic, referral
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- Courier Integration
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_company VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_order_id VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100);
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS courier_status VARCHAR(50); -- picked, in_transit, delivered, returned
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- 2. Create order_items table (if not exists) for managing products in orders
DROP TABLE IF EXISTS order_items CASCADE;
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INT REFERENCES users(id)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 3. Create order_activity_logs table for complete audit trail
DROP TABLE IF EXISTS order_activity_logs CASCADE;
CREATE TABLE order_activity_logs (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- product_added, product_removed, product_updated, status_changed, approved, cancelled, hold, shipped, delivered, note_added
    action_description TEXT NOT NULL,
    old_value JSONB, -- Store old state for comparison
    new_value JSONB, -- Store new state
    performed_by INT REFERENCES users(id),
    performed_by_name VARCHAR(255), -- Store name in case user is deleted
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_activity_logs_order_id ON order_activity_logs(order_id);
CREATE INDEX idx_order_activity_logs_action_type ON order_activity_logs(action_type);
CREATE INDEX idx_order_activity_logs_created_at ON order_activity_logs(created_at);

-- 4. Create courier_tracking_history table for real-time courier status updates
DROP TABLE IF EXISTS courier_tracking_history CASCADE;
CREATE TABLE courier_tracking_history (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    courier_company VARCHAR(100) NOT NULL,
    tracking_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- picked, in_transit, out_for_delivery, delivered, returned, failed
    location VARCHAR(255),
    remarks TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courier_tracking_order_id ON courier_tracking_history(order_id);
CREATE INDEX idx_courier_tracking_status ON courier_tracking_history(status);

-- 5. Create order_status_enum type if not exists
DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM (
        'pending', 
        'approved', 
        'hold', 
        'processing', 
        'shipped', 
        'delivered', 
        'cancelled', 
        'returned'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Create cancel_reason_enum type
DO $$ BEGIN
    CREATE TYPE cancel_reason_type AS ENUM (
        'customer_request',
        'out_of_stock',
        'wrong_address',
        'payment_issue',
        'duplicate_order',
        'fraud_detected',
        'customer_unreachable',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. Create traffic_source_enum type
DO $$ BEGIN
    CREATE TYPE traffic_source_type AS ENUM (
        'facebook_ads',
        'google_ads',
        'instagram_ads',
        'tiktok_ads',
        'youtube_ads',
        'direct',
        'organic_search',
        'referral',
        'email_campaign',
        'sms_campaign',
        'affiliate',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Add update trigger for order_items
CREATE OR REPLACE FUNCTION update_order_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_items_timestamp ON order_items;
CREATE TRIGGER trigger_update_order_items_timestamp
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_items_timestamp();

-- 9. Function to auto-update order total when items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales_orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_total_on_insert ON order_items;
CREATE TRIGGER trigger_update_order_total_on_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

DROP TRIGGER IF EXISTS trigger_update_order_total_on_update ON order_items;
CREATE TRIGGER trigger_update_order_total_on_update
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

DROP TRIGGER IF EXISTS trigger_update_order_total_on_delete ON order_items;
CREATE TRIGGER trigger_update_order_total_on_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

-- 10. Insert sample data for testing (optional)
-- Insert order activity log for existing orders
INSERT INTO order_activity_logs (order_id, action_type, action_description, performed_by_name, created_at)
SELECT 
    id,
    'order_created',
    'Order created in system',
    'System',
    created_at
FROM sales_orders
WHERE NOT EXISTS (
    SELECT 1 FROM order_activity_logs WHERE order_id = sales_orders.id
);

-- Migration completed successfully
SELECT 'Order Management Enhancement Migration Completed Successfully!' as status;
