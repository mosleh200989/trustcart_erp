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

ALTER TABLE user_office_times
  ADD COLUMN IF NOT EXISTS telegram_chat_id varchar(80) NULL;

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

INSERT INTO permissions (name, slug, module, action, description)
VALUES
  ('View Presence Office Time', 'view-presence-office-time', 'presence-office-time', 'read', 'View employee-specific office times'),
  ('Manage Presence Office Time', 'manage-presence-office-time', 'presence-office-time', 'update', 'Manage employee-specific office times')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-presence-office-time', 'manage-presence-office-time')
ON CONFLICT DO NOTHING;
