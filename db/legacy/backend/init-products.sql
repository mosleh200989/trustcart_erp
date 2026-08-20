-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100),
  product_code VARCHAR(100),
  name_en VARCHAR(255),
  name_bn VARCHAR(255),
  description_en TEXT,
  description_bn TEXT,
  category_id INTEGER,
  base_price NUMERIC(10, 2),
  selling_price NUMERIC(10, 2),
  stock_quantity INTEGER DEFAULT 0,
  image_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check if data exists
SELECT COUNT(*) as product_count FROM products;
