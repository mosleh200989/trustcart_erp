CREATE TABLE IF NOT EXISTS user_presence_statuses (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE,
  state varchar(20) NOT NULL DEFAULT 'offline',
  last_changed_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at timestamp NULL,
  source varchar(50) NOT NULL DEFAULT 'manual',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_presence_statuses_user ON user_presence_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_statuses_state ON user_presence_statuses(state);

CREATE TABLE IF NOT EXISTS user_presence_events (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  state varchar(20) NOT NULL,
  source varchar(50) NOT NULL DEFAULT 'manual',
  occurred_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_presence_events_user_time ON user_presence_events(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_events_state_time ON user_presence_events(state, occurred_at);

CREATE TABLE IF NOT EXISTS user_office_times (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE,
  office_start_time varchar(5) NULL,
  office_end_time varchar(5) NULL,
  telegram_chat_id varchar(80) NULL,
  notes text NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_office_times_user ON user_office_times(user_id);

CREATE TABLE IF NOT EXISTS presence_calendar_overrides (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  date_key varchar(10) NOT NULL,
  attendance_key varchar(10) NOT NULL,
  attendance_label varchar(100) NULL,
  note text NULL,
  updated_by integer NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_presence_calendar_overrides_user_date UNIQUE (user_id, date_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_calendar_overrides_user_date
  ON presence_calendar_overrides(user_id, date_key);

CREATE TABLE IF NOT EXISTS presence_settings (
  id serial PRIMARY KEY,
  office_start_time varchar(5) NOT NULL DEFAULT '09:00',
  office_end_time varchar(5) NOT NULL DEFAULT '18:00',
  timezone varchar(80) NOT NULL DEFAULT 'Asia/Dhaka',
  attendance_key varchar(255) NULL,
  attendance_present_key varchar(10) NOT NULL DEFAULT 'P',
  attendance_present_label varchar(100) NOT NULL DEFAULT 'Present',
  attendance_late_key varchar(10) NOT NULL DEFAULT 'L',
  attendance_late_label varchar(100) NOT NULL DEFAULT 'Late',
  attendance_weekly_off_key varchar(10) NOT NULL DEFAULT 'W',
  attendance_weekly_off_label varchar(100) NOT NULL DEFAULT 'Weekly off day',
  attendance_excused_absence_key varchar(10) NOT NULL DEFAULT 'U',
  attendance_excused_absence_label varchar(100) NOT NULL DEFAULT 'Excused absence',
  attendance_unexcused_absence_key varchar(10) NOT NULL DEFAULT 'A',
  attendance_unexcused_absence_label varchar(100) NOT NULL DEFAULT 'Unexcused absence',
  attendance_present_color varchar(20) NOT NULL DEFAULT '#16a34a',
  attendance_late_color varchar(20) NOT NULL DEFAULT '#f59e0b',
  attendance_weekly_off_color varchar(20) NOT NULL DEFAULT '#64748b',
  attendance_excused_absence_color varchar(20) NOT NULL DEFAULT '#2563eb',
  attendance_unexcused_absence_color varchar(20) NOT NULL DEFAULT '#dc2626',
  calendar_team_gap_every integer NOT NULL DEFAULT 0,
  calendar_team_gap_size integer NOT NULL DEFAULT 12,
  calendar_user_order jsonb NULL,
  telegram_reminders_enabled boolean NOT NULL DEFAULT false,
  telegram_reminder_lead_minutes integer NOT NULL DEFAULT 5,
  telegram_offline_reminder_message text NOT NULL DEFAULT 'Hi {name}, your office time starts at {startTime}. Please come online if you are starting work.',
  telegram_online_thank_you_message text NOT NULL DEFAULT 'Thank you {name}. You are online on time for your {startTime} office start.',
  google_spreadsheet_id varchar(255) NULL,
  summary_sheet_name varchar(100) NOT NULL DEFAULT 'May-26',
  events_sheet_name varchar(100) NOT NULL DEFAULT '',
  settings_sheet_name varchar(100) NOT NULL DEFAULT 'Attendance key',
  last_synced_at timestamp NULL,
  last_sync_status varchar(30) NULL,
  last_sync_message text NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE presence_settings
  ADD COLUMN IF NOT EXISTS attendance_present_key varchar(10) NOT NULL DEFAULT 'P',
  ADD COLUMN IF NOT EXISTS attendance_present_label varchar(100) NOT NULL DEFAULT 'Present',
  ADD COLUMN IF NOT EXISTS attendance_late_key varchar(10) NOT NULL DEFAULT 'L',
  ADD COLUMN IF NOT EXISTS attendance_late_label varchar(100) NOT NULL DEFAULT 'Late',
  ADD COLUMN IF NOT EXISTS attendance_weekly_off_key varchar(10) NOT NULL DEFAULT 'W',
  ADD COLUMN IF NOT EXISTS attendance_weekly_off_label varchar(100) NOT NULL DEFAULT 'Weekly off day',
  ADD COLUMN IF NOT EXISTS attendance_excused_absence_key varchar(10) NOT NULL DEFAULT 'U',
  ADD COLUMN IF NOT EXISTS attendance_excused_absence_label varchar(100) NOT NULL DEFAULT 'Excused absence',
  ADD COLUMN IF NOT EXISTS attendance_unexcused_absence_key varchar(10) NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS attendance_unexcused_absence_label varchar(100) NOT NULL DEFAULT 'Unexcused absence',
  ADD COLUMN IF NOT EXISTS attendance_present_color varchar(20) NOT NULL DEFAULT '#16a34a',
  ADD COLUMN IF NOT EXISTS attendance_late_color varchar(20) NOT NULL DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS attendance_weekly_off_color varchar(20) NOT NULL DEFAULT '#64748b',
  ADD COLUMN IF NOT EXISTS attendance_excused_absence_color varchar(20) NOT NULL DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS attendance_unexcused_absence_color varchar(20) NOT NULL DEFAULT '#dc2626',
  ADD COLUMN IF NOT EXISTS calendar_team_gap_every integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_team_gap_size integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS calendar_user_order jsonb NULL,
  ADD COLUMN IF NOT EXISTS telegram_reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS telegram_reminder_lead_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS telegram_offline_reminder_message text NOT NULL DEFAULT 'Hi {name}, your office time starts at {startTime}. Please come online if you are starting work.',
  ADD COLUMN IF NOT EXISTS telegram_online_thank_you_message text NOT NULL DEFAULT 'Thank you {name}. You are online on time for your {startTime} office start.';

ALTER TABLE user_office_times
  ADD COLUMN IF NOT EXISTS telegram_chat_id varchar(80) NULL;

CREATE TABLE IF NOT EXISTS presence_telegram_notifications (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  date_key varchar(10) NOT NULL,
  kind varchar(30) NOT NULL,
  telegram_chat_id varchar(80) NOT NULL,
  message text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pending',
  error_message text NULL,
  sent_at timestamp NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_presence_telegram_notifications_user_date_kind UNIQUE (user_id, date_key, kind)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_telegram_notifications_unique
  ON presence_telegram_notifications(user_id, date_key, kind);

CREATE INDEX IF NOT EXISTS idx_presence_telegram_notifications_date_kind
  ON presence_telegram_notifications(date_key, kind);

INSERT INTO presence_settings (
  id,
  office_start_time,
  office_end_time,
  timezone,
  attendance_key,
  attendance_present_key,
  attendance_present_label,
  attendance_late_key,
  attendance_late_label,
  attendance_weekly_off_key,
  attendance_weekly_off_label,
  attendance_excused_absence_key,
  attendance_excused_absence_label,
  attendance_unexcused_absence_key,
  attendance_unexcused_absence_label,
  google_spreadsheet_id,
  summary_sheet_name,
  events_sheet_name,
  settings_sheet_name,
  created_at,
  updated_at
)
VALUES (
  1,
  '09:00',
  '18:00',
  'Asia/Dhaka',
  '1HS4-6TSSmYRj-D6_ntJ9OyQITNfVyJRMZUN-d-ZN6C8',
  'P',
  'Present',
  'L',
  'Late',
  'W',
  'Weekly off day',
  'U',
  'Excused absence',
  'A',
  'Unexcused absence',
  '1HS4-6TSSmYRj-D6_ntJ9OyQITNfVyJRMZUN-d-ZN6C8',
  'May-26',
  '',
  'Attendance key',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  pg_get_serial_sequence('presence_settings', 'id'),
  GREATEST((SELECT MAX(id) FROM presence_settings), 1),
  true
);

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Presence', 'view-presence', 'presence', 'read', 'View user presence dashboard and history'),
  ('View Presence History', 'view-presence-history', 'presence-history', 'read', 'View office-wide presence history'),
  ('Manage Presence History', 'manage-presence-history', 'presence-history', 'update', 'Manage office-wide presence history'),
  ('View Presence Calendar', 'view-presence-calendar', 'presence-calendar', 'read', 'View presence calendar'),
  ('Manage Presence Calendar', 'manage-presence-calendar', 'presence-calendar', 'update', 'Manage presence calendar layout'),
  ('View Presence Office Time', 'view-presence-office-time', 'presence-office-time', 'read', 'View employee-specific office times'),
  ('Manage Presence Office Time', 'manage-presence-office-time', 'presence-office-time', 'update', 'Manage employee-specific office times'),
  ('Manage Presence Settings', 'manage-presence-settings', 'presence', 'update', 'Manage presence and attendance sync settings'),
  ('Sync Presence Sheet', 'sync-presence-sheet', 'presence', 'update', 'Sync presence data to Google Sheets')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-presence', 'view-presence-history', 'manage-presence-history', 'view-presence-calendar', 'manage-presence-calendar', 'view-presence-office-time', 'manage-presence-office-time', 'manage-presence-settings', 'sync-presence-sheet')
ON CONFLICT DO NOTHING;

INSERT INTO admin_menu_items (
  title,
  icon,
  path,
  parent_id,
  sort_order,
  is_active,
  required_permissions,
  created_at,
  updated_at
)
SELECT
  'Presence History',
  'FaHistory',
  '/admin/presence/history',
  NULL,
  COALESCE((SELECT sort_order FROM admin_menu_items WHERE path = '/admin/presence' ORDER BY id LIMIT 1), 0) + 1,
  TRUE,
  ARRAY['view-presence', 'view-presence-history', 'manage-presence-history']::text[],
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items existing
  WHERE existing.path = '/admin/presence/history'
);

UPDATE admin_menu_items
SET title = COALESCE(NULLIF(title, ''), 'Presence History'),
    required_permissions = ARRAY['view-presence', 'view-presence-history', 'manage-presence-history']::text[],
    icon = 'FaHistory',
    updated_at = NOW()
WHERE path = '/admin/presence/history';

UPDATE admin_menu_items
SET path = '/admin/presence',
    icon = 'FaUser',
    updated_at = NOW()
WHERE parent_id IS NULL
  AND title = 'Presence'
  AND path IS NULL;
