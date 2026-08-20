-- Points Ledger Migration
--
-- Introduces a ledger-based loyalty points system:
-- - customer_points (summary)
-- - point_transactions (ledger)
--
-- Run this AFTER:
-- 1) backend/membership-loyalty-migration.sql
-- 2) backend/loyalty-wallet-uuid-migration.sql (recommended, for UUID customers)

BEGIN;

-- =====================================================
-- customer_points
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_points (
  id SERIAL PRIMARY KEY,
  customer_id INT,
  customer_uuid uuid,

  active_points INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  lifetime_redeemed INT NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Allow either legacy int or UUID; both optional but must be unique when present.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_points_customer_id_unique_notnull
  ON customer_points (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_points_customer_uuid_unique_notnull
  ON customer_points (customer_uuid)
  WHERE customer_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_points_customer_uuid
  ON customer_points (customer_uuid);

-- =====================================================
-- point_transactions
-- =====================================================

CREATE TABLE IF NOT EXISTS point_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INT,
  customer_uuid uuid,

  idempotency_key varchar(100),

  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjust')),
  points INT NOT NULL,
  source VARCHAR(50) NOT NULL,
  reference_id INT,
  description TEXT,
  balance_after INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_customer_id
  ON point_transactions (customer_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_customer_uuid
  ON point_transactions (customer_uuid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_transactions_idempotency_key_unique_notnull
  ON point_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;
