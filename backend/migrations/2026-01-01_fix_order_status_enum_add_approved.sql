-- Fix: sales_orders.status uses enum order_status_enum, but code sets status='approved'.
-- Some DBs are missing 'approved' in order_status_enum which causes:
--   invalid input value for enum order_status_enum: "approved"
--
-- This migration safely adds 'approved' to order_status_enum if needed.

DO $$
BEGIN
  -- Only proceed if the enum type exists
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'order_status_enum'
  ) THEN
    -- Add enum value if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'order_status_enum'
        AND e.enumlabel = 'approved'
    ) THEN
      EXECUTE 'ALTER TYPE order_status_enum ADD VALUE ''approved''';
    END IF;
  END IF;
END $$;
