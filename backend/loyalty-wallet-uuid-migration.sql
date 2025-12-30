-- Adds UUID support to loyalty wallet tables for UUID-based customers.
--
-- Goal: allow customer portal accounts (UUID customer IDs) to use wallet endpoints
-- without breaking legacy setups that used INT customer_id.
--
-- This migration:
-- - adds customer_uuid UUID columns
-- - relaxes NOT NULL / UNIQUE constraints on legacy customer_id
-- - adds partial unique indexes for both legacy int and UUID identifiers

BEGIN;

-- Ensure UUID support exists (usually already present in the DB)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- customer_wallets
-- =====================================================

ALTER TABLE IF EXISTS customer_wallets
  ADD COLUMN IF NOT EXISTS customer_uuid uuid;

-- Allow wallets to be keyed by customer_uuid (legacy int customer_id becomes optional)
ALTER TABLE IF EXISTS customer_wallets
  ALTER COLUMN customer_id DROP NOT NULL;

-- Drop the existing UNIQUE constraint on customer_id (name may vary)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'customer_wallets'::regclass
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) ILIKE '%(customer_id)%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE customer_wallets DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Re-introduce uniqueness as partial indexes (allows NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_wallets_customer_id_unique_notnull
  ON customer_wallets (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_wallets_customer_uuid_unique_notnull
  ON customer_wallets (customer_uuid)
  WHERE customer_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_wallets_customer_uuid
  ON customer_wallets (customer_uuid);

-- =====================================================
-- wallet_transactions
-- =====================================================

ALTER TABLE IF EXISTS wallet_transactions
  ADD COLUMN IF NOT EXISTS customer_uuid uuid;

ALTER TABLE IF EXISTS wallet_transactions
  ALTER COLUMN customer_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_uuid
  ON wallet_transactions (customer_uuid);

COMMIT;
