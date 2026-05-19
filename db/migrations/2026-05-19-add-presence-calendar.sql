ALTER TABLE presence_settings
  ADD COLUMN IF NOT EXISTS attendance_present_color varchar(20) NOT NULL DEFAULT '#16a34a',
  ADD COLUMN IF NOT EXISTS attendance_late_color varchar(20) NOT NULL DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS attendance_weekly_off_color varchar(20) NOT NULL DEFAULT '#64748b',
  ADD COLUMN IF NOT EXISTS attendance_excused_absence_color varchar(20) NOT NULL DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS attendance_unexcused_absence_color varchar(20) NOT NULL DEFAULT '#dc2626',
  ADD COLUMN IF NOT EXISTS calendar_team_gap_every integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_team_gap_size integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS calendar_user_order jsonb NULL;

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Presence Calendar', 'view-presence-calendar', 'presence-calendar', 'read', 'View presence calendar'),
  ('Manage Presence Calendar', 'manage-presence-calendar', 'presence-calendar', 'update', 'Manage presence calendar layout')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-presence-calendar', 'manage-presence-calendar')
ON CONFLICT DO NOTHING;
