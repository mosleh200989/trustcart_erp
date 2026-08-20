-- Migration: Add size_variants column to products table
-- Date: 2026-01-27
-- Description: Adds JSONB column for storing product size variants (name, price, stock, sku_suffix)

-- Add size_variants column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'size_variants'
    ) THEN
        ALTER TABLE products ADD COLUMN size_variants JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Column size_variants added to products table';
    ELSE
        RAISE NOTICE 'Column size_variants already exists in products table';
    END IF;
END $$;

-- Create index for better query performance on size_variants
CREATE INDEX IF NOT EXISTS idx_products_size_variants ON products USING GIN (size_variants);

-- Example of how to query products with variants:
-- SELECT * FROM products WHERE size_variants IS NOT NULL AND jsonb_array_length(size_variants) > 0;

-- Example of updating a product with size variants:
-- UPDATE products SET size_variants = '[
--   {"name": "250g", "price": 150.00, "stock": 50, "sku_suffix": "250G"},
--   {"name": "500g", "price": 280.00, "stock": 30, "sku_suffix": "500G"},
--   {"name": "1kg", "price": 500.00, "stock": 20, "sku_suffix": "1KG"}
-- ]'::jsonb WHERE id = 1;
