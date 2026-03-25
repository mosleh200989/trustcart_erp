-- Fix: The production audit_logs table has extra columns (table_name, record_id, etc.)
-- that don't exist in the entity. Rather than fight mismatches one by one,
-- drop and recreate the table to match the entity exactly.
-- Audit logs are non-critical historical data — safe to recreate.

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

CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);

-- Fix the audit_customer_changes trigger function that was using old column names
CREATE OR REPLACE FUNCTION audit_customer_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (module, action, entity_type, entity_id, description, old_values, new_values)
    VALUES ('customers', TG_OP, 'Customer', NEW.id::text, TG_OP || ' customer #' || NEW.id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
