-- Add 'new' and 'repeat' to the customer_tiers tier CHECK constraint
-- IDEMPOTENT — safe to run multiple times.

BEGIN;

ALTER TABLE customer_tiers DROP CONSTRAINT IF EXISTS customer_tiers_tier_check;
ALTER TABLE customer_tiers ADD CONSTRAINT customer_tiers_tier_check
  CHECK (tier IN ('new', 'repeat', 'silver', 'gold', 'platinum', 'vip', 'blacklist', 'rejected'));

COMMIT;
