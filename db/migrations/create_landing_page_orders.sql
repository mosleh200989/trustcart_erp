-- Landing Page Orders Migration
-- Run this to create the landing_page_orders table

-- Create the order status enum
DO $$ BEGIN
    CREATE TYPE landing_page_order_status AS ENUM (
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS landing_page_orders (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    landing_page_id INT NOT NULL,
    landing_page_title VARCHAR(255),
    landing_page_slug VARCHAR(255),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    district VARCHAR(100) DEFAULT 'Dhaka',
    note TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cod',
    status landing_page_order_status DEFAULT 'pending',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lp_orders_landing_page_id ON landing_page_orders(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lp_orders_status ON landing_page_orders(status);
CREATE INDEX IF NOT EXISTS idx_lp_orders_customer_phone ON landing_page_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_lp_orders_created_at ON landing_page_orders(created_at DESC);

-- Add foreign key (optional, only if landing_pages table exists)
-- ALTER TABLE landing_page_orders ADD CONSTRAINT fk_lp_orders_landing_page
--     FOREIGN KEY (landing_page_id) REFERENCES landing_pages(id) ON DELETE SET NULL;
