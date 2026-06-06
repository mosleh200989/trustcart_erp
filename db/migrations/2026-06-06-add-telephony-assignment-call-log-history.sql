CREATE TABLE IF NOT EXISTS telephony_assignment_call_logs (
  id SERIAL PRIMARY KEY,
  record_type VARCHAR(40) NOT NULL,
  assignment_type VARCHAR(40) NULL,
  order_id INTEGER NOT NULL,
  caller_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
  caller_name VARCHAR(150) NULL,
  outcome VARCHAR(50) NULL,
  suggestion TEXT NULL,
  notes TEXT NOT NULL,
  called_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telephony_assignment_call_logs_record
  ON telephony_assignment_call_logs (record_type, order_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_telephony_assignment_call_logs_caller
  ON telephony_assignment_call_logs (caller_user_id, called_at DESC);
