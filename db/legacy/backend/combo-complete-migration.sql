-- Create combo_deal_products junction table if not exists
CREATE TABLE IF NOT EXISTS combo_deal_products (
    id SERIAL PRIMARY KEY,
    combo_deal_id INTEGER NOT NULL REFERENCES combo_deals(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(combo_deal_id, product_id)
);

-- Add image_url column to combo_deals
ALTER TABLE combo_deals 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Add display_position column to combo_deals
ALTER TABLE combo_deals 
ADD COLUMN IF NOT EXISTS display_position INTEGER;

-- Create index for display_position
CREATE INDEX IF NOT EXISTS idx_combo_deals_display_position ON combo_deals(display_position);

-- Create indexes for junction table
CREATE INDEX IF NOT EXISTS idx_combo_deal_products_combo_id ON combo_deal_products(combo_deal_id);
CREATE INDEX IF NOT EXISTS idx_combo_deal_products_product_id ON combo_deal_products(product_id);

COMMENT ON TABLE combo_deal_products IS 'Junction table linking combos to products';
COMMENT ON COLUMN combo_deals.image_url IS 'URL of combo image';
COMMENT ON COLUMN combo_deals.display_position IS 'Order position for displaying combos';
