-- Migration: Add payment columns to sales_orders and create payment_transactions table
-- For SSLCommerz payment gateway integration

-- 1. Add payment-related columns to sales_orders
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- 2. Create payment_transactions table for audit trail
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) NOT NULL,
  gateway VARCHAR(50) NOT NULL DEFAULT 'sslcommerz',
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- SSLCommerz specific fields
  bank_tran_id VARCHAR(255),
  card_type VARCHAR(100),
  card_no VARCHAR(100),
  card_issuer VARCHAR(255),
  card_brand VARCHAR(50),
  card_issuer_country VARCHAR(100),
  store_amount DECIMAL(12, 2),
  val_id VARCHAR(255),
  -- Validation / verification
  validated_at TIMESTAMP,
  validation_status VARCHAR(50),
  -- Error tracking
  error_message TEXT,
  -- Raw response
  gateway_response JSONB,
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id ON payment_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_payment_status ON sales_orders(payment_status);
