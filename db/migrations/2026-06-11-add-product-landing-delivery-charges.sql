-- Migration: Add product landing page delivery charges
-- Description: Add landing_page_delivery_charge and landing_page_delivery_charge_outside columns to the products table

ALTER TABLE products ADD COLUMN IF NOT EXISTS landing_page_delivery_charge DECIMAL(10,2) DEFAULT 60.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS landing_page_delivery_charge_outside DECIMAL(10,2) DEFAULT 110.00;
