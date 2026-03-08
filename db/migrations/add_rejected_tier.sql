-- Add 'rejected' to the customer_tiers tier CHECK constraint
-- Also adds 'blacklist' which was referenced in code but missing from the original constraint

ALTER TABLE customer_tiers DROP CONSTRAINT IF EXISTS customer_tiers_tier_check;
ALTER TABLE customer_tiers ADD CONSTRAINT customer_tiers_tier_check
  CHECK (tier IN ('silver', 'gold', 'platinum', 'vip', 'blacklist', 'rejected'));

-- Add 'rejected' to the customers customer_type CHECK constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_customer_type_check
  CHECK (customer_type IN ('new', 'repeat', 'vip', 'inactive', 'normal', 'silver', 'gold', 'platinum', 'rejected'));
