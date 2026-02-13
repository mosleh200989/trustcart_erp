-- Add delivery charge columns to landing_pages table
-- Run this migration to add configurable delivery charges

-- Add delivery_charge column (Inside Dhaka)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS delivery_charge DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Add delivery_charge_outside column (Outside Dhaka)
ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS delivery_charge_outside DECIMAL(10, 2) DEFAULT 0;

-- Update seed-mix page with delivery charges
UPDATE landing_pages
SET delivery_charge = 80,
    delivery_charge_outside = 130
WHERE slug = 'seed-mix';
