-- Migration: Add printer settings table and packed columns to sales_orders
-- Run this migration before starting the application

-- 1. Printer Settings table
CREATE TABLE IF NOT EXISTS printer_settings (
  id SERIAL PRIMARY KEY,
  printer_name VARCHAR(255) NOT NULL,
  printer_type VARCHAR(50) NOT NULL DEFAULT 'thermal',
  is_default BOOLEAN NOT NULL DEFAULT false,
  paper_size VARCHAR(50) NOT NULL DEFAULT '80mm',
  sticker_width INT NOT NULL DEFAULT 51,
  sticker_height INT NOT NULL DEFAULT 102,
  invoice_header TEXT,
  invoice_footer TEXT,
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  company_logo_url VARCHAR(1000),
  show_logo BOOLEAN NOT NULL DEFAULT true,
  show_barcode BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add packed columns to sales_orders
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS is_packed BOOLEAN DEFAULT false;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS packed_by INT;

-- 3. Insert a default printer setting
INSERT INTO printer_settings (printer_name, printer_type, is_default, paper_size, company_name, company_phone)
VALUES ('Default Printer', 'thermal', true, '80mm', 'TrustCart', '')
ON CONFLICT DO NOTHING;
