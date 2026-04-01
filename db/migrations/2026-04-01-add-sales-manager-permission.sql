-- =============================================
-- Add Sales Manager Dashboard permission
-- =============================================
-- Run:
--   psql -U postgres -d trustcart -f db/migrations/2026-04-01-add-sales-manager-permission.sql
--
-- IDEMPOTENT — safe to run multiple times.
-- =============================================

BEGIN;

-- Insert the new permission
INSERT INTO permissions (name, slug, module, action, description)
VALUES ('View Sales Manager Dashboard', 'view-sales-manager-dashboard', 'crm', 'read', 'Access Sales Manager dashboard to oversee team leaders, assign leads, and monitor performance')
ON CONFLICT DO NOTHING;

-- Auto-assign to Admin role (role_id = 1) so admins can see it too
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug = 'view-sales-manager-dashboard'
ON CONFLICT DO NOTHING;

COMMIT;
