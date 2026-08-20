-- =====================================================
-- CUSTOMER DATA MANAGEMENT (CDM) SYSTEM
-- Complete Customer 360° View with Family Members
-- =====================================================

-- =====================================================
-- 1. ENHANCED CUSTOMER PROFILE
-- =====================================================

-- Add new columns to existing customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'other'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS anniversary_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profession VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS available_time VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'new' CHECK (customer_type IN ('new', 'repeat', 'vip', 'inactive'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(20) DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'prospect', 'first_buyer', 'repeat_buyer', 'loyal', 'inactive'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_district ON customers(district);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle_stage ON customers(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_customers_dob ON customers(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_customers_anniversary ON customers(anniversary_date);

COMMENT ON COLUMN customers.district IS 'Customer district for regional targeting';
COMMENT ON COLUMN customers.customer_type IS 'Customer classification: new, repeat, vip, inactive';
COMMENT ON COLUMN customers.lifecycle_stage IS 'Customer journey stage';
COMMENT ON COLUMN customers.available_time IS 'Best time to contact customer';

-- =====================================================
-- 2. FAMILY MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_family_members (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    district VARCHAR(100),
    city VARCHAR(100),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    date_of_birth DATE,
    marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'other')),
    anniversary_date DATE,
    profession VARCHAR(100),
    relationship VARCHAR(50) CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'grandparent', 'other')),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_family_customer ON customer_family_members(customer_id);
CREATE INDEX idx_family_dob ON customer_family_members(date_of_birth);
CREATE INDEX idx_family_anniversary ON customer_family_members(anniversary_date);
CREATE INDEX idx_family_relationship ON customer_family_members(relationship);

COMMENT ON TABLE customer_family_members IS 'Customer family members for birthday/anniversary offers';

-- =====================================================
-- 3. INTERACTION DATA (Call Logs, Messages, etc.)
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_interactions (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('call', 'whatsapp', 'sms', 'email', 'facebook', 'instagram', 'website_visit', 'support_ticket', 'meeting', 'other')),
    interaction_direction VARCHAR(20) CHECK (interaction_direction IN ('inbound', 'outbound')),
    subject VARCHAR(255),
    description TEXT,
    agent_id INT,
    duration_seconds INT,
    outcome VARCHAR(100),
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactions_customer ON customer_interactions(customer_id);
CREATE INDEX idx_interactions_type ON customer_interactions(interaction_type);
CREATE INDEX idx_interactions_date ON customer_interactions(created_at);
CREATE INDEX idx_interactions_follow_up ON customer_interactions(follow_up_date) WHERE follow_up_required = true;

COMMENT ON TABLE customer_interactions IS 'All customer touchpoints and interactions';

-- =====================================================
-- 4. BEHAVIOR TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_behavior (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    behavior_type VARCHAR(50) NOT NULL CHECK (behavior_type IN ('product_view', 'add_to_cart', 'wishlist', 'search', 'page_visit', 'call_attempt', 'email_open', 'email_click', 'other')),
    product_id INT,
    category_id INT,
    metadata JSONB,
    session_id VARCHAR(255),
    device_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_behavior_customer ON customer_behavior(customer_id);
CREATE INDEX idx_behavior_type ON customer_behavior(behavior_type);
CREATE INDEX idx_behavior_product ON customer_behavior(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_behavior_date ON customer_behavior(created_at);

COMMENT ON TABLE customer_behavior IS 'Customer browsing and interaction behavior';

-- =====================================================
-- 5. CUSTOMER 360° VIEW
-- =====================================================

SELECT 
    c.id as customer_id,
    c.name,
    c.last_name,
    c.email,
    c.phone,
    c.mobile,
    c.district,
    c.city,
    c.gender,
    c.date_of_birth,
    c.marital_status,
    c.anniversary_date,
    c.profession,
    c.available_time,
    c.customer_type,
    c.lifecycle_stage,
    c.status,
    c.priority,
    c.assigned_to,
    
    -- Transaction Summary
    COUNT(DISTINCT so.id) as total_orders,
    COALESCE(SUM(so.grand_total), 0) as lifetime_value,
    COALESCE(AVG(so.grand_total), 0) as avg_order_value,
    MAX(so.order_date) as last_order_date,
    MIN(so.order_date) as first_order_date,
    COALESCE(CURRENT_DATE - MAX(so.order_date)::date, 999) as days_since_last_order,
    
    -- Interaction Summary
    COUNT(DISTINCT ci.id) as total_interactions,
    COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type = 'call') as total_calls,
    COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type = 'whatsapp') as total_whatsapp,
    COUNT(DISTINCT ci.id) FILTER (WHERE ci.interaction_type = 'email') as total_emails,
    MAX(ci.created_at) as last_interaction_date,
    
    -- Behavior Summary
    COUNT(DISTINCT cb.id) as total_behaviors,
    COUNT(DISTINCT cb.product_id) as products_viewed,
    COUNT(DISTINCT cb.id) FILTER (WHERE cb.behavior_type = 'product_view') as product_views_count,
    
    -- Family Members
    COUNT(DISTINCT cfm.id) as family_members_count,
    
    -- Customer Temperature
    CASE 
        WHEN MAX(so.order_date) > CURRENT_DATE - INTERVAL '7 days' THEN 'hot'
        WHEN MAX(so.order_date) > CURRENT_DATE - INTERVAL '30 days' THEN 'warm'
        ELSE 'cold'
    END as customer_temperature,
    
    c.created_at as customer_since,
    c.updated_at as last_updated
    
FROM customers c
LEFT JOIN sales_orders so ON c.id = so.customer_id
LEFT JOIN customer_interactions ci ON c.id = ci.customer_id
LEFT JOIN customer_behavior cb ON c.id = cb.customer_id
LEFT JOIN customer_family_members cfm ON c.id = cfm.customer_id AND cfm.is_active = true
GROUP BY c.id;

COMMENT ON VIEW customer_360_view IS 'Complete 360° customer view with all data';

-- =====================================================
-- 6. BIRTHDAY & ANNIVERSARY REMINDERS
-- =====================================================

CREATE OR REPLACE VIEW upcoming_birthdays_anniversaries AS
SELECT 
    'customer' as type,
    c.id as customer_id,
    NULL::INT as family_member_id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as name,
    c.phone,
    c.email,
    'birthday' as event_type,
    c.date_of_birth as event_date,
    EXTRACT(MONTH FROM c.date_of_birth) as event_month,
    EXTRACT(DAY FROM c.date_of_birth) as event_day,
    CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM c.date_of_birth) 
         AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM c.date_of_birth)
        THEN 0
        WHEN DATE_PART('doy', c.date_of_birth) >= DATE_PART('doy', CURRENT_DATE)
        THEN DATE_PART('doy', c.date_of_birth) - DATE_PART('doy', CURRENT_DATE)
        ELSE 365 + DATE_PART('doy', c.date_of_birth) - DATE_PART('doy', CURRENT_DATE)
    END as days_until_event
