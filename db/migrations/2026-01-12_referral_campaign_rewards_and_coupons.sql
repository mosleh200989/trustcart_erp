-- Referral campaign reward types + coupon/free-product issuance + wallet withdrawals
-- Run manually in Postgres.

BEGIN;

-- 1) Extend referral_campaigns to support points/coupons/free-products/VIP rules
ALTER TABLE referral_campaigns
  ADD COLUMN IF NOT EXISTS reward_referrer_points int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_referred_points int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_offer_id int NULL,
  ADD COLUMN IF NOT EXISTS referred_offer_id int NULL,
  ADD COLUMN IF NOT EXISTS vip_referrals_threshold int NULL,
  ADD COLUMN IF NOT EXISTS vip_membership_tier varchar(20) NULL;

-- 2) Extend offer_codes to support customer-assigned single-use codes
ALTER TABLE offer_codes
  ADD COLUMN IF NOT EXISTS assigned_customer_id int NULL,
  ADD COLUMN IF NOT EXISTS max_uses_per_customer int NULL,
  ADD COLUMN IF NOT EXISTS valid_from timestamp NULL,
  ADD COLUMN IF NOT EXISTS valid_to timestamp NULL;

CREATE INDEX IF NOT EXISTS idx_offer_codes_assigned_customer_id ON offer_codes(assigned_customer_id);

-- 3) Extend customer_referrals to support agent attribution and order linkage
ALTER TABLE customer_referrals
  ADD COLUMN IF NOT EXISTS agent_user_id int NULL,
  ADD COLUMN IF NOT EXISTS qualifying_order_id int NULL;

-- 4) Extend sales_orders to store applied offer/coupon metadata (optional)
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS discount_amount decimal(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offer_id int NULL,
  ADD COLUMN IF NOT EXISTS offer_code varchar(50) NULL;

CREATE INDEX IF NOT EXISTS idx_sales_orders_offer_id ON sales_orders(offer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_offer_code ON sales_orders(offer_code);

-- 5) Wallet withdrawal requests (cash-out workflow)
CREATE TABLE IF NOT EXISTS wallet_withdrawal_requests (
  id bigserial PRIMARY KEY,
  customer_id int NOT NULL,
  amount decimal(12,2) NOT NULL,
  method varchar(30) NOT NULL DEFAULT 'bkash',
  account varchar(80) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  notes text NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_customer_id ON wallet_withdrawal_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawal_status ON wallet_withdrawal_requests(status);

COMMIT;
