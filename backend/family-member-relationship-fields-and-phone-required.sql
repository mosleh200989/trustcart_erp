-- Safe, manual migration for Family Members enhancements
-- هدف: اطمینان از وجود ستون‌های DOB/Anniversary و اجباری شدن phone برای رکوردهای جدید/ویرایش‌شده

BEGIN;

-- Add missing columns if needed (safe on re-run)
ALTER TABLE IF EXISTS customer_family_members
  ADD COLUMN IF NOT EXISTS date_of_birth date;

ALTER TABLE IF EXISTS customer_family_members
  ADD COLUMN IF NOT EXISTS anniversary_date date;

-- Enforce phone required for NEW/UPDATED rows without breaking existing data:
-- CHECK ... NOT VALID means existing rows are not scanned/blocked,
-- but all future INSERT/UPDATE must satisfy the constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'customer_family_members_phone_required'
  ) THEN
    ALTER TABLE customer_family_members
      ADD CONSTRAINT customer_family_members_phone_required
      CHECK (phone IS NOT NULL AND length(btrim(phone)) > 0)
      NOT VALID;
  END IF;
END $$;

COMMIT;

-- Optional (run later after cleaning old data):
-- ALTER TABLE customer_family_members VALIDATE CONSTRAINT customer_family_members_phone_required;
