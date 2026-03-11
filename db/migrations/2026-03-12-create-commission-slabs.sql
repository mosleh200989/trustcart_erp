-- Migration: Create commission_slabs table for tier-based slab commission settings
-- Two role types: 'agent' (Sales Executive) and 'team_leader'
-- Each slab defines: order amount range + commission per tier

CREATE TABLE IF NOT EXISTS commission_slabs (
  id SERIAL PRIMARY KEY,
  role_type VARCHAR(20) NOT NULL DEFAULT 'agent',  -- 'agent' or 'team_leader'
  agent_tier VARCHAR(20) NOT NULL DEFAULT 'silver', -- 'silver', 'gold', 'platinum'
  min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_order_amount DECIMAL(12,2),                   -- NULL means no upper limit
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Fixed commission in ৳
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_type, agent_tier, min_order_amount)
);

CREATE INDEX IF NOT EXISTS idx_commission_slabs_role_tier ON commission_slabs(role_type, agent_tier);
CREATE INDEX IF NOT EXISTS idx_commission_slabs_active ON commission_slabs(is_active);
