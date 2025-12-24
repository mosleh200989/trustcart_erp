-- =====================================================
-- CRM AUTOMATION SYSTEM - COMPLETE MIGRATION
-- Customer Intelligence + Auto Call Priority + Marketing Automation
-- =====================================================

-- =====================================================
-- 1. CUSTOMER INTELLIGENCE & BEHAVIOR TRACKING
-- =====================================================

-- Customer Purchase History Analysis (View)
CREATE OR REPLACE VIEW customer_intelligence AS
SELECT 
    c.id as customer_id,
    c.first_name, 
    c.last_name,
    c.first_name || ' ' || COALESCE(c.last_name, '') as name,
    c.email,
    c.phone,
    COUNT(DISTINCT so.id) as total_orders,
    COALESCE(SUM(so.grand_total), 0) as lifetime_value,
    COALESCE(AVG(so.grand_total), 0) as avg_order_value,
    MAX(so.order_date) as last_purchase_date,
    MIN(so.order_date) as first_purchase_date,
    COALESCE(CURRENT_DATE - MAX(so.order_date)::date, 999) as days_since_last_order,
    STRING_AGG(DISTINCT p.category_id::text, ',') as purchased_categories,
    CASE 
        WHEN MAX(so.order_date) > CURRENT_DATE - INTERVAL '7 days' THEN 'hot'
        WHEN MAX(so.order_date) > CURRENT_DATE - INTERVAL '30 days' THEN 'warm'
        ELSE 'cold'
    END as customer_temperature
FROM customers c
LEFT JOIN sales_orders so ON c.id = so.customer_id
LEFT JOIN sales_order_items soi ON so.id = soi.sales_order_id
LEFT JOIN products p ON soi.product_id = p.id
GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone;

COMMENT ON VIEW customer_intelligence IS 'Real-time customer behavior analytics';

-- =====================================================
-- 2. UPSELL/CROSS-SELL RULES ENGINE
-- =====================================================

CREATE TABLE IF NOT EXISTS product_recommendation_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    trigger_product_id INT REFERENCES products(id) ON DELETE CASCADE,
    trigger_category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    recommended_product_id INT REFERENCES products(id) ON DELETE CASCADE,
    recommended_category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    min_days_passed INT DEFAULT 7,
    max_days_passed INT DEFAULT 30,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    is_active BOOLEAN DEFAULT true,
    success_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendation_rules_product ON product_recommendation_rules(trigger_product_id);
CREATE INDEX idx_recommendation_rules_category ON product_recommendation_rules(trigger_category_id);
CREATE INDEX idx_recommendation_rules_active ON product_recommendation_rules(is_active);

COMMENT ON TABLE product_recommendation_rules IS 'AI-driven upsell/cross-sell rules';

