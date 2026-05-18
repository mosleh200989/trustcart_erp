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
  ADD COLUMN IF NOT EXISTS attendance_unexcused_absence_label varchar(100) NOT NULL DEFAULT 'Unexcused absence';

UPDATE presence_settings
SET attendance_present_key = COALESCE(NULLIF(attendance_present_key, ''), 'P'),
    attendance_present_label = COALESCE(NULLIF(attendance_present_label, ''), 'Present'),
    attendance_late_key = COALESCE(NULLIF(attendance_late_key, ''), 'L'),
    attendance_late_label = COALESCE(NULLIF(attendance_late_label, ''), 'Late'),
    attendance_weekly_off_key = COALESCE(NULLIF(attendance_weekly_off_key, ''), 'W'),
    attendance_weekly_off_label = COALESCE(NULLIF(attendance_weekly_off_label, ''), 'Weekly off day'),
    attendance_excused_absence_key = COALESCE(NULLIF(attendance_excused_absence_key, ''), 'U'),
    attendance_excused_absence_label = COALESCE(NULLIF(attendance_excused_absence_label, ''), 'Excused absence'),
    attendance_unexcused_absence_key = COALESCE(NULLIF(attendance_unexcused_absence_key, ''), 'A'),
    attendance_unexcused_absence_label = COALESCE(NULLIF(attendance_unexcused_absence_label, ''), 'Unexcused absence')
WHERE id = 1;
