-- Add Pickup Failed as a selectable order status.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
    ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'pickup_failed';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'landing_page_order_status') THEN
    ALTER TYPE landing_page_order_status ADD VALUE IF NOT EXISTS 'pickup_failed';
  END IF;
END $$;
