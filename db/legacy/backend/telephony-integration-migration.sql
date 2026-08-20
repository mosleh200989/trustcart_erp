-- =====================================================
-- TELEPHONY (IP CALL) INTEGRATION SUPPORT
-- Provider-agnostic call logging + webhook updates
-- =====================================================

CREATE TABLE IF NOT EXISTS telephony_calls (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'bracknet',
  external_call_id VARCHAR(255) NULL,
  task_id INT NULL,
  agent_user_id INT NULL,
  agent_phone VARCHAR(30) NULL,
  customer_phone VARCHAR(30) NOT NULL,
  direction VARCHAR(20) NOT NULL DEFAULT 'outbound',
  status VARCHAR(20) NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','ringing','answered','completed','failed')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  duration_seconds INT NULL,
  recording_url TEXT NULL,
  meta JSONB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telephony_calls_external_id
  ON telephony_calls(external_call_id);

CREATE INDEX IF NOT EXISTS idx_telephony_calls_task
  ON telephony_calls(task_id);

COMMENT ON TABLE telephony_calls IS 'IP call logs + webhook updates (provider-agnostic)';
