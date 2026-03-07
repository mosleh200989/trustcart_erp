-- Add is_upsell column to order_items table
-- Upsell = product added by agent to an agent-created order (admin_panel / agent_dashboard)

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_upsell BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index for efficient upsell queries
CREATE INDEX IF NOT EXISTS idx_order_items_upsell
  ON order_items (added_by)
  WHERE is_upsell = TRUE;
