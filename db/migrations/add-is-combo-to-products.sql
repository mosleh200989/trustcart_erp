-- Migration: Add is_combo column to products table
-- Date: 2026-03-29
-- Description: Adds a boolean flag to mark a product as a combo product.
--              Combo products are displayed in a combo style on the homepage.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'is_combo'
    ) THEN
        ALTER TABLE products ADD COLUMN is_combo BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE 'Column is_combo added to products table';
    ELSE
        RAISE NOTICE 'Column is_combo already exists in products table';
    END IF;
END $$;
