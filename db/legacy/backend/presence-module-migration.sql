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

CREATE TABLE IF NOT EXISTS presence_settings (
  id SERIAL PRIMARY KEY,
  office_start_time VARCHAR(5) NOT NULL DEFAULT '09:00',
  office_end_time VARCHAR(5) NOT NULL DEFAULT '18:00',
  timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Dhaka',
  attendance_key VARCHAR(255) NULL,
  google_spreadsheet_id VARCHAR(255) NULL,
  summary_sheet_name VARCHAR(100) NOT NULL DEFAULT 'May-26',
  events_sheet_name VARCHAR(100) NOT NULL DEFAULT '',
  settings_sheet_name VARCHAR(100) NOT NULL DEFAULT 'Attendance key',
  last_synced_at TIMESTAMP NULL,
  last_sync_status VARCHAR(30) NULL,
  last_sync_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
COMMENT ON TABLE presence_settings IS 'Presence module settings and Google Sheets sync configuration.';

INSERT INTO presence_settings (
  id,
  office_start_time,
  office_end_time,
  timezone,
  attendance_key,
  google_spreadsheet_id,
  summary_sheet_name,
  events_sheet_name,
  settings_sheet_name
) VALUES (
  1,
  '09:00',
  '18:00',
  'Asia/Dhaka',
  '1HS4-6TSSmYRj-D6_ntJ9OyQITNfVyJRMZUN-d-ZN6C8',
  '1HS4-6TSSmYRj-D6_ntJ9OyQITNfVyJRMZUN-d-ZN6C8',
  'May-26',
  '',
  'Attendance key'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO permissions (name, slug, module, action, description) VALUES
  ('View Presence', 'view-presence', 'presence', 'read', 'View all employees presence dashboard and history'),
  ('Manage Presence Settings', 'manage-presence-settings', 'presence', 'update', 'Manage office time and Google Sheet attendance settings'),
  ('Sync Presence Sheet', 'sync-presence-sheet', 'presence', 'sync', 'Sync presence data to the configured Google Sheet')
ON CONFLICT (slug) DO NOTHING;
