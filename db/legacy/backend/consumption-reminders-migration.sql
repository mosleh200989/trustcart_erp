-- =====================================================
-- PRODUCT CONSUMPTION PROFILES + PER-PRODUCT REMINDERS
-- Also extends membership tier to include 'permanent'
-- =====================================================

-- 1) Extend membership tiers: add permanent + card number
ALTER TABLE customer_memberships
  ADD COLUMN IF NOT EXISTS permanent_card_number VARCHAR(50);

-- Drop the old CHECK constraint if it exists (Postgres default naming)
ALTER TABLE customer_memberships
  DROP CONSTRAINT IF EXISTS customer_memberships_membership_tier_check;

ALTER TABLE customer_memberships
  ADD CONSTRAINT customer_memberships_membership_tier_check
  CHECK (membership_tier IN ('none', 'silver', 'gold', 'permanent'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_memberships_permanent_card
  ON customer_memberships(permanent_card_number)
  WHERE permanent_card_number IS NOT NULL;

-- 2) Product/category-level consumption configuration
CREATE TABLE IF NOT EXISTS product_consumption_profiles (
  id SERIAL PRIMARY KEY,
  product_id INT NULL,
  category_id INT NULL,
  avg_consumption_days INT NOT NULL DEFAULT 30,
  buffer_days INT NOT NULL DEFAULT 7,
  min_days INT NOT NULL DEFAULT 7,
  max_days INT NOT NULL DEFAULT 180,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (product_id IS NOT NULL AND category_id IS NULL)
    OR (product_id IS NULL AND category_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consumption_profile_product
  ON product_consumption_profiles(product_id)
  WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consumption_profile_category
  ON product_consumption_profiles(category_id)
  WHERE category_id IS NOT NULL;

COMMENT ON TABLE product_consumption_profiles IS 'Consumption cycle settings for reminders (per product OR per category)';

-- 3) Current reminder state per customer+product
CREATE TABLE IF NOT EXISTS customer_product_reminders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  product_id INT NOT NULL,
  last_order_id INT NULL,
  last_order_date DATE NOT NULL,
  reminder_due_date DATE NOT NULL,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP NULL,
  reminder_channel VARCHAR(20) NULL CHECK (reminder_channel IN ('whatsapp','sms','call','email')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_product_reminders_due
  ON customer_product_reminders(reminder_due_date);

CREATE INDEX IF NOT EXISTS idx_customer_product_reminders_sent
  ON customer_product_reminders(reminder_sent);

COMMENT ON TABLE customer_product_reminders IS 'Per-product repeat purchase reminders (computed from last order + consumption profile)';
