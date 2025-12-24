-- Add total_amount column to sales_orders table if it doesn't exist
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0.00;

-- Add comment
COMMENT ON COLUMN sales_orders.total_amount IS 'Total amount of the sales order';