FROM customers c
WHERE c.date_of_birth IS NOT NULL

UNION ALL

SELECT 
    'customer' as type,
    c.id as customer_id,
    NULL::INT as family_member_id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as name,
    c.phone,
    c.email,
    'anniversary' as event_type,
    c.anniversary_date as event_date,
    EXTRACT(MONTH FROM c.anniversary_date) as event_month,
    EXTRACT(DAY FROM c.anniversary_date) as event_day,
    CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM c.anniversary_date) 
         AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM c.anniversary_date)
        THEN 0
        WHEN DATE_PART('doy', c.anniversary_date) >= DATE_PART('doy', CURRENT_DATE)
        THEN DATE_PART('doy', c.anniversary_date) - DATE_PART('doy', CURRENT_DATE)
        ELSE 365 + DATE_PART('doy', c.anniversary_date) - DATE_PART('doy', CURRENT_DATE)
    END as days_until_event
FROM customers c
WHERE c.anniversary_date IS NOT NULL

UNION ALL

SELECT 
    'family_member' as type,
    cfm.customer_id,
    cfm.id as family_member_id,
    cfm.name,
    cfm.phone,
    cfm.email,
    'birthday' as event_type,
    cfm.date_of_birth as event_date,
    EXTRACT(MONTH FROM cfm.date_of_birth) as event_month,
    EXTRACT(DAY FROM cfm.date_of_birth) as event_day,
    CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM cfm.date_of_birth) 
         AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM cfm.date_of_birth)
        THEN 0
        WHEN DATE_PART('doy', cfm.date_of_birth) >= DATE_PART('doy', CURRENT_DATE)
        THEN DATE_PART('doy', cfm.date_of_birth) - DATE_PART('doy', CURRENT_DATE)
        ELSE 365 + DATE_PART('doy', cfm.date_of_birth) - DATE_PART('doy', CURRENT_DATE)
    END as days_until_event
