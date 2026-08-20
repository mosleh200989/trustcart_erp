ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS late_delivery_note TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_order_note TEXT;
