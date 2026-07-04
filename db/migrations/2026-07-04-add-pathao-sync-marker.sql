-- Track Pathao polling sync progress so manual sync can run in safe batches
-- without repeatedly selecting the same orders.

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS pathao_last_synced_at TIMESTAMP WITHOUT TIME ZONE NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_orders_pathao_sync_queue
  ON sales_orders(pathao_last_synced_at, created_at, id)
  WHERE LOWER(COALESCE(courier_company, '')) = 'pathao';
