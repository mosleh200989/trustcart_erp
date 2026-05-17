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

CREATE TABLE IF NOT EXISTS presence_settings (
  id serial PRIMARY KEY,
  office_start_time varchar(5) NOT NULL DEFAULT '09:00',
  office_end_time varchar(5) NOT NULL DEFAULT '18:00',
  timezone varchar(80) NOT NULL DEFAULT 'Asia/Dhaka',
  attendance_key varchar(255) NULL,
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

INSERT INTO presence_settings (
  id,
  office_start_time,
  office_end_time,
  timezone,
  attendance_key,
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
  ('Manage Presence Settings', 'manage-presence-settings', 'presence', 'update', 'Manage presence and attendance sync settings'),
  ('Sync Presence Sheet', 'sync-presence-sheet', 'presence', 'update', 'Sync presence data to Google Sheets')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-presence', 'view-presence-history', 'manage-presence-history', 'manage-presence-settings', 'sync-presence-sheet')
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
