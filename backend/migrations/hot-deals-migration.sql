-- Hot Deals Table Migration
-- Run this SQL in your PostgreSQL database

CREATE TABLE IF NOT EXISTS hot_deals (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    special_price DECIMAL(10, 2),
    discount_percent INTEGER,
    display_order INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_hot_deals_product_id ON hot_deals(product_id);
CREATE INDEX IF NOT EXISTS idx_hot_deals_is_active ON hot_deals(is_active);
CREATE INDEX IF NOT EXISTS idx_hot_deals_display_order ON hot_deals(display_order);

-- Add unique constraint to prevent duplicate products
CREATE UNIQUE INDEX IF NOT EXISTS idx_hot_deals_unique_product ON hot_deals(product_id);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_hot_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hot_deals_updated_at ON hot_deals;
CREATE TRIGGER trigger_hot_deals_updated_at
    BEFORE UPDATE ON hot_deals
    FOR EACH ROW
    EXECUTE FUNCTION update_hot_deals_updated_at();
