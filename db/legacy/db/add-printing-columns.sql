-- Add printing tracking columns to sales_orders table
-- Run this migration to support the Printing sub-module

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS invoice_printed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_printed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS sticker_printed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sticker_printed_at TIMESTAMP NULL;
