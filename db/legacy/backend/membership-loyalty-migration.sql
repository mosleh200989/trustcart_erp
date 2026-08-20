-- =====================================================
-- CUSTOMER MEMBERSHIP & LOYALTY PROGRAM
-- Silver/Gold Tiers + Referral + Subscription System
-- =====================================================

-- =====================================================
-- 1. MEMBERSHIP TIERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_memberships (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    membership_tier VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (membership_tier IN ('none', 'silver', 'gold')),
    
    -- Discount rates
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    free_delivery_count INT DEFAULT 0,
    free_delivery_used INT DEFAULT 0,
    
    -- Membership stats
    total_monthly_spend DECIMAL(10,2) DEFAULT 0,
    current_month_spend DECIMAL(10,2) DEFAULT 0,
    last_order_date DATE,
    
    -- Benefits tracking
    price_lock_enabled BOOLEAN DEFAULT false,
    birthday_gift_sent BOOLEAN DEFAULT false,
    eid_gift_sent BOOLEAN DEFAULT false,
    
    -- Membership dates
    tier_achieved_at TIMESTAMP,
    tier_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_membership_customer ON customer_memberships(customer_id);
CREATE INDEX idx_membership_tier ON customer_memberships(membership_tier);

COMMENT ON TABLE customer_memberships IS 'Customer membership tiers: Silver (5K/month), Gold (>5K/month)';

-- =====================================================
-- 2. CUSTOMER WALLET TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_wallets (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_customer ON customer_wallets(customer_id);

COMMENT ON TABLE customer_wallets IS 'Customer wallet for referral earnings';

-- =====================================================
-- 3. WALLET TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL,
    customer_id INT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    amount DECIMAL(10,2) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('referral', 'bonus', 'refund', 'purchase', 'withdrawal')),
    reference_id INT,
    description TEXT,
    balance_after DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_trans_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_trans_customer ON wallet_transactions(customer_id);
CREATE INDEX idx_wallet_trans_type ON wallet_transactions(transaction_type);

COMMENT ON TABLE wallet_transactions IS 'All wallet credit/debit transactions';

-- =====================================================
-- 4. REFERRAL PROGRAM TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_referrals (
    id SERIAL PRIMARY KEY,
    referrer_customer_id INT NOT NULL,
    referred_customer_id INT,
    referred_email VARCHAR(100),
    referred_phone VARCHAR(20),
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'completed', 'expired')),
    
    -- Rewards
    reward_amount DECIMAL(10,2) DEFAULT 100,
    reward_credited BOOLEAN DEFAULT false,
    
    -- Tracking
    first_order_placed BOOLEAN DEFAULT false,
    first_order_date TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_referral_referrer ON customer_referrals(referrer_customer_id);
CREATE INDEX idx_referral_referred ON customer_referrals(referred_customer_id);
CREATE INDEX idx_referral_code ON customer_referrals(referral_code);
CREATE INDEX idx_referral_status ON customer_referrals(status);

COMMENT ON TABLE customer_referrals IS 'Customer referral tracking: 1 referral = 100৳, 5 referrals = Free product';

-- =====================================================
-- 5. MONTHLY GROCERY LIST (Recurring Orders)
-- =====================================================

