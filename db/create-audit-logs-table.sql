-- Migration: Create audit_logs table for system-wide action history
-- Run this script against the TrustCart ERP PostgreSQL database

-- Drop the old table if it exists with wrong schema
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE audit_logs (
    id              SERIAL PRIMARY KEY,
    module          VARCHAR(100) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       VARCHAR(255),
    description     TEXT NOT NULL,
    changed_fields  JSONB,
    old_values      JSONB,
    new_values      JSONB,
    performed_by    INTEGER,
    performed_by_name VARCHAR(255),
    endpoint        VARCHAR(500),
    http_method     VARCHAR(10),
    ip_address      VARCHAR(100),
    user_agent      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for fast filtering and search
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
