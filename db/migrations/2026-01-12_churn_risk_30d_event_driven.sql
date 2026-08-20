-- Churn Risk (30+ Days) tag + automated assignment + event-driven auto-removal
--
-- Behavior:
-- 1) Ensures a tag exists: "Churn Risk (30+ days inactive)"
-- 2) Automated assignment/removal: periodically refreshes which customers qualify
--    based on last order date (30+ days).
-- 3) Event-driven removal: when a new order is inserted with a non-null customer_id,
--    automatically removes that customer from the churn-risk tag immediately.
--
-- Notes:
-- - True "30 days since last activity" cannot be purely event-driven; it requires time.
--   This migration automates it with a DB refresh function and (optionally) schedules
--   it using pg_cron if available.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Ensure tag exists
INSERT INTO customer_tags (id, name, description, color, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'Churn Risk (30+ days inactive)',
  'Customer has not placed an order in the last 30+ days. Auto-removed when they place their next order.',
  '#f97316',
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    color = EXCLUDED.color,
    updated_at = NOW();

-- 2) Trigger function: remove tag on next purchase
CREATE OR REPLACE FUNCTION remove_churn_risk_30d_on_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  churn_tag_id uuid;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO churn_tag_id
  FROM customer_tags
  WHERE name = 'Churn Risk (30+ days inactive)'
  LIMIT 1;

  IF churn_tag_id IS NULL THEN
    RETURN NEW;
  END IF;

  DELETE FROM customer_tag_assignments
  WHERE tag_id = churn_tag_id
    AND customer_id = NEW.customer_id;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tr_remove_churn_risk_30d_on_new_order'
  ) THEN
    CREATE TRIGGER tr_remove_churn_risk_30d_on_new_order
    AFTER INSERT ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION remove_churn_risk_30d_on_new_order();
  END IF;
END $$;

-- Automated refresh function
--
-- Usage (manual):
--   SELECT refresh_churn_risk_30d_tag();
--
-- What it does:
--   - Assigns tag to customers with last order date older than 30 days
--   - Removes tag from customers whose last order is within 30 days
--   - Ignores guest orders (customer_id is NULL)
--
CREATE OR REPLACE FUNCTION refresh_churn_risk_30d_tag()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  churn_tag_id uuid;
  inserted_count integer := 0;
  removed_count integer := 0;
BEGIN
  SELECT id INTO churn_tag_id
  FROM customer_tags
  WHERE name = 'Churn Risk (30+ days inactive)'
  LIMIT 1;

  IF churn_tag_id IS NULL THEN
    RETURN jsonb_build_object('inserted', 0, 'removed', 0);
  END IF;

  WITH last_orders AS (
    SELECT
      so.customer_id,
      MAX(COALESCE(so.order_date, so.created_at)) AS last_order_date
    FROM sales_orders so
    WHERE so.customer_id IS NOT NULL
    GROUP BY so.customer_id
  ), at_risk AS (
    SELECT lo.customer_id
    FROM last_orders lo
    WHERE lo.last_order_date < (NOW() - INTERVAL '30 days')
  ), ins AS (
    INSERT INTO customer_tag_assignments (tag_id, customer_id, created_at)
    SELECT churn_tag_id, ar.customer_id, NOW()
    FROM at_risk ar
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count FROM ins;

  WITH last_orders AS (
    SELECT
      so.customer_id,
      MAX(COALESCE(so.order_date, so.created_at)) AS last_order_date
    FROM sales_orders so
    WHERE so.customer_id IS NOT NULL
    GROUP BY so.customer_id
  ), not_at_risk AS (
    SELECT lo.customer_id
    FROM last_orders lo
    WHERE lo.last_order_date >= (NOW() - INTERVAL '30 days')
  ), del AS (
    DELETE FROM customer_tag_assignments a
    WHERE a.tag_id = churn_tag_id
      AND a.customer_id IN (SELECT customer_id FROM not_at_risk)
    RETURNING 1
  )
  SELECT COUNT(*) INTO removed_count FROM del;

  RETURN jsonb_build_object('inserted', inserted_count, 'removed', removed_count);
END;
$$;

-- Optional automation: schedule periodic refresh via pg_cron (if available)
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available; skipping automatic schedule. You can call refresh_churn_risk_30d_tag() from your app/cron.';
    RETURN;
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Run hourly at minute 10
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh_churn_risk_30d_tag') THEN
      PERFORM cron.schedule(
        'refresh_churn_risk_30d_tag',
        '10 * * * *',
        'SELECT refresh_churn_risk_30d_tag();'
      );
    END IF;
  END IF;
END $$;

-- Run once immediately
SELECT refresh_churn_risk_30d_tag();
