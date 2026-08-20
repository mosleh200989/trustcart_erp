-- =====================================================
-- TELEPHONY ADVANCED REPORTING SUITE (CALL CENTER)
-- CDR fields + queue/trunk metrics + agent login/break reporting
-- =====================================================

-- Ensure we operate on the default schema.
SET search_path TO public;

-- Ensure base telephony_calls table exists (some installs may not have run telephony-integration-migration.sql yet)
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

-- 1) Extend telephony_calls with reporting fields
ALTER TABLE telephony_calls
  ADD COLUMN IF NOT EXISTS queue_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS trunk_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS wait_seconds INT NULL,
  ADD COLUMN IF NOT EXISTS hold_seconds INT NULL,
  ADD COLUMN IF NOT EXISTS disposition VARCHAR(50) NULL;

-- Backfill wait_seconds where possible (answered_at - started_at)
UPDATE telephony_calls
SET wait_seconds = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (answered_at - started_at))))
WHERE wait_seconds IS NULL
  AND answered_at IS NOT NULL
  AND started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telephony_calls_queue_name ON telephony_calls(queue_name);
CREATE INDEX IF NOT EXISTS idx_telephony_calls_trunk_name ON telephony_calls(trunk_name);
CREATE INDEX IF NOT EXISTS idx_telephony_calls_agent_user_id ON telephony_calls(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_telephony_calls_started_at ON telephony_calls(started_at);
CREATE INDEX IF NOT EXISTS idx_telephony_calls_disposition ON telephony_calls(disposition);

COMMENT ON COLUMN telephony_calls.queue_name IS 'PBX queue identifier/name (if provided by webhook)';
COMMENT ON COLUMN telephony_calls.trunk_name IS 'PBX trunk identifier/name (if provided by webhook)';
COMMENT ON COLUMN telephony_calls.wait_seconds IS 'Queue wait/ring time until answered (seconds)';
COMMENT ON COLUMN telephony_calls.hold_seconds IS 'Hold time during call (seconds, if provided)';
COMMENT ON COLUMN telephony_calls.disposition IS 'Call disposition: answered/completed/missed/abandoned/busy/no_answer/failed';

-- 2) Agent presence events (login/logout/break) for reporting
CREATE TABLE IF NOT EXISTS telephony_agent_presence_events (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('online','on_call','break','offline')),
  source VARCHAR(50) NOT NULL DEFAULT 'api',
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telephony_presence_events_user_time
  ON telephony_agent_presence_events(user_id, occurred_at);

COMMENT ON TABLE telephony_agent_presence_events IS 'Agent presence transitions for call-center reporting (login/logout/break/on_call)';
