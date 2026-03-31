-- =============================================
-- Natural Glowra: Setup Admin Account
-- =============================================
-- Run on VPS against the natural_glowra database:
--   psql -U postgres -d natural_glowra -f db/migrations/2026-03-31-setup-glowra-admin.sql
-- =============================================

BEGIN;

-- 1. Ensure the Super Admin role exists
INSERT INTO roles (id, name, slug, description, is_system_role, permissions, priority, is_active)
VALUES (
  12,
  'Super Admin',
  'super-admin',
  'Full system access for Natural Glowra',
  true,
  '{"all": true}'::jsonb,
  100,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure the Admin role exists
INSERT INTO roles (id, name, slug, description, is_system_role, permissions, priority, is_active)
VALUES (
  1,
  'Admin',
  'admin',
  'Administrative access',
  true,
  '{"all": true}'::jsonb,
  90,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create admin user
--    Email:    admin@naturalglowra.com
--    Password: admin123
INSERT INTO users (name, last_name, email, password_hash, role_id, status, is_deleted, is_active)
VALUES (
  'Admin',
  'Glowra',
  'admin@naturalglowra.com',
  '$2b$10$I2jvV5Pd30K6mK0VtXzatOnSLDZM.3k7i1pA4WzgNkMqQL9ObhWdK',
  12,
  'active',
  false,
  true
)
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- Verify
SELECT u.id, u.name, u.last_name, u.email, u.status, r.name AS role_name, r.slug AS role_slug
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.email = 'admin@naturalglowra.com';
