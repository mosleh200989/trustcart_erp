-- 2026-09-03-user-sessions.sql
--
-- Login sessions ("devices"): one row per successful login, so an admin can see
-- where every account is signed in and sign any device out immediately.
--
-- Before this, auth was entirely stateless — a 24h JWT with no server-side
-- record — so the system could neither enumerate nor revoke a login. The JWT
-- now carries a `sid` claim matching user_sessions.session_key; the auth guard
-- rejects a token whose session is revoked or expired.
--
-- Idempotent throughout; safe to re-run.

-- ============================================================ user_sessions

CREATE TABLE IF NOT EXISTS user_sessions (
  id            SERIAL PRIMARY KEY,
  session_key   uuid        NOT NULL UNIQUE,          -- the `sid` claim in the JWT
  subject_type  varchar(20) NOT NULL DEFAULT 'user',  -- user | customer
  user_id       integer     REFERENCES users(id),
  customer_id   integer,
  role_id       integer,                              -- role at login; roles change later
  device_type   varchar(20) NOT NULL DEFAULT 'unknown', -- desktop | mobile | tablet | bot | unknown
  browser       varchar(60),
  os            varchar(60),
  device_label  varchar(160),                         -- "Chrome on Windows"
  user_agent    text,
  ip_address    varchar(100),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz,
  revoked_by    integer     REFERENCES users(id),
  revoke_reason varchar(40)                           -- logout | admin | admin-all | password-change
);

COMMENT ON TABLE user_sessions IS
  'One row per login. Active = revoked_at IS NULL AND expires_at > now(). The session_key is the JWT sid claim.';

CREATE INDEX IF NOT EXISTS idx_user_sessions_user      ON user_sessions (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_customer  ON user_sessions (customer_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active    ON user_sessions (revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON user_sessions (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device    ON user_sessions (device_type);

-- ============================================================ RBAC
--
-- Both permissions appear on the Role Permissions page under the
-- "user-sessions" module, so access is granted there like any other module.
-- super-admin and admin bypass permission checks in PermissionsGuard; the
-- grants below are recorded anyway so the page shows their access truthfully.

INSERT INTO permissions (name, slug, module, action, description) VALUES
  ('View User Sessions',   'view-user-sessions',   'user-sessions', 'read',
   'See which devices every account is signed in on, with role, device and per-user statistics'),
  ('Revoke User Sessions', 'revoke-user-sessions', 'user-sessions', 'delete',
   'Sign a device out immediately, or sign an account out of every device')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug IN ('super-admin', 'admin')
  AND p.slug IN ('view-user-sessions', 'revoke-user-sessions')
ON CONFLICT DO NOTHING;
