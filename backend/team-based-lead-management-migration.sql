-- =====================================================
-- TEAM-BASED LEAD MANAGEMENT & CUSTOMER TRACKING SYSTEM
-- =====================================================
-- Session tracking, campaign tracking, team assignment,
-- team-specific data collection, and tier management
-- =====================================================

-- =====================================================
-- 1. CUSTOMER SESSION TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_sessions (
    id SERIAL PRIMARY KEY,
    customer_id INT,                        -- NULL if customer not logged in
    session_id VARCHAR(255) UNIQUE NOT NULL,
    source_details VARCHAR(255),            -- Google, Facebook, Direct, Referral, etc.
    campaign_id VARCHAR(100),               -- Campaign tracking ID
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    device_type VARCHAR(50),                -- desktop, mobile, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    ip_address VARCHAR(45),
    country VARCHAR(100),
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    total_session_time INT,                 -- seconds
    pages_visited INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX idx_sessions_campaign ON customer_sessions(campaign_id);
CREATE INDEX idx_sessions_source ON customer_sessions(source_details);
CREATE INDEX idx_sessions_date ON customer_sessions(session_start);

COMMENT ON TABLE customer_sessions IS 'Track customer session data including source, campaign, and time spent';

-- =====================================================
-- 2. PAGE VISIT TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_page_visits (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    customer_id INT,
    page_url TEXT NOT NULL,
    page_title VARCHAR(255),
    page_category VARCHAR(100),             -- product, category, blog, checkout, etc.
    time_spent_seconds INT DEFAULT 0,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    product_id INT,                         -- If product page
    category_id INT,                        -- If category page
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_page_visits_session ON customer_page_visits(session_id);
CREATE INDEX idx_page_visits_customer ON customer_page_visits(customer_id);
CREATE INDEX idx_page_visits_product ON customer_page_visits(product_id);
CREATE INDEX idx_page_visits_date ON customer_page_visits(visited_at);

COMMENT ON TABLE customer_page_visits IS 'Track which pages customer visited and time spent';

-- =====================================================
-- 3. INCOMPLETE ORDERS TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS incomplete_orders (
    id SERIAL PRIMARY KEY,
    customer_id INT,                        -- NULL if guest
    session_id VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    name VARCHAR(255),
    cart_data JSONB,                        -- Products in cart
    total_amount DECIMAL(10, 2),
    abandoned_stage VARCHAR(50),            -- cart, checkout_info, checkout_payment
    recovery_email_sent BOOLEAN DEFAULT false,
    recovery_sms_sent BOOLEAN DEFAULT false,
    recovered BOOLEAN DEFAULT false,
    recovered_order_id INT,
    recovery_discount_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incomplete_customer ON incomplete_orders(customer_id);
CREATE INDEX idx_incomplete_session ON incomplete_orders(session_id);
CREATE INDEX idx_incomplete_recovered ON incomplete_orders(recovered);
CREATE INDEX idx_incomplete_stage ON incomplete_orders(abandoned_stage);
CREATE INDEX idx_incomplete_date ON incomplete_orders(created_at);

COMMENT ON TABLE incomplete_orders IS 'Track incomplete orders for recovery campaigns';

-- =====================================================
-- 4. ENHANCED CUSTOMERS TABLE FOR LEAD MANAGEMENT
-- =====================================================

-- Add lead-related columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_lead BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_status VARCHAR(20) DEFAULT 'unassigned' 
    CHECK (lead_status IN ('unassigned', 'assigned', 'contacted', 'qualified', 'converted', 'lost'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_team_member_id INT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0;

-- Login fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS can_login_with_mobile BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS can_login_with_email BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customers_lead_status ON customers(lead_status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_team ON customers(assigned_team_member_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_lead ON customers(is_lead);

-- =====================================================
-- 5. TEAM ASSIGNMENT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS team_assignments (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    team_type VARCHAR(10) NOT NULL CHECK (team_type IN ('A', 'B', 'C', 'D', 'E')),
    assigned_by_id INT NOT NULL,            -- Team leader ID
    assigned_to_id INT NOT NULL,            -- Team member ID
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_assignments_customer ON team_assignments(customer_id);
CREATE INDEX idx_team_assignments_type ON team_assignments(team_type);
CREATE INDEX idx_team_assignments_assigned_to ON team_assignments(assigned_to_id);
CREATE INDEX idx_team_assignments_status ON team_assignments(status);

COMMENT ON TABLE team_assignments IS 'Track which team is assigned to which customer/lead';

-- =====================================================
-- 6. TEAM A DATA - Gender, Profession, Product Interest
-- =====================================================

CREATE TABLE IF NOT EXISTS team_a_data (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    gender VARCHAR(20),
    profession VARCHAR(100),
    product_interest TEXT[],                -- Array of product categories
    order_product_details JSONB,            -- Detailed order/product preferences
    notes TEXT,
    collected_by_id INT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_team_a FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_a_customer ON team_a_data(customer_id);
CREATE INDEX idx_team_a_gender ON team_a_data(gender);

COMMENT ON TABLE team_a_data IS 'Team A collects: Gender, Profession, Product Interest, Order details';

-- =====================================================
-- 7. TEAM B DATA - DOB, Marriage Day, Product Interest
-- =====================================================

CREATE TABLE IF NOT EXISTS team_b_data (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    date_of_birth DATE,
    marriage_day DATE,
    product_interest TEXT[],
    order_product_details JSONB,
    notes TEXT,
    collected_by_id INT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_team_b FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_b_customer ON team_b_data(customer_id);
CREATE INDEX idx_team_b_dob ON team_b_data(date_of_birth);
CREATE INDEX idx_team_b_marriage ON team_b_data(marriage_day);

COMMENT ON TABLE team_b_data IS 'Team B collects: Date of Birth, Marriage Day, Product Interest, Order details';

-- =====================================================
-- 8. TEAM C DATA - Family Members
-- =====================================================

CREATE TABLE IF NOT EXISTS team_c_data (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    product_interest TEXT[],
    order_product_details JSONB,
    notes TEXT,
    collected_by_id INT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_team_c FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_c_customer ON team_c_data(customer_id);

COMMENT ON TABLE team_c_data IS 'Team C collects: Family member info (uses customer_family_members table), Product Interest, Order details';

-- =====================================================
-- 9. TEAM D DATA - Health Card, Membership, Coupon
-- =====================================================

CREATE TABLE IF NOT EXISTS team_d_data (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    health_card_number VARCHAR(100),
    health_card_expiry DATE,
    membership_card_number VARCHAR(100),
    membership_card_type VARCHAR(50),       -- Basic, Silver, Gold, Platinum
    membership_expiry DATE,
    coupon_codes TEXT[],                    -- Array of coupon codes
    product_interest TEXT[],
    order_product_details JSONB,
    notes TEXT,
    collected_by_id INT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_team_d FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_d_customer ON team_d_data(customer_id);
CREATE INDEX idx_team_d_health_card ON team_d_data(health_card_number);
CREATE INDEX idx_team_d_membership ON team_d_data(membership_card_number);

COMMENT ON TABLE team_d_data IS 'Team D collects: Health Card, Membership Card, Coupon, Product Interest, Order details';

-- =====================================================
-- 10. TEAM E DATA - Permanent Membership
-- =====================================================

CREATE TABLE IF NOT EXISTS team_e_data (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    permanent_membership_number VARCHAR(100) UNIQUE,
    membership_tier VARCHAR(20) CHECK (membership_tier IN ('silver', 'gold', 'platinum', 'vip')),
    membership_start_date DATE,
    membership_benefits JSONB,              -- Benefits like discounts, free shipping, etc.
    lifetime_value DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    collected_by_id INT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_team_e FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_team_e_customer ON team_e_data(customer_id);
CREATE INDEX idx_team_e_membership_number ON team_e_data(permanent_membership_number);
CREATE INDEX idx_team_e_tier ON team_e_data(membership_tier);

COMMENT ON TABLE team_e_data IS 'Team E collects: Permanent Membership details';

-- =====================================================
-- 11. CUSTOMER TIER MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_tiers (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    tier VARCHAR(20) DEFAULT 'silver' CHECK (tier IN ('silver', 'gold', 'platinum', 'vip')),
    tier_assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tier_assigned_by_id INT,
    auto_assigned BOOLEAN DEFAULT false,    -- Auto-assigned by system or manual
    last_activity_date TIMESTAMP,
    days_inactive INT DEFAULT 0,
    total_purchases INT DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    engagement_score INT DEFAULT 0,         -- 0-100
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_tier FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_tiers_customer ON customer_tiers(customer_id);
CREATE INDEX idx_customer_tiers_tier ON customer_tiers(tier);
CREATE INDEX idx_customer_tiers_active ON customer_tiers(is_active);

COMMENT ON TABLE customer_tiers IS 'Customer tier management: Active/Inactive, Silver/Gold/Platinum/VIP';

-- =====================================================
-- 12. TIER CHANGE HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_tier_history (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    old_tier VARCHAR(20),
    new_tier VARCHAR(20),
    old_status BOOLEAN,                     -- Old active/inactive status
    new_status BOOLEAN,                     -- New active/inactive status
    changed_by_id INT,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_tier_history FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX idx_tier_history_customer ON customer_tier_history(customer_id);
CREATE INDEX idx_tier_history_date ON customer_tier_history(changed_at);

COMMENT ON TABLE customer_tier_history IS 'Track all tier and status changes for audit';

-- =====================================================
-- 13. TEAM LEADER MAPPING
-- =====================================================

-- Assuming you have a users table for team leaders and members
-- Add team-related columns to users table if not exists

-- This table maps team leaders to their 5 teams
CREATE TABLE IF NOT EXISTS team_leader_teams (
    id SERIAL PRIMARY KEY,
    team_leader_id INT NOT NULL,            -- User ID of team leader
    team_type VARCHAR(10) NOT NULL CHECK (team_type IN ('A', 'B', 'C', 'D', 'E')),
    team_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_leader_id, team_type)
);

CREATE INDEX idx_team_leader_teams_leader ON team_leader_teams(team_leader_id);
CREATE INDEX idx_team_leader_teams_type ON team_leader_teams(team_type);

COMMENT ON TABLE team_leader_teams IS 'Maps team leaders to their 5 teams (A, B, C, D, E)';

-- =====================================================
-- 14. TEAM MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,            -- User ID from users table
    team_leader_id INT NOT NULL,
    team_type VARCHAR(10) NOT NULL CHECK (team_type IN ('A', 'B', 'C', 'D', 'E')),
    is_active BOOLEAN DEFAULT true,
    assigned_leads_count INT DEFAULT 0,
    completed_leads_count INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_leader ON team_members(team_leader_id);
CREATE INDEX idx_team_members_type ON team_members(team_type);

COMMENT ON TABLE team_members IS 'Team members under team leaders';

-- =====================================================
-- 15. VIEWS FOR REPORTING
-- =====================================================

-- View: Unassigned Leads
CREATE OR REPLACE VIEW unassigned_leads AS
SELECT 
    c.id,
    c.name as first_name,
    c.last_name,
    c.email,
    c.phone,
    c.lead_source,
    c.lead_score,
    c.created_at,
    cs.source_details,
    cs.campaign_id,
    io.total_amount as incomplete_order_value
FROM customers c
LEFT JOIN customer_sessions cs ON c.id = cs.customer_id
LEFT JOIN incomplete_orders io ON c.id = io.customer_id
WHERE c.is_lead = true 
  AND c.lead_status = 'unassigned'
ORDER BY c.lead_score DESC, c.created_at DESC;

-- View: Team Leader Dashboard
CREATE OR REPLACE VIEW team_leader_dashboard AS
SELECT 
    tl.team_leader_id,
    tl.team_type,
    tl.team_name,
    COUNT(DISTINCT tm.id) as team_members_count,
    COUNT(DISTINCT ta.id) as assigned_leads_count,
    COUNT(DISTINCT CASE WHEN ta.status = 'completed' THEN ta.id END) as completed_leads_count,
    COUNT(DISTINCT CASE WHEN ta.status = 'pending' THEN ta.id END) as pending_leads_count
FROM team_leader_teams tl
LEFT JOIN team_members tm ON tl.team_leader_id = tm.team_leader_id AND tl.team_type = tm.team_type
LEFT JOIN team_assignments ta ON tm.user_id = ta.assigned_to_id AND tl.team_type = ta.team_type
GROUP BY tl.team_leader_id, tl.team_type, tl.team_name;

-- View: Customer Complete Profile
CREATE OR REPLACE VIEW customer_complete_profile AS
SELECT 
    c.id,
    c.name as first_name,
    c.last_name,
    c.email,
    c.phone,
    c.is_lead,
    c.lead_status,
    c.assigned_team_member_id,
    cs.source_details,
    cs.campaign_id,
    cs.total_session_time,
    ct.is_active,
    ct.tier,
    ct.total_purchases,
    ct.total_spent,
    ct.engagement_score,
    ta.team_type as assigned_team,
    ta.status as team_task_status,
    CASE 
        WHEN tea.id IS NOT NULL THEN true ELSE false 
    END as team_a_completed,
    CASE 
        WHEN teb.id IS NOT NULL THEN true ELSE false 
    END as team_b_completed,
    CASE 
        WHEN tec.id IS NOT NULL THEN true ELSE false 
    END as team_c_completed,
    CASE 
        WHEN ted.id IS NOT NULL THEN true ELSE false 
    END as team_d_completed,
    CASE 
        WHEN tee.id IS NOT NULL THEN true ELSE false 
    END as team_e_completed
FROM customers c
LEFT JOIN customer_sessions cs ON c.id = cs.customer_id
LEFT JOIN customer_tiers ct ON c.id = ct.customer_id
LEFT JOIN team_assignments ta ON c.id = ta.customer_id
LEFT JOIN team_a_data tea ON c.id = tea.customer_id
LEFT JOIN team_b_data teb ON c.id = teb.customer_id
LEFT JOIN team_c_data tec ON c.id = tec.customer_id
LEFT JOIN team_d_data ted ON c.id = ted.customer_id
LEFT JOIN team_e_data tee ON c.id = tee.customer_id;

-- =====================================================
-- 16. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Auto-update team member stats when assignment completed
CREATE OR REPLACE FUNCTION update_team_member_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE team_members 
        SET completed_leads_count = completed_leads_count + 1
        WHERE user_id = NEW.assigned_to_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_member_stats
AFTER UPDATE ON team_assignments
FOR EACH ROW
EXECUTE FUNCTION update_team_member_stats();

-- Auto-convert lead to customer when first order placed
CREATE OR REPLACE FUNCTION convert_lead_to_customer()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers 
    SET is_lead = false,
        lead_status = 'converted'
    WHERE id = NEW.customer_id AND is_lead = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Assuming there's an 'orders' table
-- CREATE TRIGGER trigger_convert_lead
-- AFTER INSERT ON orders
-- FOR EACH ROW
-- EXECUTE FUNCTION convert_lead_to_customer();

COMMENT ON FUNCTION update_team_member_stats IS 'Auto-update team member completion stats';
COMMENT ON FUNCTION convert_lead_to_customer IS 'Convert lead to customer on first order';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
