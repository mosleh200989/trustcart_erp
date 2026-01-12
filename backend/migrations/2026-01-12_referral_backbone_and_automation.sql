-- Referral backbone + automation (campaigns, partners, attribution, both-side rewards)
-- Run manually in Postgres.

BEGIN;

-- UUID helper
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Referral campaigns
CREATE TABLE IF NOT EXISTS referral_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  reward_type varchar(20) NOT NULL DEFAULT 'wallet',
  reward_referrer_amount decimal(10,2) NOT NULL DEFAULT 100,
  reward_referred_amount decimal(10,2) NOT NULL DEFAULT 0,
  starts_at timestamp NULL,
  ends_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure a default campaign exists (id referenced by app logic)
INSERT INTO referral_campaigns (name, reward_referrer_amount, reward_referred_amount)
SELECT 'Default Referral Campaign', 100, 0
WHERE NOT EXISTS (SELECT 1 FROM referral_campaigns WHERE name = 'Default Referral Campaign');

-- 2) Influencer/community partner codes (attribution + reporting)
CREATE TABLE IF NOT EXISTS referral_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) NOT NULL UNIQUE,
  partner_type varchar(30) NOT NULL DEFAULT 'influencer',
  name text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3) Persist referral attribution on customer
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS referred_by_customer_id int NULL,
  ADD COLUMN IF NOT EXISTS referred_by_code varchar(50) NULL,
  ADD COLUMN IF NOT EXISTS referred_by_partner_id uuid NULL,
  ADD COLUMN IF NOT EXISTS referred_channel varchar(30) NULL,
  ADD COLUMN IF NOT EXISTS referred_at timestamp NULL,
  ADD COLUMN IF NOT EXISTS referral_campaign_id uuid NULL;

-- FK safety (only add if table/column types match)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'referred_by_partner_id'
  ) THEN
    BEGIN
      ALTER TABLE customers
        ADD CONSTRAINT fk_customers_referred_by_partner
        FOREIGN KEY (referred_by_partner_id) REFERENCES referral_partners(id)
        ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;

  BEGIN
    ALTER TABLE customers
      ADD CONSTRAINT fk_customers_referral_campaign
      FOREIGN KEY (referral_campaign_id) REFERENCES referral_campaigns(id)
      ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 4) Extend customer_referrals for attribution + both-side rewards
ALTER TABLE customer_referrals
  ADD COLUMN IF NOT EXISTS share_code_used varchar(50) NULL,
  ADD COLUMN IF NOT EXISTS source_channel varchar(30) NULL,
  ADD COLUMN IF NOT EXISTS campaign_id uuid NULL,
  ADD COLUMN IF NOT EXISTS partner_id uuid NULL,
  ADD COLUMN IF NOT EXISTS referred_reward_amount decimal(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_reward_credited boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  BEGIN
    ALTER TABLE customer_referrals
      ADD CONSTRAINT fk_customer_referrals_campaign
      FOREIGN KEY (campaign_id) REFERENCES referral_campaigns(id)
      ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE customer_referrals
      ADD CONSTRAINT fk_customer_referrals_partner
      FOREIGN KEY (partner_id) REFERENCES referral_partners(id)
      ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Prevent multiple referrers per referred customer
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_referrals_referred_customer_id
  ON customer_referrals (referred_customer_id)
  WHERE referred_customer_id IS NOT NULL;

-- 5) Referral events (audit log)
CREATE TABLE IF NOT EXISTS referral_events (
  id bigserial PRIMARY KEY,
  event_type varchar(40) NOT NULL,
  referral_id int NULL,
  referrer_customer_id int NULL,
  referred_customer_id int NULL,
  order_id int NULL,
  share_code_used varchar(50) NULL,
  partner_code varchar(50) NULL,
  source_channel varchar(30) NULL,
  payload jsonb NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_events_referral_id ON referral_events(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer_id ON referral_events(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_referred_id ON referral_events(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_order_id ON referral_events(order_id);

-- 6) Update referral reward trigger to support both-side wallet credits
-- NOTE: This trigger is optional because application code also credits idempotently.
CREATE OR REPLACE FUNCTION credit_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_wallet_id INT;
  v_referred_wallet_id INT;
  v_referrer_id INT;
  v_referred_id INT;
  v_referrer_reward DECIMAL(10,2);
  v_referred_reward DECIMAL(10,2);
BEGIN
  v_referrer_id := NEW.referrer_customer_id;
  v_referred_id := NEW.referred_customer_id;
  v_referrer_reward := COALESCE(NEW.reward_amount, 0);
  v_referred_reward := COALESCE(NEW.referred_reward_amount, 0);

  -- First order placed transition
  IF NEW.referred_customer_id IS NOT NULL AND OLD.first_order_placed = false AND NEW.first_order_placed = true THEN

    -- Credit referrer (if not already credited)
    IF COALESCE(NEW.reward_credited, false) = false AND v_referrer_id IS NOT NULL AND v_referrer_reward > 0 THEN
      INSERT INTO customer_wallets (customer_id, balance, total_earned)
      VALUES (v_referrer_id, 0, 0)
      ON CONFLICT (customer_id) DO NOTHING;

      SELECT id INTO v_referrer_wallet_id FROM customer_wallets WHERE customer_id = v_referrer_id;

      UPDATE customer_wallets
      SET
        balance = balance + v_referrer_reward,
        total_earned = total_earned + v_referrer_reward,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = v_referrer_id;

      INSERT INTO wallet_transactions (
        wallet_id, customer_id, transaction_type, amount, source,
        reference_id, description, balance_after
      )
      VALUES (
        v_referrer_wallet_id, v_referrer_id, 'credit', v_referrer_reward, 'referral',
        NEW.id, 'Referral reward',
        (SELECT balance FROM customer_wallets WHERE customer_id = v_referrer_id)
      );

      NEW.reward_credited := true;
    END IF;

    -- Credit referred customer (if configured)
    IF COALESCE(NEW.referred_reward_credited, false) = false AND v_referred_id IS NOT NULL AND v_referred_reward > 0 THEN
      INSERT INTO customer_wallets (customer_id, balance, total_earned)
      VALUES (v_referred_id, 0, 0)
      ON CONFLICT (customer_id) DO NOTHING;

      SELECT id INTO v_referred_wallet_id FROM customer_wallets WHERE customer_id = v_referred_id;

      UPDATE customer_wallets
      SET
        balance = balance + v_referred_reward,
        total_earned = total_earned + v_referred_reward,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = v_referred_id;

      INSERT INTO wallet_transactions (
        wallet_id, customer_id, transaction_type, amount, source,
        reference_id, description, balance_after
      )
      VALUES (
        v_referred_wallet_id, v_referred_id, 'credit', v_referred_reward, 'referral',
        NEW.id, 'Referral welcome bonus',
        (SELECT balance FROM customer_wallets WHERE customer_id = v_referred_id)
      );

      NEW.referred_reward_credited := true;
    END IF;

    NEW.completed_at := CURRENT_TIMESTAMP;
    NEW.status := 'completed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_credit_referral ON customer_referrals;
CREATE TRIGGER trigger_credit_referral
  BEFORE UPDATE ON customer_referrals
  FOR EACH ROW
  EXECUTE FUNCTION credit_referral_reward();

COMMIT;

-- Quick sanity checks (optional)
-- SELECT * FROM referral_campaigns ORDER BY created_at DESC;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name='customers' AND column_name LIKE 'referred_%' ORDER BY column_name;
