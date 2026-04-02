-- Backfill customer_tiers for every customer who has delivered orders
-- but does not yet have a tier record (or has a lower tier that should be upgraded).
-- IDEMPOTENT — safe to run multiple times.

BEGIN;

-- 1. INSERT tier records for customers who have delivered orders but NO tier row yet
INSERT INTO customer_tiers (
  customer_id, tier, is_active, auto_assigned,
  tier_assigned_at, total_purchases, last_activity_date,
  days_inactive, total_spent, engagement_score, notes
)
SELECT
  so.customer_id,
  CASE
    WHEN cnt >= 6 THEN 'vip'
    WHEN cnt = 5  THEN 'platinum'
    WHEN cnt = 4  THEN 'gold'
    WHEN cnt = 3  THEN 'silver'
    WHEN cnt = 2  THEN 'repeat'
    ELSE               'new'
  END AS tier,
  true,           -- is_active
  true,           -- auto_assigned
  NOW(),          -- tier_assigned_at
  cnt,            -- total_purchases
  NOW(),          -- last_activity_date
  0,              -- days_inactive
  0,              -- total_spent
  0,              -- engagement_score
  'Auto-backfilled based on delivered order count'
FROM (
  SELECT customer_id, COUNT(*)::int AS cnt
  FROM sales_orders
  WHERE LOWER(status::text) = 'delivered'
    AND customer_id IS NOT NULL
  GROUP BY customer_id
) so
WHERE NOT EXISTS (
  SELECT 1 FROM customer_tiers ct WHERE ct.customer_id = so.customer_id
);

-- 2. UPGRADE existing tier records that are lower than what delivered count warrants
--    (skip blacklist / rejected)
UPDATE customer_tiers ct
SET
  tier = sub.target_tier,
  auto_assigned = true,
  tier_assigned_at = NOW(),
  total_purchases = sub.cnt,
  last_activity_date = NOW(),
  notes = COALESCE(ct.notes, '') || ' | Auto-upgraded by backfill'
FROM (
  SELECT
    so.customer_id,
    so.cnt,
    CASE
      WHEN so.cnt >= 6 THEN 'vip'
      WHEN so.cnt = 5  THEN 'platinum'
      WHEN so.cnt = 4  THEN 'gold'
      WHEN so.cnt = 3  THEN 'silver'
      WHEN so.cnt = 2  THEN 'repeat'
      ELSE                   'new'
    END AS target_tier,
    -- rank the target
    CASE
      WHEN so.cnt >= 6 THEN 6
      WHEN so.cnt = 5  THEN 5
      WHEN so.cnt = 4  THEN 4
      WHEN so.cnt = 3  THEN 3
      WHEN so.cnt = 2  THEN 2
      ELSE                   1
    END AS target_rank
  FROM (
    SELECT customer_id, COUNT(*)::int AS cnt
    FROM sales_orders
    WHERE LOWER(status::text) = 'delivered'
      AND customer_id IS NOT NULL
    GROUP BY customer_id
  ) so
) sub
WHERE ct.customer_id = sub.customer_id
  AND ct.tier NOT IN ('blacklist', 'rejected')
  AND (
    CASE ct.tier
      WHEN 'new'      THEN 1
      WHEN 'repeat'   THEN 2
      WHEN 'silver'   THEN 3
      WHEN 'gold'     THEN 4
      WHEN 'platinum' THEN 5
      WHEN 'vip'      THEN 6
      ELSE 0
    END
  ) < sub.target_rank;

COMMIT;
