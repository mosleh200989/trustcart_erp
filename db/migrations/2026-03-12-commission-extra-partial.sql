-- Migration: Add commission_extra_partial table
-- Stores per-agent per-month extra amounts for partial deliveries
-- Used in Commission Agents page and Payment Breakdown page

CREATE TABLE IF NOT EXISTS commission_extra_partial (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  month VARCHAR(7) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agent_id, month)
);
