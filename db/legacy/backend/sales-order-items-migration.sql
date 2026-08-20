-- Create sales_order_items table if not exists
CREATE TABLE IF NOT EXISTS sales_order_items (
    id SERIAL PRIMARY KEY,
    sales_order_id INT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    product_name VARCHAR(255),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON sales_order_items(product_id);

-- Comments
COMMENT ON TABLE sales_order_items IS 'Items/products in each sales order';
COMMENT ON COLUMN sales_order_items.sales_order_id IS 'Reference to sales_orders table';
COMMENT ON COLUMN sales_order_items.product_id IS 'Reference to products table';
COMMENT ON COLUMN sales_order_items.total_price IS 'quantity * unit_price';