-- Sample Recommendation Rules (Skip if categories don't exist)
-- INSERT INTO product_recommendation_rules (rule_name, trigger_category_id, recommended_category_id, min_days_passed, max_days_passed, min_order_value, priority) 
-- VALUES 
-- ('Honey → Pain Relief', 1, 2, 10, 20, 800, 'high'),
-- ('Electronics → Accessories', 3, 4, 5, 15, 1000, 'medium')
-- ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. AUTO CALL PRIORITY & TASK MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS crm_call_tasks (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    assigned_agent_id INT,
    task_date DATE NOT NULL DEFAULT CURRENT_DATE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('hot', 'warm', 'cold')),
    call_reason VARCHAR(255),
    recommended_product_id INT REFERENCES products(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
    call_outcome VARCHAR(100),
    notes TEXT,
    scheduled_time TIME,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_call_tasks_agent ON crm_call_tasks(assigned_agent_id);
CREATE INDEX idx_call_tasks_date ON crm_call_tasks(task_date);
CREATE INDEX idx_call_tasks_priority ON crm_call_tasks(priority);
CREATE INDEX idx_call_tasks_status ON crm_call_tasks(status);
CREATE INDEX idx_call_tasks_customer ON crm_call_tasks(customer_id);

COMMENT ON TABLE crm_call_tasks IS 'Auto-generated daily call tasks for agents';

-- =====================================================
-- 4. CUSTOMER ENGAGEMENT TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_engagement_history (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    engagement_type VARCHAR(50) NOT NULL CHECK (engagement_type IN ('call', 'sms', 'whatsapp', 'email', 'website_visit', 'order')),
    channel VARCHAR(50),
    status VARCHAR(50) CHECK (status IN ('sent', 'delivered', 'read', 'responded', 'ignored', 'failed', 'completed')),
    message_content TEXT,
    agent_id INT,
    campaign_id INT,
    response_received BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_engagement_customer ON customer_engagement_history(customer_id);
CREATE INDEX idx_engagement_type ON customer_engagement_history(engagement_type);
CREATE INDEX idx_engagement_date ON customer_engagement_history(created_at);
CREATE INDEX idx_engagement_status ON customer_engagement_history(status);

COMMENT ON TABLE customer_engagement_history IS 'Track all customer touchpoints';

-- =====================================================
-- 5. MARKETING AUTOMATION CAMPAIGNS
-- =====================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) CHECK (campaign_type IN ('upsell', 'reactivation', 'retention', 'promotion', 'feedback')),
    channel VARCHAR(50) CHECK (channel IN ('sms', 'whatsapp', 'email', 'all')),
    target_segment VARCHAR(100),
    message_template TEXT,
    trigger_condition JSONB,
    is_active BOOLEAN DEFAULT true,
    send_time TIME,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_active ON marketing_campaigns(is_active);
CREATE INDEX idx_campaigns_type ON marketing_campaigns(campaign_type);

COMMENT ON TABLE marketing_campaigns IS 'Behavior-based automated marketing campaigns';

-- Sample Campaigns
INSERT INTO marketing_campaigns (campaign_name, campaign_type, channel, target_segment, message_template, trigger_condition)
VALUES
('Missed Call Follow-up', 'retention', 'whatsapp', 'hot_leads', 'Your call was missed. How can we help?', '{"trigger": "call_missed", "wait_minutes": 30}'),
('Premium Upsell', 'upsell', 'email', 'repeat_customers', 'Special offer for you!', '{"trigger": "orders_count_gte", "min_orders": 2}'),
('Inactive Customer Reactivation', 'reactivation', 'sms', 'inactive_30_days', '30% discount - Come back!', '{"trigger": "days_inactive", "days_inactive": 30}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. AUTO CALL TASK GENERATION (Trigger Function)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_daily_call_tasks()
RETURNS void AS $$
DECLARE
    customer_rec RECORD;
    task_priority VARCHAR(20);
    call_reason VARCHAR(255);
BEGIN
    -- Clear old pending tasks (older than 7 days)
    DELETE FROM crm_call_tasks 
    WHERE task_date < CURRENT_DATE - INTERVAL '7 days' 
    AND status = 'pending';
    
    -- Generate HOT customer tasks (purchased recently, high value)
    FOR customer_rec IN 
        SELECT ci.customer_id, ci.name, ci.last_purchase_date, ci.days_since_last_order, ci.avg_order_value
        FROM customer_intelligence ci
        WHERE ci.days_since_last_order BETWEEN 7 AND 15
        AND ci.avg_order_value > 800
        AND NOT EXISTS (
            SELECT 1 FROM crm_call_tasks 
            WHERE customer_id = ci.customer_id 
            AND task_date = CURRENT_DATE
        )
        LIMIT 20
    LOOP
        INSERT INTO crm_call_tasks (customer_id, priority, call_reason, task_date)
        VALUES (customer_rec.customer_id, 'hot', 'Upsell opportunity - Recent high-value customer', CURRENT_DATE);
    END LOOP;
    
    -- Generate WARM customer tasks (moderate activity)
    FOR customer_rec IN 
        SELECT ci.customer_id, ci.days_since_last_order
        FROM customer_intelligence ci
        WHERE ci.days_since_last_order BETWEEN 15 AND 30
        AND ci.total_orders >= 2
        AND NOT EXISTS (
            SELECT 1 FROM crm_call_tasks 
            WHERE customer_id = ci.customer_id 
            AND task_date = CURRENT_DATE
        )
        LIMIT 30
    LOOP
        INSERT INTO crm_call_tasks (customer_id, priority, call_reason, task_date)
        VALUES (customer_rec.customer_id, 'warm', 'Follow-up - Repeat customer', CURRENT_DATE);
    END LOOP;
    
    -- COLD customers get WhatsApp/SMS (no call task)
    -- They are handled by marketing automation
    
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_daily_call_tasks IS 'Auto-generate call tasks every morning';

-- =====================================================
-- 7. PRODUCT RECOMMENDATION MATCHER
-- =====================================================

CREATE OR REPLACE VIEW customer_product_recommendations AS
SELECT 
    c.id as customer_id,
    c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
    c.phone,
    ci.last_purchase_date,
    ci.days_since_last_order,
    ci.avg_order_value,
    prr.rule_name,
    prr.recommended_product_id,
    p.name_en as recommended_product_name,
    prr.priority,
    prr.min_days_passed,
    prr.max_days_passed
FROM customers c
JOIN customer_intelligence ci ON c.id = ci.customer_id
JOIN sales_orders so ON c.id = so.customer_id
JOIN sales_order_items soi ON so.id = soi.sales_order_id
JOIN products purchased ON soi.product_id = purchased.id
JOIN product_recommendation_rules prr ON (
    (prr.trigger_product_id = purchased.id OR prr.trigger_category_id = purchased.category_id)
    AND ci.days_since_last_order BETWEEN prr.min_days_passed AND prr.max_days_passed
    AND ci.avg_order_value >= prr.min_order_value
    AND prr.is_active = true
)
LEFT JOIN products p ON prr.recommended_product_id = p.id
WHERE ci.days_since_last_order <= 30
GROUP BY c.id, c.first_name, c.last_name, c.phone, ci.last_purchase_date, ci.days_since_last_order, ci.avg_order_value, 
         prr.rule_name, prr.recommended_product_id, p.name_en, prr.priority, prr.min_days_passed, prr.max_days_passed;

COMMENT ON VIEW customer_product_recommendations IS 'Real-time product recommendations per customer';

-- =====================================================
-- 8. AGENT PERFORMANCE METRICS
-- =====================================================

CREATE OR REPLACE VIEW agent_performance_dashboard AS
SELECT 
    ct.assigned_agent_id as agent_id,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE ct.status = 'completed') as completed_calls,
    COUNT(*) FILTER (WHERE ct.status = 'pending') as pending_calls,
    COUNT(*) FILTER (WHERE ct.priority = 'hot') as hot_leads,
    COUNT(*) FILTER (WHERE ct.priority = 'warm') as warm_leads,
    ROUND(AVG(CASE WHEN ct.status = 'completed' THEN 1 ELSE 0 END) * 100, 2) as completion_rate,
    COUNT(DISTINCT ct.customer_id) as unique_customers_contacted,
    MAX(ct.completed_at) as last_call_time
FROM crm_call_tasks ct
WHERE ct.task_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ct.assigned_agent_id;

COMMENT ON VIEW agent_performance_dashboard IS 'Agent productivity metrics';

-- =====================================================
-- 9. MARKETING AUTOMATION TRIGGER (Function)
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_marketing_automation()
RETURNS void AS $$
DECLARE
    campaign_rec RECORD;
    customer_rec RECORD;
BEGIN
    -- Loop through active campaigns
    FOR campaign_rec IN 
        SELECT * FROM marketing_campaigns WHERE is_active = true
    LOOP
        -- Missed Call Follow-up
        IF campaign_rec.campaign_type = 'retention' AND campaign_rec.trigger_condition->>'trigger' = 'call_missed' THEN
            FOR customer_rec IN
                SELECT DISTINCT ct.customer_id, c.phone
                FROM crm_call_tasks ct
                JOIN customers c ON ct.customer_id = c.id
                WHERE ct.status = 'failed' 
                AND ct.task_date = CURRENT_DATE
                AND NOT EXISTS (
                    SELECT 1 FROM customer_engagement_history 
                    WHERE customer_id = ct.customer_id 
                    AND engagement_type = 'whatsapp'
                    AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
                )
            LOOP
                INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, status, message_content, campaign_id)
                VALUES (customer_rec.customer_id, 'whatsapp', 'whatsapp', 'sent', campaign_rec.message_template, campaign_rec.id);
                
                UPDATE marketing_campaigns SET success_count = success_count + 1 WHERE id = campaign_rec.id;
            END LOOP;
        END IF;
        
        -- Inactive Customer Reactivation
        IF campaign_rec.campaign_type = 'reactivation' THEN
            FOR customer_rec IN
                SELECT ci.customer_id, c.phone
                FROM customer_intelligence ci
                JOIN customers c ON ci.customer_id = c.id
                WHERE ci.days_since_last_order >= 30
                AND NOT EXISTS (
                    SELECT 1 FROM customer_engagement_history 
                    WHERE customer_id = ci.customer_id 
                    AND engagement_type = 'sms'
                    AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
                )
                LIMIT 50
            LOOP
                INSERT INTO customer_engagement_history (customer_id, engagement_type, channel, status, message_content, campaign_id)
                VALUES (customer_rec.customer_id, 'sms', 'sms', 'sent', campaign_rec.message_template, campaign_rec.id);
                
                UPDATE marketing_campaigns SET success_count = success_count + 1 WHERE id = campaign_rec.id;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_marketing_automation IS 'Execute behavior-based marketing campaigns';

-- =====================================================
-- 10. SCHEDULED JOBS (PostgreSQL pg_cron extension)
-- =====================================================

-- Note: Requires pg_cron extension
-- To enable: CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily call task generation at 8:00 AM
-- SELECT cron.schedule('generate-call-tasks', '0 8 * * *', 'SELECT generate_daily_call_tasks()');

-- Schedule marketing automation every 2 hours
-- SELECT cron.schedule('marketing-automation', '0 */2 * * *', 'SELECT trigger_marketing_automation()');

-- =====================================================
-- 11. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add priority and assignment to customers table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'priority') THEN
        ALTER TABLE customers ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('hot', 'warm', 'cold'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'assigned_to') THEN
        ALTER TABLE customers ADD COLUMN assigned_to INT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_contact_date') THEN
        ALTER TABLE customers ADD COLUMN last_contact_date TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'next_follow_up') THEN
        ALTER TABLE customers ADD COLUMN next_follow_up TIMESTAMP;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_priority ON customers(priority);
CREATE INDEX IF NOT EXISTS idx_customers_assigned ON customers(assigned_to);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify all tables
SELECT 'Migration completed successfully!' as status;
SELECT 'Created tables: product_recommendation_rules, crm_call_tasks, customer_engagement_history, marketing_campaigns' as tables;
SELECT 'Created views: customer_intelligence, customer_product_recommendations, agent_performance_dashboard' as views;
SELECT 'Created functions: generate_daily_call_tasks(), trigger_marketing_automation()' as functions;
