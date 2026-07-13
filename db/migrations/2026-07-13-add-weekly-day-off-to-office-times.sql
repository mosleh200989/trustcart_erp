-- Store employee-specific weekly day off for the Check In/Out office-time setup.

ALTER TABLE user_office_times
  ADD COLUMN IF NOT EXISTS weekly_day_off varchar(20) NULL;
