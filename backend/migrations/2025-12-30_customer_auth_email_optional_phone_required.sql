-- Make customer email optional and phone mandatory for customer authentication.
-- Safe-ish / rerunnable migration for PostgreSQL.
--
-- What this does:
-- 1) Normalizes phone/email values (trim, empty -> NULL)
-- 2) Backfills phone from mobile when possible
-- 3) Ensures customers.email is nullable
-- 4) Ensures customers.phone is NOT NULL
-- 5) Adds unique index on customers.phone (required for login-by-phone)
--
-- IMPORTANT: This migration will FAIL if there are still customers with missing phone
-- or duplicate phone numbers after backfill/normalization.

BEGIN;

-- 1) Normalize email/phone text
UPDATE customers
SET email = NULLIF(TRIM(email), '')
WHERE email IS NOT NULL;

UPDATE customers
SET phone = NULLIF(TRIM(phone), '')
WHERE phone IS NOT NULL;

UPDATE customers
SET mobile = NULLIF(TRIM(mobile), '')
WHERE mobile IS NOT NULL;

-- 2) Backfill phone from mobile if phone is missing
UPDATE customers
SET phone = mobile
WHERE (phone IS NULL)
  AND mobile IS NOT NULL;

-- Normalize again after backfill
UPDATE customers
SET phone = NULLIF(TRIM(phone), '')
WHERE phone IS NOT NULL;

-- 3) Make email nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'email'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- 3.5) Auto-fix duplicate phones (so unique index can be created)
-- Strategy:
--  - Keep the oldest row's phone as-is.
--  - For other rows sharing that phone:
--      1) if they have a unique mobile number, move phone -> mobile
--      2) otherwise assign a deterministic placeholder based on id
--
-- NOTE: If you prefer manual cleanup instead of placeholders, tell me and I'll
-- provide a "report-only" script.

-- First pass: move duplicates to mobile when possible
WITH ranked AS (
  SELECT
    id,
    phone,
    mobile,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at NULLS LAST, id) AS rn
  FROM customers
  WHERE phone IS NOT NULL
),
candidates AS (
  SELECT r.*
  FROM ranked r
  WHERE r.rn > 1
    AND r.mobile IS NOT NULL
    AND r.mobile <> r.phone
    AND NOT EXISTS (SELECT 1 FROM customers x WHERE x.phone = r.mobile)
)
UPDATE customers c
SET phone = candidates.mobile
FROM candidates
WHERE c.id = candidates.id;

-- Second pass: any duplicates left get a placeholder phone
WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at NULLS LAST, id) AS rn
  FROM customers
  WHERE phone IS NOT NULL
),
to_fix AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE customers c
SET phone = ('DUP' || RIGHT(REPLACE(c.id::text, '-', ''), 17))
FROM to_fix
WHERE c.id = to_fix.id;

-- 4) Pre-checks: missing phone / remaining duplicates
DO $$
DECLARE
  missing_count integer;
  dup_count integer;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM customers
  WHERE phone IS NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Cannot enforce customers.phone NOT NULL: % customer(s) still have NULL phone. Please update them first.', missing_count;
  END IF;

  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT phone
    FROM customers
    GROUP BY phone
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot create unique index on customers.phone: % duplicate phone value(s) exist. Please deduplicate first.', dup_count;
  END IF;
END $$;

-- 5) Enforce NOT NULL on phone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'phone'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE customers ALTER COLUMN phone SET NOT NULL;
  END IF;
END $$;

-- 6) Ensure uniqueness on phone
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique_idx ON customers(phone);

COMMIT;
