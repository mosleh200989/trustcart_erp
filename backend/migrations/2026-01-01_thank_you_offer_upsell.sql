-- Adds support for post-purchase (Thank You page) offer + prevents duplicate acceptance

DO $$
BEGIN
  -- Special offers: add context + upsell fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'special_offers' AND column_name = 'context'
  ) THEN
    ALTER TABLE special_offers
      ADD COLUMN context VARCHAR(50) NOT NULL DEFAULT 'homepage';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'special_offers' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE special_offers
      ADD COLUMN product_id INT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'special_offers' AND column_name = 'offer_price'
  ) THEN
    ALTER TABLE special_offers
      ADD COLUMN offer_price NUMERIC(12,2) NULL;
  END IF;

  -- Sales orders: flag to prevent applying offer twice
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'thank_you_offer_accepted'
  ) THEN
    ALTER TABLE sales_orders
      ADD COLUMN thank_you_offer_accepted BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Sales orders: store guest contact info so orders can be shown after account registration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE sales_orders
      ADD COLUMN customer_name VARCHAR(150) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE sales_orders
      ADD COLUMN customer_email VARCHAR(255) NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_orders' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE sales_orders
      ADD COLUMN customer_phone VARCHAR(30) NULL;
  END IF;
END $$;
