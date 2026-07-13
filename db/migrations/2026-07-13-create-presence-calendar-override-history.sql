-- Preserve every manual Check In/Out calendar verdict change.

CREATE TABLE IF NOT EXISTS presence_calendar_override_history (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  date_key varchar(10) NOT NULL,
  action varchar(20) NOT NULL,
  previous_attendance_key varchar(10) NULL,
  previous_attendance_label varchar(100) NULL,
  previous_note text NULL,
  new_attendance_key varchar(10) NULL,
  new_attendance_label varchar(100) NULL,
  new_note text NULL,
  updated_by integer NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_presence_calendar_override_history_user_date
  ON presence_calendar_override_history(user_id, date_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_presence_calendar_override_history_updated_by
  ON presence_calendar_override_history(updated_by, created_at DESC);
