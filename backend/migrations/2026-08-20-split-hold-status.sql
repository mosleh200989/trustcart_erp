-- Split the ambiguous `hold` order status into `customer_hold` and `courier_hold`.
--
-- `hold` previously meant BOTH "we paused this before sending it to a courier" and
-- "the courier paused it after pickup", so the status could not be filtered on.
--
-- Run with psql (statement-level autocommit). `ALTER TYPE ... ADD VALUE` and any
-- statement that *uses* the new value cannot share a transaction, hence the explicit
-- COMMITs between the two phases.
--
--   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f 2026-08-20-split-hold-status.sql
--
-- Idempotent: safe to re-run.

-- ── Phase 1: add the new enum values ──────────────────────────────────────────
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'customer_hold';
COMMIT;
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'courier_hold';
COMMIT;

-- ── Phase 2: backfill existing `hold` rows ────────────────────────────────────
-- An order counts as a COURIER hold when there is evidence it actually reached a
-- courier: a shipped timestamp, a consignment/tracking id, or an activity-log entry
-- showing it was once 'sent'. Everything else is a hold we applied ourselves.

BEGIN;

UPDATE sales_orders o
SET status = 'courier_hold'
WHERE LOWER(o.status::text) = 'hold'
  AND (
    o.shipped_at IS NOT NULL
    OR NULLIF(o.courier_order_id, '') IS NOT NULL
    OR NULLIF(o.tracking_id, '') IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM order_activity_logs oal
      WHERE oal.order_id = o.id
        AND oal.action_type IN (
          'status_changed', 'shipped', 'courier_status_webhook',
          'courier_status_synced', 'courier_status_updated'
        )
        AND LOWER(COALESCE(oal.new_value->>'status', '')) IN ('sent', 'picked', 'in_transit')
    )
  );

UPDATE sales_orders
SET status = 'customer_hold'
WHERE LOWER(status::text) = 'hold';

COMMIT;

-- ── Verification ──────────────────────────────────────────────────────────────
SELECT status, COUNT(*) AS orders
FROM sales_orders
WHERE status::text IN ('hold', 'customer_hold', 'courier_hold')
GROUP BY status
ORDER BY 2 DESC;
