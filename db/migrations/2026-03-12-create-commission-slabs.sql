-- Migration: Create commission_slabs table for tier-based slab commission settings
-- Two role types: 'agent' (Sales Executive) and 'team_leader'
-- Each slab defines: order count range + commission per tier

CREATE TABLE IF NOT EXISTS commission_slabs (
  id SERIAL PRIMARY KEY,
  role_type VARCHAR(20) NOT NULL DEFAULT 'agent',  -- 'agent' or 'team_leader'
  agent_tier VARCHAR(20) NOT NULL DEFAULT 'silver', -- 'silver', 'gold', 'platinum'
  slab_type VARCHAR(20) NOT NULL DEFAULT 'order',   -- 'order', 'upsell', 'cross_sell'
  min_order_count INTEGER NOT NULL DEFAULT 0,
  max_order_count INTEGER,                          -- NULL means no upper limit
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Fixed commission in ৳
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_slabs_unique_active ON commission_slabs(role_type, agent_tier, slab_type, min_order_count) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_commission_slabs_role_tier ON commission_slabs(role_type, agent_tier);
CREATE INDEX IF NOT EXISTS idx_commission_slabs_active ON commission_slabs(is_active);
