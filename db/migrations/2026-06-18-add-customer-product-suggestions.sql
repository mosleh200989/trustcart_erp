CREATE TABLE IF NOT EXISTS customer_product_suggestions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id INTEGER NULL REFERENCES products(id) ON DELETE SET NULL,
  suggestion TEXT NOT NULL,
  created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_product_suggestions_customer
  ON customer_product_suggestions(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_product_suggestions_product
  ON customer_product_suggestions(product_id);

CREATE INDEX IF NOT EXISTS idx_customer_product_suggestions_updated
  ON customer_product_suggestions(updated_at DESC);
