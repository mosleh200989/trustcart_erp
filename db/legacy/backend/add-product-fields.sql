-- Add stock_quantity and display_position columns to products table

-- Add stock_quantity column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL;

-- Add display_position column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS display_position INTEGER DEFAULT NULL;

-- Add index for display_position for better query performance
CREATE INDEX IF NOT EXISTS idx_products_display_position ON products(display_position);

-- Update existing products to have default stock_quantity
UPDATE products SET stock_quantity = 100 WHERE stock_quantity IS NULL;

COMMENT ON COLUMN products.stock_quantity IS 'Current stock quantity of the product';
COMMENT ON COLUMN products.display_position IS 'Order position for displaying on homepage/products page';
