-- Migration: Create fraud_checks table for storing fraud check history
-- Date: 2026-02-05

CREATE TABLE IF NOT EXISTS fraud_checks (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES sales_orders(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'hoorin',
    check_type VARCHAR(50) NOT NULL,
    response JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    risk_level VARCHAR(20),
    cancellation_rate DECIMAL(5, 2),
    total_parcels INTEGER,
    total_delivered INTEGER,
    total_canceled INTEGER,
    checked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fraud_checks_order_id ON fraud_checks(order_id);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_phone_number ON fraud_checks(phone_number);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_created_at ON fraud_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_risk_level ON fraud_checks(risk_level);

COMMENT ON TABLE fraud_checks IS 'Stores fraud check results from Hoorin API for orders';
COMMENT ON COLUMN fraud_checks.provider IS 'The fraud check provider (e.g., hoorin)';
COMMENT ON COLUMN fraud_checks.check_type IS 'Type of check: courier_summary or total_summary';
COMMENT ON COLUMN fraud_checks.response IS 'Full JSON response from the API';
COMMENT ON COLUMN fraud_checks.risk_level IS 'Calculated risk level: low, medium, or high';
COMMENT ON COLUMN fraud_checks.cancellation_rate IS 'Percentage of canceled orders';
