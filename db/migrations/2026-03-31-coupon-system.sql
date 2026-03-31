-- =============================================
-- Coupon System: Campaigns + Customer Assignments
-- =============================================
-- Run:
--   psql -U postgres -d trustcart -f db/migrations/2026-03-31-coupon-system.sql
--
-- IDEMPOTENT — safe to run multiple times.
-- =============================================

BEGIN;

-- ──────────────────────────────────────────────────
-- 1. COUPON CAMPAIGNS (each campaign = one coupon code)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_campaigns (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    code                VARCHAR(50),                          -- the coupon code customers enter (e.g. SAVE100)
    description         TEXT,
    trigger_product_id  INT,                                  -- product purchase that triggers coupon generation (NULL = manual only)
    discount_type       VARCHAR(20) NOT NULL DEFAULT 'fixed', -- 'fixed' or 'percentage'
    discount_value      DECIMAL(12,2) NOT NULL DEFAULT 0,     -- amount (fixed) or rate (percentage)
    min_order_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,     -- threshold: order must exceed this to use coupon
    max_discount_amount DECIMAL(12,2),                        -- cap for percentage discounts (NULL = no cap)
    max_uses            INT,                                  -- total uses allowed (NULL = unlimited)
    per_customer_limit  INT NOT NULL DEFAULT 1,               -- uses per customer
    usage_count         INT NOT NULL DEFAULT 0,               -- current total usage count
    expiry_days         INT NOT NULL DEFAULT 30,              -- days from issue date until coupon expires
    valid_from          TIMESTAMP,                            -- campaign start date
    valid_until         TIMESTAMP,                            -- campaign end date
    is_restricted       BOOLEAN DEFAULT false,                -- if true, only assigned customers can use
    is_active           BOOLEAN DEFAULT true,
    created_by          INT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- Add new columns to existing table (safe if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupon_campaigns' AND column_name = 'code') THEN
        ALTER TABLE coupon_campaigns ADD COLUMN code VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupon_campaigns' AND column_name = 'max_uses') THEN
        ALTER TABLE coupon_campaigns ADD COLUMN max_uses INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupon_campaigns' AND column_name = 'per_customer_limit') THEN
        ALTER TABLE coupon_campaigns ADD COLUMN per_customer_limit INT NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupon_campaigns' AND column_name = 'usage_count') THEN
        ALTER TABLE coupon_campaigns ADD COLUMN usage_count INT NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupon_campaigns' AND column_name = 'valid_from') THEN
        ALTER TABLE coupon_campaigns ADD COLUMN valid_from TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupon_campaigns' AND column_name = 'valid_until') THEN
        ALTER TABLE coupon_campaigns ADD COLUMN valid_until TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coupon_campaigns' AND column_name = 'is_restricted') THEN
        ALTER TABLE coupon_campaigns ADD COLUMN is_restricted BOOLEAN DEFAULT false;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_campaigns_code    ON coupon_campaigns(UPPER(code)) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_trigger ON coupon_campaigns(trigger_product_id) WHERE trigger_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_active  ON coupon_campaigns(is_active);

-- ──────────────────────────────────────────────────
-- 2. CAMPAIGN CUSTOMERS (assignments + usage tracking)
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_customers (
    id                  SERIAL PRIMARY KEY,
    campaign_id         INT NOT NULL REFERENCES coupon_campaigns(id) ON DELETE CASCADE,
    customer_id         INT,                                  -- owner (from customers table)
    customer_phone      VARCHAR(30),                          -- phone for matching
    customer_name       VARCHAR(150),                         -- display name
    times_used          INT NOT NULL DEFAULT 0,               -- how many times this customer used the campaign
    last_used_at        TIMESTAMP,
    last_used_order_id  INT,
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_customers_campaign     ON campaign_customers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_customers_customer     ON campaign_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_customers_phone        ON campaign_customers(customer_phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_customers_uniq  ON campaign_customers(campaign_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_customers_uniq_phone ON campaign_customers(campaign_id, customer_phone) WHERE customer_phone IS NOT NULL AND customer_id IS NULL;

-- Drop old table if it exists (from earlier iteration)
DROP TABLE IF EXISTS customer_coupons;

-- Add coupon_code and coupon_discount columns to sales_orders if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'coupon_code') THEN
        ALTER TABLE sales_orders ADD COLUMN coupon_code VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_orders' AND column_name = 'coupon_discount') THEN
        ALTER TABLE sales_orders ADD COLUMN coupon_discount DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

COMMIT;
