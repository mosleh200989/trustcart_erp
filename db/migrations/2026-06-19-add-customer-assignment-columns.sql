ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS assigned_to INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_by ON customers(assigned_by);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_at ON customers(assigned_at);
