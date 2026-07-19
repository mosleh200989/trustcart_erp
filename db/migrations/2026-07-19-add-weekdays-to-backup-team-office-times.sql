-- Add weekday targeting for backup team roster rules.

ALTER TABLE backup_team_office_times
  ADD COLUMN IF NOT EXISTS weekdays TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_backup_team_office_times_weekdays
  ON backup_team_office_times USING GIN (weekdays);
