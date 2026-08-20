-- =====================================================
-- OFFER / PROMOTION ENGINE - COMPLETE SCHEMA
-- =====================================================

-- Offer Types Enum
CREATE TYPE offer_type_enum AS ENUM (
  'PERCENTAGE',
  'FLAT_DISCOUNT', 
  'BOGO',
  'FREE_PRODUCT',
  'BUNDLE',
  'CATEGORY_DISCOUNT'
);

-- Condition Types Enum
CREATE TYPE condition_type_enum AS ENUM (
  'CART_TOTAL',
  'PRODUCT_QTY',
  'CATEGORY',
  'BRAND',
  'FIRST_ORDER',
  'USER_LEVEL',
  'USER_SEGMENT',
  'MIN_ITEMS'
);

-- Reward Types Enum
CREATE TYPE reward_type_enum AS ENUM (
  'DISCOUNT_PERCENT',
  'DISCOUNT_FLAT',
  'FREE_PRODUCT',
  'FREE_SHIPPING'
);

-- 1. Main Offers Table
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  offer_type offer_type_enum NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  priority INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  auto_apply BOOLEAN DEFAULT false,
  max_usage_total INTEGER,
  current_usage INTEGER DEFAULT 0,
  max_usage_per_user INTEGER DEFAULT 1,
  min_cart_amount DECIMAL(15,2),
  max_discount_amount DECIMAL(15,2),
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Offer Conditions (Rule Engine)
CREATE TABLE IF NOT EXISTS offer_conditions (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  condition_type condition_type_enum NOT NULL,
  operator VARCHAR(10) NOT NULL, -- >=, <=, =, IN, NOT IN
  value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Offer Rewards (What customer gets)
CREATE TABLE IF NOT EXISTS offer_rewards (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  reward_type reward_type_enum NOT NULL,
  value JSONB NOT NULL, -- {percent: 90} or {amount: 500} or {product_id: 123}
  max_free_qty INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Offer Products (Applicable Products)
CREATE TABLE IF NOT EXISTS offer_products (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT false, -- Must have this product
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(offer_id, product_id)
);

-- 5. Offer Categories (Applicable Categories)
CREATE TABLE IF NOT EXISTS offer_categories (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(offer_id, category_id)
);

-- 6. Offer Usage Tracking
CREATE TABLE IF NOT EXISTS offer_usage (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id),
  customer_id INTEGER,
  order_id INTEGER,
  discount_amount DECIMAL(15,2),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Offer Codes (Coupon Codes)
CREATE TABLE IF NOT EXISTS offer_codes (
  id SERIAL PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_offers_status_time ON offers(status, start_time, end_time);
CREATE INDEX idx_offers_auto_apply ON offers(auto_apply) WHERE auto_apply = true;
CREATE INDEX idx_offer_usage_customer ON offer_usage(customer_id);
CREATE INDEX idx_offer_usage_offer ON offer_usage(offer_id);
CREATE INDEX idx_offer_products_product ON offer_products(product_id);
CREATE INDEX idx_offer_codes_code ON offer_codes(code);

-- Sample Flash Sale Offer (1 hour 90% discount)
INSERT INTO offers (name, description, offer_type, start_time, end_time, priority, auto_apply, max_usage_total) 
VALUES (
  'Flash Sale - 90% OFF',
  '1 hour mega discount on all products',
  'PERCENTAGE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '1 hour',
  100,
  true,
  1000
);

-- Add reward for flash sale
INSERT INTO offer_rewards (offer_id, reward_type, value)
VALUES (
  (SELECT id FROM offers WHERE name = 'Flash Sale - 90% OFF'),
  'DISCOUNT_PERCENT',
  '{"percent": 90}'
);

COMMENT ON TABLE offers IS 'Main offer/promotion configuration';
COMMENT ON TABLE offer_conditions IS 'Rules that must be satisfied for offer to apply';
COMMENT ON TABLE offer_rewards IS 'Benefits customer receives when offer applies';
COMMENT ON TABLE offer_usage IS 'Track how many times each offer has been used';
