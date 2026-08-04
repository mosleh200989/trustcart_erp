-- Change the standard office-time caution period from 5 to 10 minutes.
-- Custom values remain unchanged.

ALTER TABLE user_office_times
  ALTER COLUMN caution_minutes SET DEFAULT 10;

UPDATE user_office_times
SET caution_minutes = 10,
    updated_at = NOW()
WHERE caution_minutes = 5;