FROM customer_family_members cfm
WHERE cfm.date_of_birth IS NOT NULL AND cfm.is_active = true

UNION ALL

SELECT 
    'family_member' as type,
    cfm.customer_id,
    cfm.id as family_member_id,
    cfm.name,
    cfm.phone,
    cfm.email,
    'anniversary' as event_type,
    cfm.anniversary_date as event_date,
    EXTRACT(MONTH FROM cfm.anniversary_date) as event_month,
    EXTRACT(DAY FROM cfm.anniversary_date) as event_day,
    CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM cfm.anniversary_date) 
         AND EXTRACT(DAY FROM CURRENT_DATE) = EXTRACT(DAY FROM cfm.anniversary_date)
        THEN 0
        WHEN DATE_PART('doy', cfm.anniversary_date) >= DATE_PART('doy', CURRENT_DATE)
        THEN DATE_PART('doy', cfm.anniversary_date) - DATE_PART('doy', CURRENT_DATE)
        ELSE 365 + DATE_PART('doy', cfm.anniversary_date) - DATE_PART('doy', CURRENT_DATE)
    END as days_until_event
FROM customer_family_members cfm
WHERE cfm.anniversary_date IS NOT NULL AND cfm.is_active = true

ORDER BY days_until_event ASC;

COMMENT ON VIEW upcoming_birthdays_anniversaries IS 'Upcoming birthdays and anniversaries for offers';

-- =====================================================
-- 7. AI DECISION ENGINE VIEW
-- =====================================================

CREATE OR REPLACE VIEW ai_call_recommendations AS
SELECT 
    cv.customer_id,
    cv.first_name || ' ' || COALESCE(cv.last_name, '') as customer_name,
    cv.phone,
    cv.email,
    cv.customer_type,
    cv.lifecycle_stage,
    cv.customer_temperature,
    cv.available_time,
    
    -- Call Decision Factors
    cv.days_since_last_order,
    cv.lifetime_value,
    cv.avg_order_value,
    cv.total_orders,
    cv.total_calls,
    cv.products_viewed,
    
    -- AI Decision: WHO to call
    CASE 
        WHEN cv.customer_temperature = 'hot' AND cv.lifetime_value > 5000 THEN 10
        WHEN cv.customer_temperature = 'hot' THEN 9
        WHEN cv.customer_temperature = 'warm' AND cv.total_orders >= 3 THEN 8
        WHEN cv.customer_temperature = 'warm' THEN 7
        WHEN cv.days_since_last_order BETWEEN 30 AND 60 THEN 6
        WHEN cv.lifecycle_stage = 'prospect' AND cv.products_viewed > 5 THEN 5
        ELSE 3
    END as call_priority_score,
    
    -- AI Decision: WHAT to offer
    CASE 
        WHEN cv.customer_temperature = 'hot' AND cv.lifecycle_stage = 'loyal' THEN 'Premium product upsell'
        WHEN cv.customer_temperature = 'hot' THEN 'Repeat purchase incentive'
        WHEN cv.customer_temperature = 'warm' AND cv.total_orders >= 2 THEN 'Cross-sell related products'
        WHEN cv.days_since_last_order BETWEEN 30 AND 60 THEN 'Reactivation discount 20%'
        WHEN cv.days_since_last_order > 60 THEN 'Win-back offer 30%'
        WHEN cv.lifecycle_stage = 'prospect' THEN 'First order discount 15%'
        ELSE 'General catalog offer'
    END as offer_type,
    
    -- AI Decision: WHEN to call
    CASE 
        WHEN cv.available_time IS NOT NULL THEN cv.available_time
        WHEN cv.total_calls > 0 THEN '10:00-12:00' -- Based on past successful calls
        ELSE '14:00-16:00' -- Default afternoon slot
    END as best_call_time,
    
    -- Recommended Products (from recommendation engine)
    (SELECT STRING_AGG(cpr.recommended_product_name, ', ')
     FROM customer_product_recommendations cpr
     WHERE cpr.customer_id = cv.customer_id
     LIMIT 3) as recommended_products,
    
    -- Next Action
    CASE 
        WHEN cv.customer_temperature = 'hot' AND cv.days_since_last_order <= 7 THEN 'URGENT: Call within 24 hours'
        WHEN cv.customer_temperature = 'hot' THEN 'Call within 48 hours'
        WHEN cv.customer_temperature = 'warm' THEN 'Schedule call this week'
        WHEN cv.days_since_last_order > 60 THEN 'Send SMS first, then call'
        ELSE 'Add to follow-up list'
    END as next_action

