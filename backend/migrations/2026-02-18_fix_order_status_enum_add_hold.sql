-- Active: 1771439966516@@127.0.0.1@5432@trustcart_erp
-- Fix: sales_orders.status uses enum order_status_enum, but code sets status='hold'.
-- The DB enum is missing 'hold' which causes:
--   invalid input value for enum order_status_enum: "hold"
--
-- This migration safely adds 'hold' to order_status_enum if needed.

DO $$
BEGIN
  -- Only proceed if the enum type exists
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'order_status_enum'
  ) THEN
    -- Add 'hold' if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'order_status_enum'
        AND e.enumlabel = 'hold'
    ) THEN
      EXECUTE 'ALTER TYPE order_status_enum ADD VALUE ''hold''';
    END IF;
  END IF;
END $$;
