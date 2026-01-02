-- Checkout change: district/city fields removed from checkout UI.
-- This migration makes district/city optional at the DB level (drops NOT NULL if present)
-- and normalizes empty strings to NULL.
--
-- Safe-ish / rerunnable migration for PostgreSQL.

BEGIN;

-- Normalize customers district/city (only if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'district'
  ) THEN
    EXECUTE 'UPDATE customers SET district = NULLIF(TRIM(district), '''') WHERE district IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'city'
  ) THEN
    EXECUTE 'UPDATE customers SET city = NULLIF(TRIM(city), '''') WHERE city IS NOT NULL';
  END IF;
END $$;

-- Drop NOT NULL constraints if any exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'district'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE customers ALTER COLUMN district DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers'
      AND column_name = 'city'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE customers ALTER COLUMN city DROP NOT NULL;
  END IF;
END $$;

-- Normalize customer_addresses district/city (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_addresses') THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'customer_addresses'
        AND column_name = 'district'
    ) THEN
      EXECUTE 'UPDATE customer_addresses SET district = NULLIF(TRIM(district), '''') WHERE district IS NOT NULL';

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customer_addresses'
          AND column_name = 'district'
          AND is_nullable = 'NO'
      ) THEN
        EXECUTE 'ALTER TABLE customer_addresses ALTER COLUMN district DROP NOT NULL';
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'customer_addresses'
        AND column_name = 'city'
    ) THEN
      EXECUTE 'UPDATE customer_addresses SET city = NULLIF(TRIM(city), '''') WHERE city IS NOT NULL';

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'customer_addresses'
          AND column_name = 'city'
          AND is_nullable = 'NO'
      ) THEN
        EXECUTE 'ALTER TABLE customer_addresses ALTER COLUMN city DROP NOT NULL';
      END IF;
    END IF;
  END IF;
END $$;

COMMIT;
