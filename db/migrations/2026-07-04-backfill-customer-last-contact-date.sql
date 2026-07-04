-- Backfill customer last call timestamps so CRM Last Call filters can use an indexed customer column.
-- This is intentionally idempotent: it only moves last_contact_date forward when older/missing.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_last_contact_date
  ON customers(last_contact_date);

WITH call_sources AS (
  SELECT c.id AS customer_id, c.last_contact_date::timestamp AS call_at
  FROM customers c
  WHERE c.last_contact_date IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp AS call_at
  FROM crm_call_tasks t
  INNER JOIN customers c ON t.customer_id = c.id::text
  WHERE COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, COALESCE(t.completed_at, t.updated_at, t.created_at)::timestamp AS call_at
  FROM crm_call_tasks t
  INNER JOIN customers c ON t.customer_id = c.phone
  WHERE c.phone IS NOT NULL
    AND COALESCE(t.completed_at, t.updated_at, t.created_at) IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, eh.created_at::timestamp AS call_at
  FROM customer_engagement_history eh
  INNER JOIN customers c ON eh.customer_id = c.id::text
  WHERE eh.created_at IS NOT NULL
    AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')

  UNION ALL
  SELECT c.id AS customer_id, eh.created_at::timestamp AS call_at
  FROM customer_engagement_history eh
  INNER JOIN customers c ON eh.customer_id = c.phone
  WHERE c.phone IS NOT NULL
    AND eh.created_at IS NOT NULL
    AND eh.engagement_type IN ('call', 'follow_up_call', 'phone_call')

  UNION ALL
  SELECT c.id AS customer_id, a.created_at::timestamp AS call_at
  FROM activities a
  INNER JOIN customers c ON a.customer_id = c.id
  WHERE a.created_at IS NOT NULL
    AND a.type = 'call'

  UNION ALL
  SELECT so_log.customer_id AS customer_id, COALESCE(tl.called_at, tl.created_at)::timestamp AS call_at
  FROM telephony_assignment_call_logs tl
  INNER JOIN sales_orders so_log ON so_log.id = tl.order_id
  WHERE tl.record_type = 'sales_order'
    AND so_log.customer_id IS NOT NULL
    AND COALESCE(tl.called_at, tl.created_at) IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, COALESCE(tl.called_at, tl.created_at)::timestamp AS call_at
  FROM telephony_assignment_call_logs tl
  INNER JOIN sales_orders so_log ON so_log.id = tl.order_id
  INNER JOIN customers c
    ON regexp_replace(REPLACE(c.phone, '+88', ''), '\D', '', 'g')
     = regexp_replace(REPLACE(so_log.customer_phone, '+88', ''), '\D', '', 'g')
  WHERE tl.record_type = 'sales_order'
    AND c.phone IS NOT NULL
    AND NULLIF(TRIM(so_log.customer_phone), '') IS NOT NULL
    AND COALESCE(tl.called_at, tl.created_at) IS NOT NULL

  UNION ALL
  SELECT io_log.customer_id AS customer_id, COALESCE(tli.called_at, tli.created_at)::timestamp AS call_at
  FROM telephony_assignment_call_logs tli
  INNER JOIN incomplete_orders io_log ON io_log.id = tli.order_id
  WHERE tli.record_type = 'incomplete_order'
    AND io_log.customer_id IS NOT NULL
    AND COALESCE(tli.called_at, tli.created_at) IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, COALESCE(tli.called_at, tli.created_at)::timestamp AS call_at
  FROM telephony_assignment_call_logs tli
  INNER JOIN incomplete_orders io_log ON io_log.id = tli.order_id
  INNER JOIN customers c
    ON regexp_replace(REPLACE(c.phone, '+88', ''), '\D', '', 'g')
     = regexp_replace(REPLACE(io_log.phone, '+88', ''), '\D', '', 'g')
  WHERE tli.record_type = 'incomplete_order'
    AND c.phone IS NOT NULL
    AND NULLIF(TRIM(io_log.phone), '') IS NOT NULL
    AND COALESCE(tli.called_at, tli.created_at) IS NOT NULL

  UNION ALL
  SELECT so_activity.customer_id AS customer_id, oal.created_at::timestamp AS call_at
  FROM order_activity_logs oal
  INNER JOIN sales_orders so_activity ON so_activity.id = oal.order_id
  WHERE oal.action_type = 'telephony_call_logged'
    AND so_activity.customer_id IS NOT NULL
    AND oal.created_at IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, oal.created_at::timestamp AS call_at
  FROM order_activity_logs oal
  INNER JOIN sales_orders so_activity ON so_activity.id = oal.order_id
  INNER JOIN customers c
    ON regexp_replace(REPLACE(c.phone, '+88', ''), '\D', '', 'g')
     = regexp_replace(REPLACE(so_activity.customer_phone, '+88', ''), '\D', '', 'g')
  WHERE oal.action_type = 'telephony_call_logged'
    AND c.phone IS NOT NULL
    AND NULLIF(TRIM(so_activity.customer_phone), '') IS NOT NULL
    AND oal.created_at IS NOT NULL

  UNION ALL
  SELECT so_telephony.customer_id AS customer_id, so_telephony.telephony_called_at::timestamp AS call_at
  FROM sales_orders so_telephony
  WHERE so_telephony.customer_id IS NOT NULL
    AND so_telephony.telephony_called_at IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, so_telephony.telephony_called_at::timestamp AS call_at
  FROM sales_orders so_telephony
  INNER JOIN customers c
    ON regexp_replace(REPLACE(c.phone, '+88', ''), '\D', '', 'g')
     = regexp_replace(REPLACE(so_telephony.customer_phone, '+88', ''), '\D', '', 'g')
  WHERE c.phone IS NOT NULL
    AND NULLIF(TRIM(so_telephony.customer_phone), '') IS NOT NULL
    AND so_telephony.telephony_called_at IS NOT NULL

  UNION ALL
  SELECT io_telephony.customer_id AS customer_id, io_telephony.telephony_called_at::timestamp AS call_at
  FROM incomplete_orders io_telephony
  WHERE io_telephony.customer_id IS NOT NULL
    AND io_telephony.telephony_called_at IS NOT NULL

  UNION ALL
  SELECT c.id AS customer_id, io_telephony.telephony_called_at::timestamp AS call_at
  FROM incomplete_orders io_telephony
  INNER JOIN customers c
    ON regexp_replace(REPLACE(c.phone, '+88', ''), '\D', '', 'g')
     = regexp_replace(REPLACE(io_telephony.phone, '+88', ''), '\D', '', 'g')
  WHERE c.phone IS NOT NULL
    AND NULLIF(TRIM(io_telephony.phone), '') IS NOT NULL
    AND io_telephony.telephony_called_at IS NOT NULL
),
latest_calls AS (
  SELECT customer_id, MAX(call_at) AS last_call_at
  FROM call_sources
  WHERE customer_id IS NOT NULL
    AND call_at IS NOT NULL
  GROUP BY customer_id
)
UPDATE customers c
SET last_contact_date = latest_calls.last_call_at,
    updated_at = NOW()
FROM latest_calls
WHERE c.id = latest_calls.customer_id
  AND (
    c.last_contact_date IS NULL
    OR c.last_contact_date < latest_calls.last_call_at
  );
