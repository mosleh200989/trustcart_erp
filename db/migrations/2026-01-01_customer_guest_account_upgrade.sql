-- Support guest customers (created via checkout) upgrading to full accounts on registration.
-- Adds customers.is_guest and ensures customers.password can be NULL.

BEGIN;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS is_guest boolean DEFAULT true;

-- Backfill: customers with a password are not guests.
UPDATE customers
SET is_guest = false
WHERE password IS NOT NULL AND LENGTH(TRIM(password)) > 0;

-- Ensure password is nullable (some schemas might have NOT NULL).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'password'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE customers ALTER COLUMN password DROP NOT NULL;
  END IF;
END $$;

COMMIT;
