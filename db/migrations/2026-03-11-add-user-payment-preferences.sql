-- Migration: Add payment preference columns to users table
-- Date: 2026-03-11
-- Description: Adds individual MFS number columns (bkash, nagad, rocket) and bank transfer fields.
--              Replaces the old single payment_phone column with per-method columns.
--              payment_method stores the user's preferred/default method.

-- Add new individual MFS number columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS bkash_number VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nagad_number VARCHAR(20) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rocket_number VARCHAR(20) DEFAULT NULL;

-- Ensure preferred method and bank columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch_name VARCHAR(100) DEFAULT NULL;

-- Migrate data from old payment_phone column to the appropriate MFS column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'payment_phone') THEN
    UPDATE users SET bkash_number = payment_phone WHERE payment_method = 'bkash' AND payment_phone IS NOT NULL AND bkash_number IS NULL;
    UPDATE users SET nagad_number = payment_phone WHERE payment_method = 'nagad' AND payment_phone IS NOT NULL AND nagad_number IS NULL;
    UPDATE users SET rocket_number = payment_phone WHERE payment_method = 'rocket' AND payment_phone IS NOT NULL AND rocket_number IS NULL;
    ALTER TABLE users DROP COLUMN payment_phone;
  END IF;
END $$;
