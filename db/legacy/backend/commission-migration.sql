-- Commission System Migration
-- Creates tables for agent commissions and commission settings

-- Drop tables if they exist (for clean re-run)
DROP TABLE IF EXISTS agent_commissions CASCADE;
DROP TABLE IF EXISTS commission_settings CASCADE;

-- Commission Settings Table
-- Stores global and agent-specific commission configurations
CREATE TABLE commission_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(20) DEFAULT 'global' NOT NULL,
    agent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    commission_type VARCHAR(20) DEFAULT 'fixed' NOT NULL,
    fixed_amount DECIMAL(12, 2) DEFAULT 0,
    percentage_rate DECIMAL(5, 2) DEFAULT 0,
    min_order_value DECIMAL(12, 2) DEFAULT 0,
    max_commission DECIMAL(12, 2),
    is_active BOOLEAN DEFAULT true,
    effective_from TIMESTAMP,
    effective_until TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a partial unique index for global settings (only one active global setting allowed)
CREATE UNIQUE INDEX unique_active_global_setting_idx ON commission_settings (setting_type) 
WHERE setting_type = 'global' AND is_active = true;

-- Create a partial unique index for agent-specific settings (one per agent)
CREATE UNIQUE INDEX unique_agent_setting_idx ON commission_settings (agent_id) 
WHERE agent_id IS NOT NULL AND is_active = true;

-- Agent Commissions Table
-- Tracks individual commission records for sales made by agents
CREATE TABLE agent_commissions (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL,
    sales_order_id INTEGER NOT NULL,
    order_amount DECIMAL(12, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) DEFAULT 0,
    commission_amount DECIMAL(12, 2) NOT NULL,
    commission_type VARCHAR(20) DEFAULT 'fixed',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate commission for same order
    CONSTRAINT unique_agent_order_commission UNIQUE (agent_id, sales_order_id)
);

-- Indexes for performance
CREATE INDEX idx_commission_settings_agent ON commission_settings(agent_id);
CREATE INDEX idx_commission_settings_type ON commission_settings(setting_type);
CREATE INDEX idx_commission_settings_active ON commission_settings(is_active);

CREATE INDEX idx_agent_commissions_agent ON agent_commissions(agent_id);
CREATE INDEX idx_agent_commissions_status ON agent_commissions(status);
CREATE INDEX idx_agent_commissions_created ON agent_commissions(created_at);
CREATE INDEX idx_agent_commissions_order ON agent_commissions(sales_order_id);

-- Insert default global commission settings (only if not exists)
INSERT INTO commission_settings (
    setting_type,
    commission_type,
    fixed_amount,
    percentage_rate,
    min_order_value,
    is_active,
    notes
)
SELECT
    'global',
    'fixed',
    50.00,
    0,
    0,
    true,
    'Default global commission: 50 BDT per sale'
WHERE NOT EXISTS (
    SELECT 1 FROM commission_settings WHERE setting_type = 'global' AND is_active = true
);

-- Add RBAC permissions for commission management (using DO block to handle conflicts)
DO $$
BEGIN
    INSERT INTO permissions (name, slug, module, action, description) VALUES
        ('Manage Commission Settings', 'manage-commission-settings', 'crm', 'update', 'Create, update, delete commission settings')
    ON CONFLICT (slug) DO NOTHING;
    
    INSERT INTO permissions (name, slug, module, action, description) VALUES
        ('View Commission Reports', 'view-commission-reports', 'crm', 'read', 'View commission reports and agent earnings')
    ON CONFLICT (slug) DO NOTHING;
    
    INSERT INTO permissions (name, slug, module, action, description) VALUES
        ('Approve Commissions', 'approve-commissions', 'crm', 'update', 'Approve or reject pending commissions')
    ON CONFLICT (slug) DO NOTHING;
END $$;

-- Grant commission permissions to Admin and Super-Admin roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug IN ('admin', 'super-admin')
AND p.slug IN ('manage-commission-settings', 'view-commission-reports', 'approve-commissions')
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Grant view permission to Team Leaders
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'team-leader'
AND p.slug = 'view-commission-reports'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

COMMENT ON TABLE commission_settings IS 'Stores commission rate configurations for agents';
COMMENT ON TABLE agent_commissions IS 'Tracks commission earnings for each sale made by agents';
