-- Presence status classification and backup team roster rules.

CREATE TABLE IF NOT EXISTS presence_user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT presence_user_profiles_status_check CHECK (status IN ('active', 'inactive', 'backup'))
);

CREATE INDEX IF NOT EXISTS idx_presence_user_profiles_user ON presence_user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_user_profiles_status ON presence_user_profiles(status);

INSERT INTO presence_user_profiles (user_id, status, created_at, updated_at)
SELECT u.id, 'active', NOW(), NOW()
FROM users u
WHERE COALESCE(u.is_deleted, false) = false
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS backup_team_office_times (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekdays TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  office_start_time VARCHAR(5) NOT NULL,
  office_end_time VARCHAR(5) NOT NULL,
  caution_minutes INTEGER NOT NULL DEFAULT 0,
  lunch_break_start_time VARCHAR(5) NULL,
  lunch_break_end_time VARCHAR(5) NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT backup_team_office_times_caution_check CHECK (caution_minutes >= 0 AND caution_minutes <= 240),
  CONSTRAINT backup_team_office_times_start_check CHECK (office_start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT backup_team_office_times_end_check CHECK (office_end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT backup_team_office_times_lunch_start_check CHECK (lunch_break_start_time IS NULL OR lunch_break_start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT backup_team_office_times_lunch_end_check CHECK (lunch_break_end_time IS NULL OR lunch_break_end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

CREATE INDEX IF NOT EXISTS idx_backup_team_office_times_user ON backup_team_office_times(user_id);

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Presence Status', 'view-presence-status', 'presence', 'read', 'View employee Presence status classification'),
  ('Manage Presence Status', 'manage-presence-status', 'presence', 'update', 'Update employee Presence status classification'),
  ('View Backup Team', 'view-presence-backup-team', 'presence', 'read', 'View backup team roster office time rules'),
  ('Manage Backup Team', 'manage-presence-backup-team', 'presence', 'update', 'Update backup team roster office time rules')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions existing ON existing.id = rp.permission_id
JOIN permissions p ON p.slug IN (
  'view-presence-status',
  'manage-presence-status',
  'view-presence-backup-team',
  'manage-presence-backup-team'
)
WHERE existing.slug IN ('view-presence', 'manage-presence-settings', 'manage-presence-office-time')
ON CONFLICT DO NOTHING;

UPDATE admin_menu_items
SET title = 'Presence'
WHERE path IS NULL
  AND title = 'Check In/Out';

WITH parent_menu AS (
  SELECT id
  FROM admin_menu_items
  WHERE path IS NULL
    AND title = 'Presence'
  ORDER BY id
  LIMIT 1
)
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
SELECT *
FROM (
  SELECT
    'Status'::varchar AS title,
    'FaUserCheck'::varchar AS icon,
    '/admin/presence/status'::varchar AS path,
    parent_menu.id AS parent_id,
    45 AS sort_order,
    true AS is_active,
    ARRAY['view-presence-status', 'manage-presence-status', 'manage-presence-settings']::text[] AS required_permissions,
    NOW() AS created_at,
    NOW() AS updated_at
  FROM parent_menu
  UNION ALL
  SELECT
    'Backup Team'::varchar,
    'FaUsers'::varchar,
    '/admin/presence/backup-team'::varchar,
    parent_menu.id,
    46,
    true,
    ARRAY['view-presence-backup-team', 'manage-presence-backup-team', 'manage-presence-settings']::text[],
    NOW(),
    NOW()
  FROM parent_menu
) rows
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_menu_items existing
  WHERE existing.path = rows.path
);

UPDATE admin_menu_items
SET
  title = 'Status',
  icon = 'FaUserCheck',
  sort_order = 45,
  required_permissions = ARRAY['view-presence-status', 'manage-presence-status', 'manage-presence-settings']::text[],
  updated_at = NOW()
WHERE path = '/admin/presence/status';

UPDATE admin_menu_items
SET
  title = 'Backup Team',
  icon = 'FaUsers',
  sort_order = 46,
  required_permissions = ARRAY['view-presence-backup-team', 'manage-presence-backup-team', 'manage-presence-settings']::text[],
  updated_at = NOW()
WHERE path = '/admin/presence/backup-team';
