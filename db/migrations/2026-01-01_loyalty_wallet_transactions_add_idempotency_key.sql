-- Fix wallet page 500:
-- TypeORM entity WalletTransaction expects wallet_transactions.idempotency_key.
-- Some DBs were created without running wallet-ledger-hardening-migration.sql.
-- This migration is safe/rerunnable.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'wallet_transactions'
  ) THEN
    -- idempotency_key
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions'
        AND column_name = 'idempotency_key'
    ) THEN
      ALTER TABLE wallet_transactions
        ADD COLUMN idempotency_key varchar(100);
    END IF;

    -- status (also expected by entity; add if missing)
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions'
        AND column_name = 'status'
    ) THEN
      ALTER TABLE wallet_transactions
        ADD COLUMN status varchar(20) NOT NULL DEFAULT 'posted';
    END IF;
  END IF;
END $$;

-- Idempotency uniqueness (allows NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_idempotency_key_unique_notnull
  ON wallet_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status
  ON wallet_transactions (status);

COMMIT;
