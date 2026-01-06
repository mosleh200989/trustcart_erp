-- =====================================================
-- FAMILY MEMBER -> ACCOUNT CREATION SUPPORT
--
-- Goal:
-- - Phone is mandatory for family members (already enforced at API level)
-- - Prevent duplicate ACTIVE family links per customer+phone
-- - Improve lookup performance by phone
--
-- This migration is SAFE to run multiple times.
-- =====================================================

BEGIN;

-- 1) Ensure the column exists (legacy safety)
ALTER TABLE IF EXISTS customer_family_members
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 2) Enforce phone presence via a NOT VALID check constraint (won't scan existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_family_members_phone_required'
  ) THEN
    ALTER TABLE customer_family_members
      ADD CONSTRAINT customer_family_members_phone_required
      CHECK (phone IS NOT NULL AND length(trim(phone)) > 0) NOT VALID;
  END IF;
END $$;

-- Optional validation step (run manually after you confirm there are no bad rows):
-- ALTER TABLE customer_family_members VALIDATE CONSTRAINT customer_family_members_phone_required;

-- 3) Fast lookups by phone
CREATE INDEX IF NOT EXISTS idx_customer_family_members_phone
  ON customer_family_members(phone);

-- 4) Prevent duplicates: one active family row per (customer_id, phone)
-- Using a partial unique index keeps historical (inactive) rows allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_family_members_customer_phone_active
  ON customer_family_members(customer_id, phone)
  WHERE is_active = true;

COMMIT;