FROM customer_360_view cv
WHERE cv.status = 'active'
ORDER BY call_priority_score DESC, cv.lifetime_value DESC;

COMMENT ON VIEW ai_call_recommendations IS 'AI-driven recommendations for who/what/when to call';

-- =====================================================
-- 8. DROP-OFF ANALYSIS
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_dropoff_tracking (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    stage VARCHAR(50) NOT NULL CHECK (stage IN ('product_view', 'add_to_cart', 'checkout_initiated', 'payment_pending', 'payment_failed', 'abandoned')),
    product_id INT,
    cart_value DECIMAL(10,2),
    reason VARCHAR(255),
    recovered BOOLEAN DEFAULT false,
    recovered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dropoff_customer ON customer_dropoff_tracking(customer_id);
CREATE INDEX idx_dropoff_stage ON customer_dropoff_tracking(stage);
CREATE INDEX idx_dropoff_recovered ON customer_dropoff_tracking(recovered);

COMMENT ON TABLE customer_dropoff_tracking IS 'Track where customers drop off in purchase journey';

-- =====================================================
-- 9. LIFECYCLE AUTOMATION TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    -- Update lifecycle stage based on orders
    IF NEW.id IS NOT NULL THEN
        UPDATE customers c
        SET lifecycle_stage = CASE 
            WHEN order_count = 0 THEN 'lead'
            WHEN order_count = 1 THEN 'first_buyer'
            WHEN order_count BETWEEN 2 AND 4 THEN 'repeat_buyer'
            WHEN order_count >= 5 THEN 'loyal'
            ELSE 'prospect'
        END,
        customer_type = CASE 
            WHEN lifetime_val > 50000 THEN 'vip'
            WHEN order_count >= 3 THEN 'repeat'
            WHEN last_order_days > 90 THEN 'inactive'
            ELSE 'new'
        END
        FROM (
            SELECT 
                so.customer_id,
                COUNT(*) as order_count,
                SUM(so.grand_total) as lifetime_val,
                COALESCE(CURRENT_DATE - MAX(so.order_date)::date, 999) as last_order_days
            FROM sales_orders so
            WHERE so.customer_id = NEW.customer_id
            GROUP BY so.customer_id
        ) stats
        WHERE c.id = stats.customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to sales_orders
DROP TRIGGER IF EXISTS trigger_update_lifecycle ON sales_orders;
CREATE TRIGGER trigger_update_lifecycle
    AFTER INSERT OR UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_lifecycle();

COMMENT ON FUNCTION update_customer_lifecycle IS 'Auto-update customer lifecycle stage based on purchases';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'CDM Migration completed successfully!' as status;
SELECT 'Added columns to customers table' as step_1;
SELECT 'Created: customer_family_members, customer_interactions, customer_behavior, customer_dropoff_tracking' as step_2;
SELECT 'Created views: customer_360_view, upcoming_birthdays_anniversaries, ai_call_recommendations' as step_3;
SELECT 'Created lifecycle automation trigger' as step_4;