CREATE TABLE IF NOT EXISTS monthly_grocery_lists (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    list_name VARCHAR(255) DEFAULT 'Monthly Grocery',
    is_active BOOLEAN DEFAULT true,
    
    -- Subscription settings
    is_subscription BOOLEAN DEFAULT false,
    subscription_day INT CHECK (subscription_day BETWEEN 1 AND 31),
    next_order_date DATE,
    auto_reorder BOOLEAN DEFAULT false,
    
    -- Stats
    total_orders_placed INT DEFAULT 0,
    last_ordered_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grocery_list_customer ON monthly_grocery_lists(customer_id);
CREATE INDEX idx_grocery_list_active ON monthly_grocery_lists(is_active);
CREATE INDEX idx_grocery_list_subscription ON monthly_grocery_lists(is_subscription);

COMMENT ON TABLE monthly_grocery_lists IS 'Customer monthly grocery habit lists';

-- =====================================================
-- 6. GROCERY LIST ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS grocery_list_items (
    id SERIAL PRIMARY KEY,
    list_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    last_purchase_price DECIMAL(10,2),
    locked_price DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grocery_items_list ON grocery_list_items(list_id);
CREATE INDEX idx_grocery_items_product ON grocery_list_items(product_id);

COMMENT ON TABLE grocery_list_items IS 'Items in customer grocery lists';

-- =====================================================
-- 7. REPEAT ORDER REMINDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS repeat_order_reminders (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    last_order_id INT,
    last_order_date DATE,
    reminder_due_date DATE,
    
    -- Reminder details
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    reminder_channel VARCHAR(20) CHECK (reminder_channel IN ('whatsapp', 'sms', 'call', 'email')),
    
    -- Response
    customer_responded BOOLEAN DEFAULT false,
    order_placed BOOLEAN DEFAULT false,
    new_order_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminder_customer ON repeat_order_reminders(customer_id);
CREATE INDEX idx_reminder_due_date ON repeat_order_reminders(reminder_due_date);
CREATE INDEX idx_reminder_sent ON repeat_order_reminders(reminder_sent);

COMMENT ON TABLE repeat_order_reminders IS 'Auto-reminders for repeat purchases (25-30 days)';

-- =====================================================
-- 8. PRICE LOCK TABLE (Gold Members)
-- =====================================================

CREATE TABLE IF NOT EXISTS price_locks (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    locked_price DECIMAL(10,2) NOT NULL,
    current_price DECIMAL(10,2),
    savings DECIMAL(10,2) GENERATED ALWAYS AS (current_price - locked_price) STORED,
    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_price_lock_customer ON price_locks(customer_id);
CREATE INDEX idx_price_lock_product ON price_locks(product_id);
CREATE INDEX idx_price_lock_active ON price_locks(is_active);

COMMENT ON TABLE price_locks IS 'Gold member price protection (old price even after hike)';

-- =====================================================
-- 9. GIFT TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_gifts (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    gift_type VARCHAR(20) CHECK (gift_type IN ('birthday', 'eid', 'referral_milestone', 'membership_upgrade', 'other')),
    gift_name VARCHAR(255),
    gift_value DECIMAL(10,2),
    product_id INT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'expired')),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gift_customer ON customer_gifts(customer_id);
CREATE INDEX idx_gift_type ON customer_gifts(gift_type);
CREATE INDEX idx_gift_status ON customer_gifts(status);

COMMENT ON TABLE customer_gifts IS 'Birthday, Eid, and milestone gifts for customers';

-- =====================================================
-- 10. KPI METRICS VIEW
-- =====================================================

CREATE OR REPLACE VIEW loyalty_kpi_metrics AS
SELECT 
    -- Overall stats
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT CASE WHEN cm.membership_tier = 'silver' THEN c.id END) as silver_members,
    COUNT(DISTINCT CASE WHEN cm.membership_tier = 'gold' THEN c.id END) as gold_members,
    
    -- First to Repeat Order %
    ROUND(
        (COUNT(DISTINCT CASE WHEN cv.total_orders > 1 THEN cv.customer_id END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT CASE WHEN cv.total_orders >= 1 THEN cv.customer_id END), 0)) * 100, 
        2
    ) as first_to_repeat_percentage,
    
    -- Member Conversion Rate
    ROUND(
        (COUNT(DISTINCT CASE WHEN cm.membership_tier IN ('silver', 'gold') THEN c.id END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT c.id), 0)) * 100, 
        2
    ) as member_conversion_rate,
    
    -- Avg Orders per Customer
    ROUND(
        AVG(cv.total_orders), 
        2
    ) as avg_orders_per_customer,
    
    -- Avg Referrals per Customer
    ROUND(
        (COUNT(cr.id)::DECIMAL / NULLIF(COUNT(DISTINCT c.id), 0)), 
        2
    ) as avg_referrals_per_customer,
    
    -- Average CLV
    ROUND(
        AVG(cv.lifetime_value), 
        2
    ) as avg_customer_lifetime_value,
    
    -- Subscription stats
    COUNT(DISTINCT mgl.id) FILTER (WHERE mgl.is_subscription = true) as active_subscriptions,
    
    -- Referral stats
    COUNT(cr.id) FILTER (WHERE cr.status = 'completed') as completed_referrals,
    SUM(CASE WHEN cr.reward_credited THEN cr.reward_amount ELSE 0 END) as total_referral_rewards_paid

