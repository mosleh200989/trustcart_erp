-- Migration: Add 'unpaid' value to payment_status_enum
-- The enum is shared by sales_orders, ecommerce_orders, payments, and returns tables.
-- Simply add the missing 'unpaid' value to the existing enum.

ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'unpaid';
