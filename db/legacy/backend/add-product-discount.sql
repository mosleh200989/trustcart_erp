-- Add discount fields to products table

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS discount_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMP;

-- Update sale price based on discount (example for percentage discount)
UPDATE products 
SET sale_price = base_price - (base_price * discount_value / 100)
WHERE discount_type = 'percentage' AND discount_value IS NOT NULL;

-- Update sale price for flat discount
UPDATE products 
SET sale_price = base_price - discount_value
WHERE discount_type = 'flat' AND discount_value IS NOT NULL;

COMMENT ON COLUMN products.discount_type IS 'Type of discount: percentage, flat';
COMMENT ON COLUMN products.discount_value IS 'Discount value: % for percentage, amount for flat';
COMMENT ON COLUMN products.sale_price IS 'Final price after discount';