FROM customers c
LEFT JOIN customer_memberships cm ON c.id = cm.customer_id
LEFT JOIN customer_360_view cv ON c.id = cv.customer_id
LEFT JOIN customer_referrals cr ON c.id = cr.referrer_customer_id
LEFT JOIN monthly_grocery_lists mgl ON c.id = mgl.customer_id AND mgl.is_active = true;

COMMENT ON VIEW loyalty_kpi_metrics IS 'Key Performance Indicators for loyalty program';

-- =====================================================
-- 11. MEMBER BENEFITS VIEW
-- =====================================================

CREATE OR REPLACE VIEW member_benefits_summary AS
SELECT 
    cm.customer_id,
    cm.membership_tier,
    cm.discount_percentage,
    cm.current_month_spend,
    cm.total_monthly_spend,
    
    -- Wallet info
    cw.balance as wallet_balance,
    cw.total_earned as wallet_earned,
    
    -- Referral stats
    COUNT(DISTINCT cr.id) as total_referrals,
    COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'completed') as completed_referrals,
    
    -- Subscription info
    COUNT(DISTINCT mgl.id) FILTER (WHERE mgl.is_subscription = true) as active_subscriptions,
    
    -- Price locks (Gold members)
    COUNT(DISTINCT pl.id) FILTER (WHERE pl.is_active = true) as active_price_locks,
    COALESCE(SUM(pl.savings), 0) as total_price_lock_savings,
    
    -- Gifts
    COUNT(DISTINCT cg.id) FILTER (WHERE cg.status = 'sent') as gifts_received,
    
    cm.tier_achieved_at,
    cm.created_at

FROM customer_memberships cm
LEFT JOIN customer_wallets cw ON cm.customer_id = cw.customer_id
LEFT JOIN customer_referrals cr ON cm.customer_id = cr.referrer_customer_id
LEFT JOIN monthly_grocery_lists mgl ON cm.customer_id = mgl.customer_id AND mgl.is_active = true
LEFT JOIN price_locks pl ON cm.customer_id = pl.customer_id
LEFT JOIN customer_gifts cg ON cm.customer_id = cg.customer_id
GROUP BY 
    cm.customer_id, cm.membership_tier, cm.discount_percentage, 
    cm.current_month_spend, cm.total_monthly_spend, cm.tier_achieved_at, cm.created_at,
    cw.balance, cw.total_earned;

COMMENT ON VIEW member_benefits_summary IS 'Complete benefits overview per member';

-- =====================================================
-- 12. AUTOMATION FUNCTIONS
-- =====================================================

