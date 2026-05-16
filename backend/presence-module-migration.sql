-- =====================================================
-- USER PRESENCE MODULE
-- Online/offline current status + transition reporting
-- =====================================================

SET search_path TO public;

CREATE TABLE IF NOT EXISTS user_presence_statuses (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  state VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (state IN ('online','offline')),
  last_changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_presence_events (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  state VARCHAR(20) NOT NULL CHECK (state IN ('online','offline')),
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_presence_statuses_user
  ON user_presence_statuses(user_id);

CREATE INDEX IF NOT EXISTS idx_user_presence_statuses_state
  ON user_presence_statuses(state);

CREATE INDEX IF NOT EXISTS idx_user_presence_events_user_time
  ON user_presence_events(user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_user_presence_events_state_time
  ON user_presence_events(state, occurred_at);

COMMENT ON TABLE user_presence_statuses IS 'Current online/offline state for every admin user.';
COMMENT ON TABLE user_presence_events IS 'Online/offline transitions used for counters and duration reporting.';
