-- Make Rejected a first-class selectable customer tier.
-- Keep legacy tier values accepted so older data and older reports remain safe.

ALTER TABLE customer_tiers DROP CONSTRAINT IF EXISTS customer_tiers_tier_check;
ALTER TABLE customer_tiers ADD CONSTRAINT customer_tiers_tier_check
  CHECK (
    tier IN (
      'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6',
      'new', 'repeat', 'normal', 'silver', 'gold', 'platinum', 'vip',
      'blacklist', 'rejected'
    )
  );

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_customer_type_check;
ALTER TABLE customers ADD CONSTRAINT customers_customer_type_check
  CHECK (
    customer_type IS NULL OR customer_type IN (
      'tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6',
      'new', 'repeat', 'vip', 'inactive', 'normal', 'silver', 'gold',
      'platinum', 'blacklist', 'rejected'
    )
  );
