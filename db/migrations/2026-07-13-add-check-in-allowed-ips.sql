-- Optional IP allowlist for manual Check In.
-- Blank/null means check-in is allowed from any IP. Check-out remains allowed from anywhere.

ALTER TABLE presence_settings
  ADD COLUMN IF NOT EXISTS allowed_check_in_ips text NULL;
