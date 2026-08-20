-- Wallet Ledger Hardening Migration
--
-- Adds idempotency + status fields to wallet_transactions for safe retries,
-- and adds supporting indexes.
--
-- Run this AFTER:
-- 1) backend/membership-loyalty-migration.sql
-- 2) backend/loyalty-wallet-uuid-migration.sql (recommended)

BEGIN;

-- =====================================================
-- wallet_transactions
-- =====================================================

ALTER TABLE IF EXISTS wallet_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(100);

ALTER TABLE IF EXISTS wallet_transactions
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'posted';

-- Idempotency uniqueness (allows NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_idempotency_key_unique_notnull
  ON wallet_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status
  ON wallet_transactions (status);

COMMIT;
