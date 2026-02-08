-- Migration: Create CRM Dashboard Configs table for editable dashboard texts
-- Date: 2026-02-08

CREATE TABLE IF NOT EXISTS crm_dashboard_configs (
    id SERIAL PRIMARY KEY,
    team_leader_id INTEGER NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    value JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(team_leader_id, config_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_team_leader ON crm_dashboard_configs(team_leader_id);

COMMENT ON TABLE crm_dashboard_configs IS 'Stores customizable dashboard configuration and texts per team leader';
COMMENT ON COLUMN crm_dashboard_configs.config_key IS 'Configuration key like scripts, trainingRolePlays, etc.';
COMMENT ON COLUMN crm_dashboard_configs.value IS 'JSON value containing the configuration data';


-- Migration: Create Lead Management Tables (customer_tiers and team_members)
-- Date: 2026-02-08

-- Customer Tiers table for tier management
CREATE TABLE IF NOT EXISTS customer_tiers (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    tier VARCHAR(50) DEFAULT 'silver',  -- silver, gold, platinum, vip
    tier_assigned_at TIMESTAMP DEFAULT NOW(),
    tier_assigned_by_id INTEGER,
    auto_assigned BOOLEAN DEFAULT false,
    last_activity_date TIMESTAMP,
    days_inactive INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    total_spent DECIMAL(12, 2) DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Team Members table for team lead management
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    team_leader_id INTEGER NOT NULL,
    team_type VARCHAR(10) DEFAULT 'A',  -- A, B, C, D, E
    is_active BOOLEAN DEFAULT true,
    assigned_leads_count INTEGER DEFAULT 0,
    completed_leads_count INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_tiers_customer_id ON customer_tiers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tiers_tier ON customer_tiers(tier);
CREATE INDEX IF NOT EXISTS idx_customer_tiers_is_active ON customer_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_team_leader ON team_members(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- Comments
COMMENT ON TABLE customer_tiers IS 'Stores customer tier information for CRM tier management';
COMMENT ON TABLE team_members IS 'Stores team member assignments under team leaders';




-- Migration: Add manage-team-members permission for Team Leaders
-- This permission allows Team Leaders to edit dashboard configurations

-- 1. Add the manage-team-members permission
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Manage Team Members', 'manage-team-members', 'crm', 'update', 'Manage team member configurations and dashboard settings')
ON CONFLICT (slug) DO NOTHING;

-- 2. Assign this permission to sales-team-leader role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'sales-team-leader'),
  (SELECT id FROM permissions WHERE slug = 'manage-team-members')
WHERE EXISTS (SELECT 1 FROM roles WHERE slug = 'sales-team-leader')
  AND EXISTS (SELECT 1 FROM permissions WHERE slug = 'manage-team-members')
ON CONFLICT DO NOTHING;

-- 3. Also assign to team-leader role if it exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'team-leader'),
  (SELECT id FROM permissions WHERE slug = 'manage-team-members')
WHERE EXISTS (SELECT 1 FROM roles WHERE slug = 'team-leader')
  AND EXISTS (SELECT 1 FROM permissions WHERE slug = 'manage-team-members')
ON CONFLICT DO NOTHING;

-- 4. Also assign to crm-team-leader role if it exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'crm-team-leader'),
  (SELECT id FROM permissions WHERE slug = 'manage-team-members')
WHERE EXISTS (SELECT 1 FROM roles WHERE slug = 'crm-team-leader')
  AND EXISTS (SELECT 1 FROM permissions WHERE slug = 'manage-team-members')
ON CONFLICT DO NOTHING;
