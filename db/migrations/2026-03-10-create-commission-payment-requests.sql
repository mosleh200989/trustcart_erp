-- Migration: Create commission_payment_requests table
-- Date: 2026-03-10

CREATE TABLE IF NOT EXISTS commission_payment_requests (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES users(id),
  requested_amount DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  admin_notes TEXT,
  requested_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  paid_by INTEGER REFERENCES users(id),
  paid_at TIMESTAMP,
  rejected_by INTEGER REFERENCES users(id),
  rejected_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_payment_requests_agent_id ON commission_payment_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_payment_requests_status ON commission_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_commission_payment_requests_created_at ON commission_payment_requests(created_at);
