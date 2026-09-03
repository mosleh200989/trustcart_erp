-- 2026-09-04-login-attempts.sql
--
-- Every login attempt, successful or not, and the rate limiting built on top.
--
-- Before this, POST /api/auth/login accepted unlimited attempts at any speed
-- and left no trace either way: the audit interceptor skips the login route
-- (SKIP_PATTERNS in audit.interceptor.ts) and nothing else recorded it. A
-- password-spraying run against staff accounts was both unimpeded and invisible.
--
-- Attempts are keyed on the identifier as typed, not on a resolved user, so a
-- lockout never reveals whether an account exists.
--
-- Idempotent throughout; safe to re-run.

CREATE TABLE IF NOT EXISTS login_attempts (
  id           SERIAL PRIMARY KEY,
  identifier   varchar(190) NOT NULL,               -- email/phone as typed, lowercased
  user_id      integer REFERENCES users(id),        -- filled in when the attempt matched a staff account
  subject_type varchar(20),                         -- user | customer | null when unmatched
  result       varchar(30) NOT NULL,                -- success | invalid_password | unknown_account | inactive | locked | unlocked
  ip_address   varchar(100),
  device_type  varchar(20),
  device_label varchar(160),
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE login_attempts IS
  'One row per login attempt. Failures since the last success drive the lockout; successes are the audit trail of who signed in from where.';

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts (identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip         ON login_attempts (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created    ON login_attempts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_result     ON login_attempts (result);

-- Reading and clearing lockouts ride on the Device Sessions permissions, which
-- already appear on the Role Permissions page under the user-sessions module:
--   view-user-sessions   -> see attempts and lockouts
--   revoke-user-sessions -> clear a lockout early
