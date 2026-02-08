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
