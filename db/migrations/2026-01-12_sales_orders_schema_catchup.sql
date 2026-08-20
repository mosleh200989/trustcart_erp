-- Catch-up migration for sales_orders columns expected by backend entities/services
-- Safe to run multiple times.

DO $$
BEGIN
  -- Allow guest orders: customer_id should be nullable (entity expects nullable)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales_orders'
      AND column_name = 'customer_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE sales_orders ALTER COLUMN customer_id DROP NOT NULL;
  END IF;

  -- Guest contact info (Thank You Offer / guest checkout)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN customer_name VARCHAR(150) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN customer_email VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN customer_phone VARCHAR(30) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'thank_you_offer_accepted'
  ) THEN
    ALTER TABLE sales_orders ADD COLUMN thank_you_offer_accepted BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Enhanced order management fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'shipping_address') THEN
    ALTER TABLE sales_orders ADD COLUMN shipping_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'courier_notes') THEN
    ALTER TABLE sales_orders ADD COLUMN courier_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'rider_instructions') THEN
    ALTER TABLE sales_orders ADD COLUMN rider_instructions TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'internal_notes') THEN
    ALTER TABLE sales_orders ADD COLUMN internal_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'cancel_reason') THEN
    ALTER TABLE sales_orders ADD COLUMN cancel_reason VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'approved_by') THEN
    ALTER TABLE sales_orders ADD COLUMN approved_by INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'approved_at') THEN
    ALTER TABLE sales_orders ADD COLUMN approved_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'cancelled_by') THEN
    ALTER TABLE sales_orders ADD COLUMN cancelled_by INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'cancelled_at') THEN
    ALTER TABLE sales_orders ADD COLUMN cancelled_at TIMESTAMP;
  END IF;

  -- Order source tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'user_ip') THEN
    ALTER TABLE sales_orders ADD COLUMN user_ip VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'geo_location') THEN
    ALTER TABLE sales_orders ADD COLUMN geo_location JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'browser_info') THEN
    ALTER TABLE sales_orders ADD COLUMN browser_info VARCHAR(255);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'device_type') THEN
    ALTER TABLE sales_orders ADD COLUMN device_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'operating_system') THEN
    ALTER TABLE sales_orders ADD COLUMN operating_system VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'traffic_source') THEN
    ALTER TABLE sales_orders ADD COLUMN traffic_source VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'referrer_url') THEN
    ALTER TABLE sales_orders ADD COLUMN referrer_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'utm_source') THEN
    ALTER TABLE sales_orders ADD COLUMN utm_source VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'utm_medium') THEN
    ALTER TABLE sales_orders ADD COLUMN utm_medium VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'utm_campaign') THEN
    ALTER TABLE sales_orders ADD COLUMN utm_campaign VARCHAR(100);
  END IF;

  -- Courier integration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'courier_company') THEN
    ALTER TABLE sales_orders ADD COLUMN courier_company VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'courier_order_id') THEN
    ALTER TABLE sales_orders ADD COLUMN courier_order_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'tracking_id') THEN
    ALTER TABLE sales_orders ADD COLUMN tracking_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'courier_status') THEN
    ALTER TABLE sales_orders ADD COLUMN courier_status VARCHAR(50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'shipped_at') THEN
    ALTER TABLE sales_orders ADD COLUMN shipped_at TIMESTAMP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'delivered_at') THEN
    ALTER TABLE sales_orders ADD COLUMN delivered_at TIMESTAMP;
  END IF;
END $$;

SELECT 'sales_orders schema catch-up applied' AS status;