-- Function: Update Membership Tier based on monthly spend
CREATE OR REPLACE FUNCTION update_membership_tier()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate current month spend for the customer
    UPDATE customer_memberships cm
    SET 
        current_month_spend = (
            SELECT COALESCE(SUM(total_amount), 0)
            FROM sales_orders
            WHERE customer_id = NEW.customer_id
              AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        ),
        membership_tier = CASE 
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) > 5000 THEN 'gold'
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) >= 5000 THEN 'silver'
            ELSE 'none'
        END,
        discount_percentage = CASE 
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) > 5000 THEN 10  -- Gold: 8-12% average = 10%
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) >= 5000 THEN 4  -- Silver: 3-5% average = 4%
            ELSE 0
        END,
        free_delivery_count = CASE 
            WHEN (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM sales_orders
                WHERE customer_id = NEW.customer_id
                  AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                  AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ) > 5000 THEN 1
            ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE cm.customer_id = NEW.customer_id;
    
    -- Create membership record if doesn't exist
    INSERT INTO customer_memberships (customer_id)
    VALUES (NEW.customer_id)
    ON CONFLICT (customer_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update membership on new order
DROP TRIGGER IF EXISTS trigger_update_membership ON sales_orders;
CREATE TRIGGER trigger_update_membership
    AFTER INSERT OR UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_membership_tier();

-- Function: Generate repeat order reminders
CREATE OR REPLACE FUNCTION generate_repeat_reminders()
RETURNS void AS $$
BEGIN
    -- Insert reminders for orders from 25-30 days ago
    INSERT INTO repeat_order_reminders (
        customer_id, 
        last_order_id, 
        last_order_date, 
        reminder_due_date,
        reminder_channel
    )
    SELECT 
        so.customer_id,
        so.id,
        so.order_date::date,
        (so.order_date + INTERVAL '28 days')::date,
        'whatsapp'
    FROM sales_orders so
    WHERE so.order_date::date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '25 days'
      AND NOT EXISTS (
          SELECT 1 FROM repeat_order_reminders ror 
          WHERE ror.last_order_id = so.id
      )
    ORDER BY so.order_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_repeat_reminders IS 'Generate auto-reminders for repeat purchases (run daily)';

-- Function: Credit referral reward
CREATE OR REPLACE FUNCTION credit_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_id INT;
    v_referrer_id INT;
    v_reward_amount DECIMAL(10,2);
BEGIN
    -- When referred customer places first order
    IF NEW.referred_customer_id IS NOT NULL AND OLD.first_order_placed = false AND NEW.first_order_placed = true THEN
        
        v_referrer_id := NEW.referrer_customer_id;
        v_reward_amount := NEW.reward_amount;
        
        -- Create wallet if doesn't exist
        INSERT INTO customer_wallets (customer_id, balance, total_earned)
        VALUES (v_referrer_id, 0, 0)
        ON CONFLICT (customer_id) DO NOTHING;
        
        -- Get wallet ID
        SELECT id INTO v_wallet_id FROM customer_wallets WHERE customer_id = v_referrer_id;
        
        -- Credit wallet
        UPDATE customer_wallets
        SET 
            balance = balance + v_reward_amount,
            total_earned = total_earned + v_reward_amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = v_referrer_id;
        
        -- Log transaction
        INSERT INTO wallet_transactions (
            wallet_id, customer_id, transaction_type, amount, source, 
            reference_id, description, balance_after
        )
        VALUES (
            v_wallet_id, v_referrer_id, 'credit', v_reward_amount, 'referral',
            NEW.id, 'Referral reward: ' || NEW.referred_email,
            (SELECT balance FROM customer_wallets WHERE customer_id = v_referrer_id)
        );
        
        -- Mark reward as credited
        NEW.reward_credited := true;
        NEW.completed_at := CURRENT_TIMESTAMP;
        NEW.status := 'completed';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Credit referral reward
DROP TRIGGER IF EXISTS trigger_credit_referral ON customer_referrals;
CREATE TRIGGER trigger_credit_referral
    BEFORE UPDATE ON customer_referrals
    FOR EACH ROW
    EXECUTE FUNCTION credit_referral_reward();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Membership & Loyalty Program Migration completed successfully!' as status;
SELECT 'Created 9 tables: memberships, wallets, transactions, referrals, grocery lists, reminders, price locks, gifts' as tables_created;
SELECT 'Created 2 views: loyalty_kpi_metrics, member_benefits_summary' as views_created;
SELECT 'Created 3 functions: update_membership_tier, generate_repeat_reminders, credit_referral_reward' as functions_created;
