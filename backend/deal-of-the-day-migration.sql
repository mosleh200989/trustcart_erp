-- Migration: Deal of the Day Feature
-- This migration creates a table to manage the "Deal of the Day" product

-- Create deal_of_the_day table
CREATE TABLE IF NOT EXISTS deal_of_the_day (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_deal_of_the_day_product ON deal_of_the_day(product_id);
CREATE INDEX idx_deal_of_the_day_active ON deal_of_the_day(is_active);

-- Create unique constraint to ensure only one active deal at a time
CREATE UNIQUE INDEX idx_one_active_deal ON deal_of_the_day(is_active) WHERE is_active = true;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deal_of_the_day_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at
CREATE TRIGGER update_deal_of_the_day_timestamp
    BEFORE UPDATE ON deal_of_the_day
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_of_the_day_updated_at();
